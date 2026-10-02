package srt

import (
	"fmt"
	"log"
	"net"
	"sync"

	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

type Server struct {
	config        config.SRTConfig
	streamManager *stream.Manager
	listener      net.PacketConn
	wg            sync.WaitGroup
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
	
	// SRT uses UDP
	listener, err := net.ListenPacket("udp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	s.listener = listener
	log.Printf("SRT server listening on %s (latency: %dms)", addr, s.config.Latency)

	// Buffer for incoming packets
	buffer := make([]byte, 1500) // MTU size

	for {
		select {
		case <-s.stopChan:
			return nil
		default:
			n, remoteAddr, err := listener.ReadFrom(buffer)
			if err != nil {
				select {
				case <-s.stopChan:
					return nil
				default:
					log.Printf("SRT read error: %v", err)
					continue
				}
			}

			s.wg.Add(1)
			go s.handlePacket(buffer[:n], remoteAddr)
		}
	}
}

func (s *Server) handlePacket(data []byte, addr net.Addr) {
	defer s.wg.Done()

	// TODO: Implement SRT protocol handling
	// For now, this is a placeholder structure
	// We'll use github.com/datarhei/gosrt or similar library
	
	// SRT packet format:
	// - First bit indicates control (1) or data (0) packet
	// - Control packets: handshake, keepalive, ACK, NAK
	// - Data packets: actual media content with sequence numbers
	
	if len(data) == 0 {
		return
	}

	isControlPacket := (data[0] & 0x80) != 0
	
	if isControlPacket {
		log.Printf("SRT control packet from %s", addr)
		// TODO: Handle handshake, keepalive, etc.
	} else {
		log.Printf("SRT data packet from %s (%d bytes)", addr, len(data))
		// TODO: Extract stream key, parse media data
		// Register stream and forward to outputs
	}
}

func (s *Server) Stop() {
	log.Println("Stopping SRT server...")
	close(s.stopChan)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("SRT server stopped")
}
