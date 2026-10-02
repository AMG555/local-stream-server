package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/local-stream-server/go-media-server/pkg/api"
	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/rtmp"
	"github.com/local-stream-server/go-media-server/pkg/srt"
	"github.com/local-stream-server/go-media-server/pkg/stream"
	"github.com/local-stream-server/go-media-server/pkg/webrtc"
	"github.com/local-stream-server/go-media-server/pkg/websocket"
)

func main() {
	// Parse command-line flags
	configPath := flag.String("config", "config.yml", "Path to configuration file")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize stream manager
	streamManager := stream.NewManager()

	// Start RTMP server
	rtmpServer := rtmp.NewServer(cfg.RTMP, streamManager)
	go func() {
		log.Printf("Starting RTMP server on port %d", cfg.RTMP.Port)
		if err := rtmpServer.Start(); err != nil {
			log.Fatalf("RTMP server error: %v", err)
		}
	}()

	// Start SRT server
	srtServer := srt.NewServer(cfg.SRT, streamManager)
	go func() {
		log.Printf("Starting SRT server on port %d", cfg.SRT.Port)
		if err := srtServer.Start(); err != nil {
			log.Fatalf("SRT server error: %v", err)
		}
	}()

	// Start WebSocket server (embedded in HTTP)
	wsServer := websocket.NewServer(streamManager)
	
	// Start WebRTC server
	webrtcServer := webrtc.NewServer(streamManager)

	// Start REST API with WebSocket and WebRTC endpoints
	apiServer := api.NewServer(cfg.API, streamManager)
	apiServer.RegisterWebSocketHandler("/ws", wsServer.HandleConnection)
	apiServer.RegisterWebRTCHandlers("/webrtc/offer", webrtcServer.HandleOffer, "/webrtc/candidate", webrtcServer.HandleICECandidate)
	
	go func() {
		log.Printf("Starting API server on port %d", cfg.API.Port)
		if err := apiServer.Start(); err != nil {
			log.Fatalf("API server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	// Graceful shutdown
	fmt.Println("\nShutting down servers...")
	rtmpServer.Stop()
	srtServer.Stop()
	apiServer.Stop()
	fmt.Println("Shutdown complete")
}
