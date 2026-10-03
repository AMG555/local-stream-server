package webrtc

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/local-stream-server/go-media-server/pkg/stream"
	"github.com/pion/rtp"
	"github.com/pion/rtp/codecs"
	"github.com/pion/webrtc/v3"
)

const (
	h264PayloadType = 102 // dynamic PT for H.264
	opusPayloadType = 111 // dynamic PT for Opus (same as Chrome default)
	h264ClockRate   = 90000
	opusClockRateHz = 48000 // Opus always uses 48 kHz
	rtpMTU          = 1200
)

// Server handles WebRTC signaling and media forwarding.
type Server struct {
	streamManager *stream.Manager
	peers         sync.Map // peerID -> *peerSession
	nextPeerID    atomic.Uint64
	config        webrtc.Configuration
	ffmpegPath    string
}

// peerSession holds a single viewer's WebRTC state.
type peerSession struct {
	pc         *webrtc.PeerConnection
	streamKey  string
	transcoder *aacTranscoder // AAC→Opus FFmpeg pipe (nil if FFmpeg unavailable)
	unsubAudio func()
	unsubVideo func()
}

func NewServer(mgr *stream.Manager) *Server {
	return &Server{
		streamManager: mgr,
		ffmpegPath:    detectFFmpegPath(),
		config: webrtc.Configuration{
			ICEServers: []webrtc.ICEServer{
				{URLs: []string{"stun:stun.l.google.com:19302"}},
			},
		},
	}
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

	api := webrtc.NewAPI(webrtc.WithMediaEngine(me))
	pc, err := api.NewPeerConnection(s.config)
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

	// Start the AAC→Opus transcoder (FFmpeg subprocess).
	// opusTS tracks the RTP timestamp for outgoing Opus packets.
	// Opus frames are 20 ms each at 48 kHz = 960 samples per frame.
	const opusFrameSamples = uint32(960) // 20 ms @ 48 kHz
	var opusTS uint32

	transcoder, err := newAACTranscoder(s.ffmpegPath, func(opusPkt []byte) {
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
				log.Printf("WebRTC audio write error for %s: %v", peerID, err)
			}
		}
	})
	if err != nil {
		log.Printf("WebRTC: AAC transcoder start failed (%v) — audio will be silent", err)
		// Non-fatal: video still works
	} else {
		sess.transcoder = transcoder
		log.Printf("WebRTC: AAC→Opus transcoder started for %s", peerID)
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
					log.Printf("WebRTC video write error for %s: %v", peerID, err)
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
		if data[1] != 1 {
			// Skip AudioSpecificConfig (sequence header)
			return
		}
		aacFrame := data[2:]
		if len(aacFrame) == 0 || sess.transcoder == nil {
			return
		}
		sess.transcoder.WriteAAC(aacFrame)
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("WebRTC %s state: %s", peerID, state)
		switch state {
		case webrtc.PeerConnectionStateConnected:
			s.streamManager.AddClient(streamKey)
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

	log.Printf("WebRTC answer sent for %s (Opus audio: %v)", peerID, sess.transcoder != nil)
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
		if sess.transcoder != nil {
			sess.transcoder.Close()
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
