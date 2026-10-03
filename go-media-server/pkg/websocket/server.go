package websocket

import (
	"encoding/binary"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

var upgrader = websocket.Upgrader{
	// Allow all origins for local LAN testing.
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Server struct {
	streamManager *stream.Manager
	clients       map[string][]*websocket.Conn
	mu            sync.Mutex
}

func NewServer(mgr *stream.Manager) *Server {
	return &Server{
		streamManager: mgr,
		clients:       make(map[string][]*websocket.Conn),
	}
}

// HandleConnection upgrades to WebSocket and streams FLV to the viewer.
// The FLV format is understood natively by flv.js in the browser.
func (s *Server) HandleConnection(w http.ResponseWriter, r *http.Request) {
	streamKey := r.URL.Query().Get("key")
	if streamKey == "" {
		http.Error(w, "Stream key required", http.StatusBadRequest)
		return
	}

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
	s.mu.Unlock()

	s.streamManager.AddClient(streamKey)

	// --- Send FLV header ---
	if err := conn.WriteMessage(websocket.BinaryMessage, makeFLVHeader()); err != nil {
		log.Printf("WebSocket FLV header write error: %v", err)
		return
	}

	// Subscribe to media — use real encoder timestamps from MediaFrame.
	unsubAudio := s.streamManager.SubscribeAudio(streamKey, func(frame stream.MediaFrame) {
		tag := makeFLVTag(8, frame.Timestamp, frame.Data)
		sendFLVTag(conn, tag)
	})
	unsubVideo := s.streamManager.SubscribeVideo(streamKey, func(frame stream.MediaFrame) {
		tag := makeFLVTag(9, frame.Timestamp, frame.Data)
		sendFLVTag(conn, tag)
	})

	// Deregister on disconnect
	defer func() {
		unsubAudio()
		unsubVideo()

		s.mu.Lock()
		clients := s.clients[streamKey]
		for i, c := range clients {
			if c == conn {
				s.clients[streamKey] = append(clients[:i], clients[i+1:]...)
				break
			}
		}
		s.mu.Unlock()

		s.streamManager.RemoveClient(streamKey)
		log.Printf("WebSocket client disconnected for stream %s", streamKey)
	}()

	// Block until the client disconnects.
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket unexpected close for %s: %v", streamKey, err)
			}
			break
		}
	}
}

// makeFLVHeader returns a valid 13-byte FLV file header (signature + PreviousTagSize0).
//
// Layout:
//
//	[3] "FLV" signature
//	[1] version = 0x01
//	[1] flags: 0x05 = audio (bit 2) + video (bit 0)
//	[4] DataOffset = 9 (big-endian, always)
//	[4] PreviousTagSize0 = 0
func makeFLVHeader() []byte {
	hdr := make([]byte, 13)
	hdr[0] = 'F'
	hdr[1] = 'L'
	hdr[2] = 'V'
	hdr[3] = 0x01 // version
	hdr[4] = 0x05 // audio + video flags
	// DataOffset = 9 (big-endian uint32 at [5:9])
	hdr[5] = 0x00
	hdr[6] = 0x00
	hdr[7] = 0x00
	hdr[8] = 0x09
	// PreviousTagSize0 = 0 (already zero-initialised)
	return hdr
}

// makeFLVTag wraps a raw audio or video payload in an FLV tag.
//
//	tagType: 8 = audio, 9 = video
//	timestamp: presentation timestamp in milliseconds
//
// FLV tag layout (big-endian):
//
//	[1] TagType
//	[3] DataSize
//	[3] Timestamp (lower 24 bits)
//	[1] TimestampExtended (upper 8 bits)
//	[3] StreamID (always 0)
//	[N] Data
//	[4] PreviousTagSize = 11 + N
func makeFLVTag(tagType uint8, timestamp uint32, data []byte) []byte {
	dataSize := uint32(len(data))
	prevTagSize := 11 + dataSize

	tag := make([]byte, 11+dataSize+4)
	tag[0] = tagType
	// DataSize: 3 bytes big-endian
	tag[1] = byte(dataSize >> 16)
	tag[2] = byte(dataSize >> 8)
	tag[3] = byte(dataSize)
	// Timestamp: lower 24 bits
	tag[4] = byte(timestamp >> 16)
	tag[5] = byte(timestamp >> 8)
	tag[6] = byte(timestamp)
	// TimestampExtended: upper 8 bits
	tag[7] = byte(timestamp >> 24)
	// StreamID: 3 bytes, always 0
	tag[8] = 0
	tag[9] = 0
	tag[10] = 0
	// Data
	copy(tag[11:], data)
	// PreviousTagSize
	binary.BigEndian.PutUint32(tag[11+dataSize:], prevTagSize)
	return tag
}

// sendFLVTag sends a single FLV tag over the WebSocket connection.
// gorilla/websocket requires writes from one goroutine; the stream manager's
// BroadcastAudio/Video calls consumers serially so this is safe.
func sendFLVTag(conn *websocket.Conn, tag []byte) {
	if err := conn.WriteMessage(websocket.BinaryMessage, tag); err != nil {
		log.Printf("WebSocket FLV write error: %v", err)
	}
}
