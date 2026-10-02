package rtmp

import (
	"fmt"
	"log"
	"net"
	"sync"

	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

type Server struct {
	config        config.RTMPConfig
	streamManager *stream.Manager
	listener      net.Listener
	wg            sync.WaitGroup
	stopChan      chan struct{}
}

func NewServer(cfg config.RTMPConfig, mgr *stream.Manager) *Server {
	return &Server{
		config:        cfg,
		streamManager: mgr,
		stopChan:      make(chan struct{}),
	}
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.config.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	s.listener = listener
	log.Printf("RTMP server listening on %s", addr)

	for {
		select {
		case <-s.stopChan:
			return nil
		default:
			conn, err := listener.Accept()
			if err != nil {
				select {
				case <-s.stopChan:
					return nil
				default:
					log.Printf("Accept error: %v", err)
					continue
				}
			}

			s.wg.Add(1)
			go s.handleConnection(conn)
		}
	}
}

func (s *Server) handleConnection(conn net.Conn) {
	defer s.wg.Done()
	defer conn.Close()

	log.Printf("RTMP connection from %s", conn.RemoteAddr())

	// TODO: Implement full RTMP handshake and message parsing
	// For now, this is a placeholder that demonstrates the structure
	// We'll use github.com/yapingxin/gortmp or similar library

	// Basic handshake (simplified)
	c0c1 := make([]byte, 1537)
	_, err := conn.Read(c0c1)
	if err != nil {
		log.Printf("Handshake error: %v", err)
		return
	}

	// Send S0, S1, S2
	s0s1s2 := make([]byte, 3073)
	s0s1s2[0] = 3 // RTMP version
	_, err = conn.Write(s0s1s2)
	if err != nil {
		log.Printf("Handshake response error: %v", err)
		return
	}

	// Read C2
	c2 := make([]byte, 1536)
	_, err = conn.Read(c2)
	if err != nil {
		log.Printf("Handshake C2 error: %v", err)
		return
	}

	log.Printf("RTMP handshake complete for %s", conn.RemoteAddr())

	// TODO: Parse RTMP messages (connect, createStream, publish, play)
	// Register stream with manager
	// Handle audio/video data
}

func (s *Server) Stop() {
	log.Println("Stopping RTMP server...")
	close(s.stopChan)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("RTMP server stopped")
}
