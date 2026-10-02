package webrtc

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/local-stream-server/go-media-server/pkg/stream"
	"github.com/pion/webrtc/v3"
)

// Server handles WebRTC signaling and media forwarding.
type Server struct {
	streamManager *stream.Manager
	peers         sync.Map // peerID -> *peerSession
	nextPeerID    atomic.Uint64
	config        webrtc.Configuration
}

// peerSession holds a single viewer's WebRTC state.
type peerSession struct {
	pc          *webrtc.PeerConnection
	streamKey   string
	unsubAudio  func()
	unsubVideo  func()
}

func NewServer(mgr *stream.Manager) *Server {
	return &Server{
		streamManager: mgr,
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

	pc, err := webrtc.NewPeerConnection(s.config)
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus}, "audio", "stream",
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

	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264}, "video", "stream",
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

	// Each peer gets a unique ID — multiple viewers per stream are supported.
	peerID := fmt.Sprintf("%s#%d", streamKey, s.nextPeerID.Add(1))

	sess := &peerSession{pc: pc, streamKey: streamKey}

	// Subscribe to media; forward raw RTP.
	// Note: real production deployment needs an RTMP→RTP transcoder here.
	sess.unsubAudio = s.streamManager.SubscribeAudio(streamKey, func(data []byte) {
		if _, err := audioTrack.Write(data); err != nil {
			log.Printf("WebRTC audio write error for %s: %v", peerID, err)
		}
	})
	sess.unsubVideo = s.streamManager.SubscribeVideo(streamKey, func(data []byte) {
		if _, err := videoTrack.Write(data); err != nil {
			log.Printf("WebRTC video write error for %s: %v", peerID, err)
		}
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

	// Return the peer ID in a custom header so the client can use it for ICE.
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Peer-ID", peerID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"answer": answer,
		"peerId": peerID,
	})

	log.Printf("WebRTC answer sent for %s", peerID)
}

// HandleICECandidate processes a trickle-ICE candidate from a viewer.
func (s *Server) HandleICECandidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	peerID := r.URL.Query().Get("peerId")
	if peerID == "" {
		// Backwards-compatible: fall back to stream key (first peer for that stream)
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

// cleanupPeer unsubscribes and removes a peer session.
func (s *Server) cleanupPeer(peerID string) {
	if val, ok := s.peers.LoadAndDelete(peerID); ok {
		sess := val.(*peerSession)
		if sess.unsubAudio != nil {
			sess.unsubAudio()
		}
		if sess.unsubVideo != nil {
			sess.unsubVideo()
		}
		sess.pc.Close()
	}
}
