package rtmp

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"sync"

	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
	rtmp "github.com/yutopp/go-rtmp"
	rtmpmsg "github.com/yutopp/go-rtmp/message"
)

// Server listens for RTMP publisher connections and registers streams.
type Server struct {
	config        config.RTMPConfig
	streamManager *stream.Manager
	listener      net.Listener
	rtmpServer    *rtmp.Server
	wg            sync.WaitGroup
	stopChan      chan struct{}
	streamKeys    map[string]string // key -> title
}

func NewServer(cfg config.RTMPConfig, mgr *stream.Manager) *Server {
	return &Server{
		config:        cfg,
		streamManager: mgr,
		stopChan:      make(chan struct{}),
		streamKeys:    loadStreamKeys(),
	}
}

// loadStreamKeys reads the Node.js stream-keys.json for validation.
func loadStreamKeys() map[string]string {
	keys := make(map[string]string)

	data, err := os.ReadFile("../stream-keys.json")
	if err != nil {
		log.Printf("Warning: Could not load stream-keys.json: %v", err)
		return keys
	}

	var entries []struct {
		Key   string `json:"key"`
		Title string `json:"title"`
	}
	if err := json.Unmarshal(data, &entries); err != nil {
		log.Printf("Warning: Could not parse stream-keys.json: %v", err)
		return keys
	}

	for _, e := range entries {
		keys[e.Key] = e.Title
	}
	log.Printf("Loaded %d stream keys", len(keys))
	return keys
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.config.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}
	s.listener = listener
	log.Printf("RTMP server listening on %s", addr)

	s.rtmpServer = rtmp.NewServer(&rtmp.ServerConfig{
		OnConnect: func(conn net.Conn) (io.ReadWriteCloser, *rtmp.ConnConfig) {
			return conn, &rtmp.ConnConfig{
				Handler: &connHandler{
					streamManager: s.streamManager,
					streamKeys:    s.streamKeys,
					remoteAddr:    conn.RemoteAddr().String(),
				},
				ControlState: rtmp.StreamControlStateConfig{
					DefaultBandwidthWindowSize: 6 * 1024 * 1024 / 8,
				},
			}
		},
	})

	return s.rtmpServer.Serve(listener)
}

func (s *Server) Stop() {
	log.Println("Stopping RTMP server...")
	close(s.stopChan)
	if s.rtmpServer != nil {
		s.rtmpServer.Close()
	}
	s.wg.Wait()
	log.Println("RTMP server stopped")
}

// connHandler implements rtmp.Handler for each incoming publisher.
// It embeds DefaultHandler so only the methods we care about need overriding.
type connHandler struct {
	rtmp.DefaultHandler
	streamManager *stream.Manager
	streamKeys    map[string]string
	remoteAddr    string
	activeKey     string
}

// OnServe is called when the connection is ready — we use it to log the peer.
func (h *connHandler) OnServe(conn *rtmp.Conn) {
	log.Printf("RTMP client connected from %s", h.remoteAddr)
}

func (h *connHandler) OnPublish(ctx *rtmp.StreamContext, timestamp uint32, cmd *rtmpmsg.NetStreamPublish) error {
	streamName := cmd.PublishingName
	log.Printf("RTMP publish: %s from %s", streamName, h.remoteAddr)

	// Extract stream key (last path segment after optional /live/)
	key := extractStreamKey(streamName)
	if key == "" || h.streamKeys[key] == "" {
		log.Printf("RTMP: rejected invalid stream key %q", key)
		return fmt.Errorf("invalid stream key")
	}

	if h.streamManager.IsLive(key) {
		log.Printf("RTMP: stream already active: %s", key)
		return fmt.Errorf("stream already active")
	}

	h.activeKey = key
	h.streamManager.RegisterStream(key, "rtmp")
	log.Printf("RTMP: stream started: %s (%s)", key, h.streamKeys[key])
	return nil
}

// OnAudio — note: the v0.0.5 API does NOT include *StreamContext here.
func (h *connHandler) OnAudio(timestamp uint32, payload io.Reader) error {
	if h.activeKey == "" {
		return nil
	}
	data, err := io.ReadAll(payload)
	if err != nil {
		return err
	}
	h.streamManager.BroadcastAudio(h.activeKey, data)
	return nil
}

// OnVideo — note: the v0.0.5 API does NOT include *StreamContext here.
func (h *connHandler) OnVideo(timestamp uint32, payload io.Reader) error {
	if h.activeKey == "" {
		return nil
	}
	data, err := io.ReadAll(payload)
	if err != nil {
		return err
	}
	h.streamManager.BroadcastVideo(h.activeKey, data)
	return nil
}

func (h *connHandler) OnClose() {
	if h.activeKey != "" {
		h.streamManager.UnregisterStream(h.activeKey)
		log.Printf("RTMP: stream ended: %s", h.activeKey)
	}
}

func extractStreamKey(streamPath string) string {
	if len(streamPath) == 0 {
		return ""
	}
	if streamPath[0] == '/' {
		streamPath = streamPath[1:]
	}
	lastSlash := -1
	for i, c := range streamPath {
		if c == '/' {
			lastSlash = i
		}
	}
	if lastSlash >= 0 {
		return streamPath[lastSlash+1:]
	}
	return streamPath
}
