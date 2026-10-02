package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

type Server struct {
	config        config.APIConfig
	streamManager *stream.Manager
	server        *http.Server
	mux           *http.ServeMux
}

func NewServer(cfg config.APIConfig, mgr *stream.Manager) *Server {
	return &Server{
		config:        cfg,
		streamManager: mgr,
		mux:           http.NewServeMux(),
	}
}

// RegisterWebSocketHandler adds WebSocket endpoint
func (s *Server) RegisterWebSocketHandler(path string, handler http.HandlerFunc) {
	s.mux.HandleFunc(path, s.corsMiddleware(handler))
}

// RegisterWebRTCHandlers adds WebRTC endpoints
func (s *Server) RegisterWebRTCHandlers(offerPath string, offerHandler http.HandlerFunc, candidatePath string, candidateHandler http.HandlerFunc) {
	s.mux.HandleFunc(offerPath, s.corsMiddleware(offerHandler))
	s.mux.HandleFunc(candidatePath, s.corsMiddleware(candidateHandler))
}

func (s *Server) Start() error {
	// CORS middleware
	s.mux.HandleFunc("/health", s.corsMiddleware(s.handleHealth))
	s.mux.HandleFunc("/streams", s.corsMiddleware(s.handleStreams))
	s.mux.HandleFunc("/streams/", s.corsMiddleware(s.handleStreamDetail))

	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	s.server = &http.Server{
		Addr:    addr,
		Handler: s.mux,
	}

	log.Printf("API server starting on %s", addr)
	return s.server.ListenAndServe()
}

func (s *Server) corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status": "ok",
		"server": "go-media-server",
	}
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleStreams(w http.ResponseWriter, r *http.Request) {
	streams := s.streamManager.GetAllStreams()
	
	response := map[string]interface{}{
		"streams": streams,
		"count":   len(streams),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleStreamDetail(w http.ResponseWriter, r *http.Request) {
	// Extract stream key from URL path
	key := r.URL.Path[len("/streams/"):]
	
	if key == "" {
		http.Error(w, "Stream key required", http.StatusBadRequest)
		return
	}

	info, exists := s.streamManager.GetStream(key)
	if !exists {
		http.Error(w, "Stream not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func (s *Server) Stop() {
	log.Println("Stopping API server...")
	if s.server != nil {
		s.server.Close()
	}
	log.Println("API server stopped")
}
