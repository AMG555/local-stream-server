package webrtc

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/local-stream-server/go-media-server/pkg/stream"
	"github.com/pion/rtp"
	"github.com/pion/rtp/codecs"
	"github.com/pion/webrtc/v3"
)

const (
	h264PayloadType = 102   // dynamic PT for H.264
	opusPayloadType = 111   // dynamic PT for Opus (same as Chrome default)
	h264ClockRate   = 90000
	opusClockRateHz = 48000 // Opus always uses 48 kHz
	rtpMTU          = 1200
)

// Server handles WebRTC signaling and media forwarding.
type Server struct {
	streamManager *stream.Manager
	peers         sync.Map // peerID -> *peerSession
	nextPeerID    atomic.Uint64
	ffmpegPath    string
	// nat1to1IPs is an optional list of public/NAT IPs injected into ICE candidates.
	// Set via WEBRTC_NAT1TO1_IPS env var (comma-separated) so pion advertises
	// the correct external address to remote browsers (e.g. on Tailscale/LAN).
	nat1to1IPs []string
}

// peerSession holds a single viewer's WebRTC state.
type peerSession struct {
	pc         *webrtc.PeerConnection
	streamKey  string
	transcoder *aacTranscoder // AAC→Opus FFmpeg pipe — nil until ICE connected
	unsubAudio func()
	unsubVideo func()
	// audioQueue buffers raw AAC frames that arrive before ICE is connected.
	audioQueueMu sync.Mutex
	audioQueue   []aacQueueEntry
	// audioSpecCfg holds the AudioSpecificConfig bytes from the sequence header.
	audioSpecCfg []byte
}

// aacQueueEntry is one buffered raw AAC frame (no ADTS header, bare ES).
type aacQueueEntry struct {
	data []byte
}

func NewServer(mgr *stream.Manager) *Server {
	s := &Server{
		streamManager: mgr,
		ffmpegPath:    detectFFmpegPath(),
	}
	// Parse optional NAT1To1 IP list from environment.
	// Example: WEBRTC_NAT1TO1_IPS=100.113.89.11,192.168.1.5
	if envIPs := os.Getenv("WEBRTC_NAT1TO1_IPS"); envIPs != "" {
		for _, ip := range splitCSV(envIPs) {
			if net.ParseIP(ip) != nil {
				s.nat1to1IPs = append(s.nat1to1IPs, ip)
			} else {
				log.Printf("WebRTC: ignoring invalid WEBRTC_NAT1TO1_IPS entry %q", ip)
			}
		}
	}
	if len(s.nat1to1IPs) > 0 {
		log.Printf("WebRTC: NAT1To1 IPs configured: %v", s.nat1to1IPs)
	} else {
		// Auto-detect local IPs so ICE works on LAN even without explicit config.
		s.nat1to1IPs = detectLocalIPs()
		if len(s.nat1to1IPs) > 0 {
			log.Printf("WebRTC: auto-detected local IPs for ICE: %v", s.nat1to1IPs)
		}
	}
	return s
}

// buildAPI creates a pion API with a SettingEngine configured to expose all
// local network interfaces as ICE host candidates, plus optional NAT1To1 IPs.
// This fixes ICE failures when the browser is on Tailscale/LAN.
func (s *Server) buildAPI(me *webrtc.MediaEngine) *webrtc.API {
	se := webrtc.SettingEngine{}

	// Enable mDNS — off by default, explicit control
	// Allow all network types (UDP4, UDP6, TCP4, TCP6)
	se.SetNetworkTypes([]webrtc.NetworkType{
		webrtc.NetworkTypeUDP4,
		webrtc.NetworkTypeUDP6,
		webrtc.NetworkTypeTCP4,
		webrtc.NetworkTypeTCP6,
	})

	// Inject NAT1To1 IPs so the SDP answer contains them as host candidates.
	// This allows browsers on non-loopback addresses to reach the server.
	if len(s.nat1to1IPs) > 0 {
		se.SetNAT1To1IPs(s.nat1to1IPs, webrtc.ICECandidateTypeHost)
	}

	return webrtc.NewAPI(
		webrtc.WithMediaEngine(me),
		webrtc.WithSettingEngine(se),
	)
}

