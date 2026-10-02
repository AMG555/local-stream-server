package websocket

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local testing
	},
}

type Server struct {
	streamManager *stream.Manager
	clients       map[string][]*websocket.Conn
	mu            sync.RWMutex
}

func NewServer(mgr *stream.Manager) *Server {
	return &Server{
		streamManager: mgr,
		clients:       make(map[string][]*websocket.Conn),
	}
}

// HandleConnection upgrades HTTP to WebSocket and streams media
func (s *Server) HandleConnection(w http.ResponseWriter, r *http.Request) {
	streamKey := r.URL.Query().Get("key")
	if streamKey == "" {
		http.Error(w, "Stream key required", http.StatusBadRequest)
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("WebSocket client connected for stream %s", streamKey)

	// Register client
	s.mu.Lock()
	s.clients[streamKey] = append(s.clients[streamKey], conn)
	s.streamManager.AddClient(streamKey)
	s.mu.Unlock()

	// Deregister on disconnect
	defer func() {
		s.mu.Lock()
		clients := s.clients[streamKey]
		for i, c := range clients {
			if c == conn {
				s.clients[streamKey] = append(clients[:i], clients[i+1:]...)
				break
			}
		}
		s.streamManager.RemoveClient(streamKey)
		s.mu.Unlock()
		log.Printf("WebSocket client disconnected for stream %s", streamKey)
	}()

	// Keep connection alive and handle client messages
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// BroadcastData sends media data to all clients watching a stream
func (s *Server) BroadcastData(streamKey string, data []byte, dataType string) {
	s.mu.RLock()
	clients := s.clients[streamKey]
	s.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	// Prepare message with type header
	message := append([]byte(dataType+":"), data...)

	// Broadcast to all connected clients
	for _, conn := range clients {
		err := conn.WriteMessage(websocket.BinaryMessage, message)
		if err != nil {
			log.Printf("WebSocket write error: %v", err)
		}
	}
}
