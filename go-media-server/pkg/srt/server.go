package srt

import (
	"fmt"
	"io"
	"log"
	"strings"
	"sync"
	"time"

	gosrt "github.com/datarhei/gosrt"
	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

// Server implements a real SRT ingest server using datarhei/gosrt.
// Publishers connect with an SRT client (OBS, FFmpeg, vMix) and identify
// themselves via the SRT StreamID field (format: "key=<streamKey>" or just
// the raw key).  Incoming MPEG-TS is demuxed into PES packets which are
// forwarded to the stream.Manager for WebSocket/WebRTC distribution.
type Server struct {
	config        config.SRTConfig
	streamManager *stream.Manager
	srv           *gosrt.Server
	mu            sync.Mutex
	stopChan      chan struct{}
}

func NewServer(cfg config.SRTConfig, mgr *stream.Manager) *Server {
	return &Server{
		config:        cfg,
		streamManager: mgr,
		stopChan:      make(chan struct{}),
	}
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.config.Port)

	cfg := gosrt.DefaultConfig()
	// Latency covers both sender and receiver in gosrt v0.12
	cfg.Latency = time.Duration(s.config.Latency) * time.Millisecond
	if s.config.MaxBandwidth > 0 {
		cfg.MaxBW = int64(s.config.MaxBandwidth)
	}
	// OverheadBW is a percentage; gosrt uses InputBW + MaxBW to derive send rate.
	// No direct Overhead field in v0.12 — omit (default bandwidth is uncapped).

	s.srv = &gosrt.Server{
		Addr:   addr,
		Config: &cfg,
		HandleConnect: func(req gosrt.ConnRequest) gosrt.ConnType {
			streamID := req.StreamId()
			key := extractSRTKey(streamID)
			if key == "" {
				log.Printf("SRT: rejected connection — no stream key in streamid %q", streamID)
				req.Reject(gosrt.REJ_ROGUE)
				return gosrt.REJECT
			}
			if s.streamManager.IsLive(key) {
				log.Printf("SRT: rejected — stream already live: %s", key)
				req.Reject(gosrt.REJ_RESOURCE) // REJ_CONFLICT not in v0.12, REJ_RESOURCE is closest
				return gosrt.REJECT
			}
			log.Printf("SRT: accepting publisher %s (key=%s)", req.RemoteAddr(), key)
			return gosrt.PUBLISH
		},
		HandlePublish: func(conn gosrt.Conn) {
			streamID := conn.StreamId()
			key := extractSRTKey(streamID)
			if key == "" {
				conn.Close()
				return
			}

			log.Printf("SRT: stream started: %s from %s", key, conn.RemoteAddr())
			s.streamManager.RegisterStream(key, "srt")

			defer func() {
				s.streamManager.UnregisterStream(key)
				conn.Close()
				log.Printf("SRT: stream ended: %s", key)
			}()

			readMPEGTS(conn, key, s.streamManager)
		},
		HandleSubscribe: func(conn gosrt.Conn) {
			// Playback via SRT subscribe is not implemented — viewers use WS/WebRTC.
			log.Printf("SRT: subscribe attempt from %s (not supported, closing)", conn.RemoteAddr())
			conn.Close()
		},
	}

	log.Printf("SRT server listening on %s (latency: %dms)", addr, s.config.Latency)
	if err := s.srv.ListenAndServe(); err != nil && err != gosrt.ErrServerClosed {
		return fmt.Errorf("SRT server error: %w", err)
	}
	return nil
}

func (s *Server) Stop() {
	log.Println("Stopping SRT server...")
	close(s.stopChan)
	if s.srv != nil {
		s.srv.Shutdown()
	}
	log.Println("SRT server stopped")
}

// extractSRTKey parses the SRT streamid to get the stream key.
// Supported formats (all used by major encoders):
//   - "key=abc123"         (OBS SRT extension)
//   - "stream_key=abc123"
//   - "#!::r=live/abc123"  (SRT Access Control — mediamtx style)
//   - "abc123"             (raw UUID key — FFmpeg default)
func extractSRTKey(streamID string) string {
	streamID = strings.TrimSpace(streamID)
	if streamID == "" {
		return ""
	}

	// SRT Access Control format: "#!::r=live/<key>,..."
	if strings.HasPrefix(streamID, "#!::") {
		for _, part := range strings.Split(streamID[4:], ",") {
			kv := strings.SplitN(part, "=", 2)
			if len(kv) == 2 {
				k := strings.TrimSpace(kv[0])
				v := strings.TrimSpace(kv[1])
				if k == "r" {
					// r=live/<key> or r=<key>
					parts := strings.Split(v, "/")
					return parts[len(parts)-1]
				}
			}
		}
		return ""
	}

	// Key-value pair format: "key=<val>" or "stream_key=<val>"
	for _, part := range strings.Split(streamID, "&") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			k := strings.TrimSpace(kv[0])
			v := strings.TrimSpace(kv[1])
			if k == "key" || k == "stream_key" || k == "streamkey" {
				return v
			}
		}
	}

	// Raw key (no = sign — FFmpeg sends just the key directly)
	if !strings.Contains(streamID, "=") {
		parts := strings.Split(streamID, "/")
		return parts[len(parts)-1]
	}

	return ""
}