// HandleOffer handles a WebRTC offer from a viewer and returns an SDP answer.
func (s *Server) HandleOffer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	streamKey := r.URL.Query().Get("key")
	if streamKey == "" {
		http.Error(w, "Stream key required", http.StatusBadRequest)
		return
	}

	var offer webrtc.SessionDescription
	if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
		http.Error(w, "Invalid offer", http.StatusBadRequest)
		return
	}

	log.Printf("WebRTC offer for stream %s", streamKey)

	// Build a MediaEngine that advertises H.264 (PT 102) and Opus (PT 111).
	me := &webrtc.MediaEngine{}
	if err := me.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:    webrtc.MimeTypeH264,
			ClockRate:   h264ClockRate,
			SDPFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f",
		},
		PayloadType: h264PayloadType,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		log.Printf("RegisterCodec H264 error: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if err := me.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:  webrtc.MimeTypeOpus,
			ClockRate: opusClockRateHz,
			Channels:  2,
		},
		PayloadType: opusPayloadType,
	}, webrtc.RTPCodecTypeAudio); err != nil {
		log.Printf("RegisterCodec Opus error: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	api := s.buildAPI(me)
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}
	pc, err := api.NewPeerConnection(config)
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264, ClockRate: h264ClockRate},
		"video", "stream",
	)
	if err != nil {
		pc.Close()
		log.Printf("Failed to create video track: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if _, err = pc.AddTrack(videoTrack); err != nil {
		pc.Close()
		log.Printf("Failed to add video track: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus, ClockRate: opusClockRateHz},
		"audio", "stream",
	)
	if err != nil {
		pc.Close()
		log.Printf("Failed to create audio track: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if _, err = pc.AddTrack(audioTrack); err != nil {
		pc.Close()
		log.Printf("Failed to add audio track: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	peerID := fmt.Sprintf("%s#%d", streamKey, s.nextPeerID.Add(1))
	ssrcVideo := rand.Uint32()
	ssrcAudio := rand.Uint32()
	seqAudio := uint16(rand.Uint32())

	// H.264 packetizer: uses pion's H264Payloader (FU-A fragmentation per RFC 6184)
	h264Packetizer := rtp.NewPacketizer(
		rtpMTU, h264PayloadType, ssrcVideo,
		&codecs.H264Payloader{},
		rtp.NewRandomSequencer(),
		h264ClockRate,
	)

	sess := &peerSession{pc: pc, streamKey: streamKey}

	// opusTS tracks the RTP timestamp for outgoing Opus packets.
	// Opus frames are 20 ms each at 48 kHz = 960 samples per frame.
	const opusFrameSamples = uint32(960) // 20 ms @ 48 kHz
	var opusTS uint32

	// makeOpusSender builds the Opus RTP sender callback.
	// Called once the transcoder is started (lazy, on ICE connected).
	makeOpusSender := func() func([]byte) {
		return func(opusPkt []byte) {
			pkt := &rtp.Packet{
				Header: rtp.Header{
					Version:        2,
					PayloadType:    opusPayloadType,
					SequenceNumber: seqAudio,
					Timestamp:      opusTS,
					SSRC:           ssrcAudio,
					Marker:         false,
				},
				Payload: opusPkt,
			}
			seqAudio++
			opusTS += opusFrameSamples
			if buf, err := pkt.Marshal(); err == nil {
				if _, err := audioTrack.Write(buf); err != nil {
					// Peer disconnected — normal; don't log each write error
					_ = err
				}
			}
		}
	}

	// startTranscoder initialises the FFmpeg AAC→Opus pipe and flushes any
	// queued frames that arrived before ICE was established.
	startTranscoder := func() {
		sess.audioQueueMu.Lock()
		defer sess.audioQueueMu.Unlock()

		if sess.transcoder != nil {
			return // already started
		}

		// Determine sample rate from AudioSpecificConfig if available.
		sampleRateHz := 44100 // safe default
		if len(sess.audioSpecCfg) >= 2 {
			if sr := parseASCSampleRate(sess.audioSpecCfg); sr > 0 {
				sampleRateHz = sr
			}
		}

		t, err := newAACTranscoder(s.ffmpegPath, sampleRateHz, makeOpusSender())
		if err != nil {
			log.Printf("WebRTC: AAC transcoder start failed (%v) — audio will be silent", err)
			return
		}
		sess.transcoder = t
		log.Printf("WebRTC: AAC→Opus transcoder started for %s (sampleRate=%d)", peerID, sampleRateHz)

		// Flush buffered frames
		for _, entry := range sess.audioQueue {
			t.WriteAAC(entry.data)
		}
		sess.audioQueue = nil
	}

	sess.unsubVideo = s.streamManager.SubscribeVideo(streamKey, func(frame stream.MediaFrame) {
		// RTMP video tag layout (from FLV spec):
		//   byte 0: codec+frame_type (0x17 = H.264 keyframe, 0x27 = inter)
		//   byte 1: AVCPacketType (0=sequence header/SPS+PPS, 1=NALU, 2=EOS)
		//   bytes 2-4: CompositionTime (signed 24-bit ms offset)
		//   bytes 5+: AVCC-format NAL data (4-byte length prefix per NALU)
		data := frame.Data
		if len(data) < 5 {
			return
		}
		avcPacketType := data[1]
		if avcPacketType != 1 {
			// Skip sequence header (0) and EOS (2) — not RTP media
			return
		}

		// Convert AVCC (length-prefixed) to Annex B (start-code prefixed)
		annexB := avccToAnnexB(data[5:])
		if len(annexB) == 0 {
			return
		}

		// Convert RTMP timestamp (ms) to 90kHz RTP clock samples
		rtpSamples := uint32(frame.Timestamp) * 90

		pkts := h264Packetizer.Packetize(annexB, rtpSamples)
		for _, pkt := range pkts {
			if buf, err := pkt.Marshal(); err == nil {
				if _, err := videoTrack.Write(buf); err != nil {
					return
				}
			}
		}
	})

	sess.unsubAudio = s.streamManager.SubscribeAudio(streamKey, func(frame stream.MediaFrame) {
		// RTMP audio tag layout (FLV spec):
		//   byte 0: codec+samplerate+size+channels
		//   byte 1: AACPacketType (0=AudioSpecificConfig, 1=AAC raw frame)
		//   bytes 2+: raw AAC frame
		data := frame.Data
		if len(data) < 2 {
			return
		}

		if data[1] == 0 {
			// AudioSpecificConfig sequence header — extract and save it.
			// This tells us the real sample rate and channel count.
			if len(data) > 2 {
				cfg := make([]byte, len(data)-2)
				copy(cfg, data[2:])
				sess.audioQueueMu.Lock()
				sess.audioSpecCfg = cfg
				sess.audioQueueMu.Unlock()
			}
			return
		}

		if data[1] != 1 {
			return // unknown AACPacketType
		}

		aacFrame := data[2:]
		if len(aacFrame) == 0 {
			return
		}

		sess.audioQueueMu.Lock()
		if sess.transcoder == nil {
			// Buffer frames that arrive before ICE is connected.
			// Cap the queue at 50 frames (~1 sec) to avoid unbounded growth.
			if len(sess.audioQueue) < 50 {
				entry := aacQueueEntry{data: make([]byte, len(aacFrame))}
				copy(entry.data, aacFrame)
				sess.audioQueue = append(sess.audioQueue, entry)
			}
			sess.audioQueueMu.Unlock()
			return
		}
		t := sess.transcoder
		sess.audioQueueMu.Unlock()

		t.WriteAAC(aacFrame)
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("WebRTC %s state: %s", peerID, state)
		switch state {
		case webrtc.PeerConnectionStateConnected:
			s.streamManager.AddClient(streamKey)
			// Start transcoder now that we have a live ICE path.
			startTranscoder()
		case webrtc.PeerConnectionStateDisconnected,
			webrtc.PeerConnectionStateFailed,
			webrtc.PeerConnectionStateClosed:
			s.streamManager.RemoveClient(streamKey)
			s.cleanupPeer(peerID)
		}
	})

	s.peers.Store(peerID, sess)

	if err := pc.SetRemoteDescription(offer); err != nil {
		s.cleanupPeer(peerID)
		log.Printf("Set remote description failed: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		s.cleanupPeer(peerID)
		log.Printf("Create answer failed: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if err := pc.SetLocalDescription(answer); err != nil {
		s.cleanupPeer(peerID)
		log.Printf("Set local description failed: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Peer-ID", peerID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"answer": answer,
		"peerId": peerID,
	})

	log.Printf("WebRTC answer sent for %s (nat1to1=%v)", peerID, s.nat1to1IPs)
}

// HandleICECandidate processes a trickle-ICE candidate from a viewer.
func (s *Server) HandleICECandidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	peerID := r.URL.Query().Get("peerId")
	if peerID == "" {
		peerID = r.URL.Query().Get("key")
	}
	if peerID == "" {
		http.Error(w, "peerId required", http.StatusBadRequest)
		return
	}

	var candidateInit webrtc.ICECandidateInit
	if err := json.NewDecoder(r.Body).Decode(&candidateInit); err != nil {
		http.Error(w, "Invalid candidate", http.StatusBadRequest)
		return
	}

	val, ok := s.peers.Load(peerID)
	if !ok {
		http.Error(w, "Peer not found", http.StatusNotFound)
		return
	}
	sess := val.(*peerSession)

	if err := sess.pc.AddICECandidate(candidateInit); err != nil {
		log.Printf("Add ICE candidate failed for %s: %v", peerID, err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}

// cleanupPeer unsubscribes, closes the transcoder, and removes a peer session.
func (s *Server) cleanupPeer(peerID string) {
	if val, ok := s.peers.LoadAndDelete(peerID); ok {
		sess := val.(*peerSession)
		if sess.unsubAudio != nil {
			sess.unsubAudio()
		}
		if sess.unsubVideo != nil {
			sess.unsubVideo()
		}
		sess.audioQueueMu.Lock()
		t := sess.transcoder
		sess.transcoder = nil
		sess.audioQueue = nil
		sess.audioQueueMu.Unlock()
		if t != nil {
			t.Close()
		}
		sess.pc.Close()
	}
}

// avccToAnnexB converts AVCC (ISO 14496-15) length-prefixed NAL units to
// Annex B (ITU-T H.264) start-code format, which pion's H264Payloader expects.
func avccToAnnexB(avcc []byte) []byte {
	annexB := make([]byte, 0, len(avcc)+4)
	for len(avcc) >= 4 {
		nalLen := int(binary.BigEndian.Uint32(avcc[:4]))
		avcc = avcc[4:]
		if nalLen <= 0 || nalLen > len(avcc) {
			break
		}
		annexB = append(annexB, 0x00, 0x00, 0x00, 0x01)
		annexB = append(annexB, avcc[:nalLen]...)
		avcc = avcc[nalLen:]
	}
	return annexB
}

// detectLocalIPs returns non-loopback unicast IPv4 addresses for this machine.
// Used as a fallback when WEBRTC_NAT1TO1_IPS is not set, so ICE candidates
// include LAN/Tailscale addresses.
func detectLocalIPs() []string {
	var ips []string
	ifaces, err := net.Interfaces()
	if err != nil {
		return ips
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
				continue
			}
			if ip4 := ip.To4(); ip4 != nil {
				ips = append(ips, ip4.String())
			}
		}
	}
	return ips
}

// splitCSV splits a comma-separated string and trims spaces.
func splitCSV(s string) []string {
	var out []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := strings.TrimSpace(s[start:i])
			if part != "" {
				out = append(out, part)
			}
			start = i + 1
		}
	}
	return out
}

// parseASCSampleRate extracts the sample rate from an MPEG-4 AudioSpecificConfig.
//
// AudioSpecificConfig bit layout (ISO 14496-3):
//
//	[5]  audioObjectType (if == 31: add 6 bits for audioObjectTypeExt)
//	[4]  samplingFrequencyIndex (if == 0xF: add 24-bit explicit frequency)
//	[4]  channelConfiguration
//
// https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Audio_Specific_Config
func parseASCSampleRate(asc []byte) int {
	if len(asc) < 2 {
		return 0
	}
	// Read as a 16-bit big-endian word
	word := uint16(asc[0])<<8 | uint16(asc[1])

	// bits [15:11] = audioObjectType (5 bits) — skip it
	// bits [10:7]  = samplingFrequencyIndex (4 bits)
	sfIdx := (word >> 7) & 0xF

	// If sfIdx == 0xF the actual frequency is in the next 24 bits — too rare to
	// handle here; fall back to 44100 in that case.
	sampleRates := []int{96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350}
	if int(sfIdx) < len(sampleRates) {
		return sampleRates[sfIdx]
	}
	return 0
}
