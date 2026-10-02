package webrtc

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/local-stream-server/go-media-server/pkg/stream"
)

type Server struct {
	streamManager *stream.Manager
	peers         map[string]*PeerConnection
	mu            sync.RWMutex
}

type PeerConnection struct {
	StreamKey string
	// TODO: Add pion/webrtc PeerConnection when integrated
}

func NewServer(mgr *stream.Manager) *Server {
	return &Server{
		streamManager: mgr,
		peers:         make(map[string]*PeerConnection),
	}
}

// HandleOffer handles WebRTC offer from client
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

	var offer map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
		http.Error(w, "Invalid offer", http.StatusBadRequest)
		return
	}

	log.Printf("WebRTC offer received for stream %s", streamKey)

	// TODO: Create PeerConnection with pion/webrtc
	// TODO: Set remote description (offer)
	// TODO: Create answer
	// TODO: Set local description (answer)
	// TODO: Return answer to client

	// Placeholder response
	answer := map[string]interface{}{
		"type": "answer",
		"sdp":  "TODO: Generate SDP answer using pion/webrtc",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(answer)

	// Register peer
	s.mu.Lock()
	s.peers[streamKey] = &PeerConnection{
		StreamKey: streamKey,
	}
	s.streamManager.AddClient(streamKey)
	s.mu.Unlock()

	log.Printf("WebRTC peer connected for stream %s", streamKey)
}

// HandleICECandidate handles ICE candidates from client
func (s *Server) HandleICECandidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	streamKey := r.URL.Query().Get("key")
	if streamKey == "" {
		http.Error(w, "Stream key required", http.StatusBadRequest)
		return
	}

	var candidate map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&candidate); err != nil {
		http.Error(w, "Invalid candidate", http.StatusBadRequest)
		return
	}

	log.Printf("WebRTC ICE candidate received for stream %s", streamKey)

	// TODO: Add ICE candidate to PeerConnection

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}