// readMPEGTS reads an MPEG-TS stream from the SRT connection, extracts
// PES (Packetized Elementary Stream) payloads, and broadcasts them via
// the stream manager so WebSocket and WebRTC consumers receive the media.
//
// MPEG-TS packet structure: 188 bytes, sync byte 0x47, PID in bits 12-0 of
// bytes 1-2, continuity counter in low 4 bits of byte 3, payload follows.
//
// This is the same ingest path used by MediaMTX, Wowza, and Nimble Streamer.
func readMPEGTS(r io.Reader, key string, mgr *stream.Manager) {
	const tsPacketSize = 188
	const tsSyncByte = 0x47

	buf := make([]byte, tsPacketSize*7) // read 7 packets at a time (common MTU fill)
	pesBuffers := make(map[uint16][]byte)

	for {
		n, err := io.ReadFull(r, buf)
		if err != nil {
			if err != io.EOF && err != io.ErrUnexpectedEOF {
				log.Printf("SRT MPEG-TS read error for %s: %v", key, err)
			}
			return
		}

		// Walk all complete packets in the buffer
		for offset := 0; offset+tsPacketSize <= n; offset += tsPacketSize {
			pkt := buf[offset : offset+tsPacketSize]
			if pkt[0] != tsSyncByte {
				// Re-sync: scan for next 0x47
				log.Printf("SRT: MPEG-TS sync lost for %s", key)
				break
			}

			pid := uint16(pkt[1]&0x1f)<<8 | uint16(pkt[2])
			adaptationFieldControl := (pkt[3] >> 4) & 0x03
			payloadStart := (pkt[1] >> 6) & 0x01 // PUSI bit

			// Skip PAT (PID 0) and PMT — we broadcast all elementary streams
			if pid == 0x0000 || pid == 0x1FFF {
				continue // PAT / null packet
			}

			// Calculate payload offset
			payloadOffset := 4
			if adaptationFieldControl == 0x02 || adaptationFieldControl == 0x03 {
				// Adaptation field present
				if len(pkt) > 4 {
					afLen := int(pkt[4])
					payloadOffset = 5 + afLen
				}
			}
			if adaptationFieldControl == 0x02 {
				// Adaptation field only, no payload
				continue
			}
			if payloadOffset >= tsPacketSize {
				continue
			}

			payload := pkt[payloadOffset:]

			if payloadStart == 1 {
				// New PES packet starts here — flush previous PES for this PID
				if prev, ok := pesBuffers[pid]; ok && len(prev) > 0 {
					broadcastPES(pid, prev, key, mgr)
				}
				// Start new PES — check for PES start code 0x000001
				if len(payload) >= 4 &&
					payload[0] == 0x00 && payload[1] == 0x00 && payload[2] == 0x01 {
					pesBuffers[pid] = make([]byte, len(payload))
					copy(pesBuffers[pid], payload)
				}
			} else if buf, ok := pesBuffers[pid]; ok {
				// Continuation — append
				pesBuffers[pid] = append(buf, payload...)
			}
		}
	}
}

// broadcastPES classifies a PES packet as audio (stream_id 0xC0-0xDF)
// or video (stream_id 0xE0-0xEF) and forwards it to the stream manager.
// pid is accepted but unused — kept for future PMT-aware routing.
func broadcastPES(_ uint16, pes []byte, key string, mgr *stream.Manager) {
	if len(pes) < 4 {
		return
	}
	// PES header: start code prefix [0x00 0x00 0x01] + stream_id [1 byte]
	streamID := pes[3]

	switch {
	case streamID >= 0xE0 && streamID <= 0xEF:
		// H.264 / H.265 video elementary stream
		mgr.BroadcastVideo(key, pes)
	case streamID >= 0xC0 && streamID <= 0xDF:
		// AAC / MP3 audio elementary stream
		mgr.BroadcastAudio(key, pes)
	// default: private/subtitle/other — discard silently
	}
}
