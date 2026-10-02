package stream

import (
	"sync"
	"time"
)

// StreamInfo holds information about an active stream
type StreamInfo struct {
	Key       string    `json:"key"`
	Protocol  string    `json:"protocol"` // rtmp, srt
	StartTime time.Time `json:"start_time"`
	Bitrate   int64     `json:"bitrate"`   // kbps
	Clients   int       `json:"clients"`   // connected viewers
}

// Manager handles stream lifecycle and metadata
type Manager struct {
	mu      sync.RWMutex
	streams map[string]*StreamInfo
}

func NewManager() *Manager {
	return &Manager{
		streams: make(map[string]*StreamInfo),
	}
}

// RegisterStream adds a new stream
func (m *Manager) RegisterStream(key, protocol string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.streams[key] = &StreamInfo{
		Key:       key,
		Protocol:  protocol,
		StartTime: time.Now(),
		Bitrate:   0,
		Clients:   0,
	}
}

// UnregisterStream removes a stream
func (m *Manager) UnregisterStream(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.streams, key)
}

// GetStream retrieves stream info
func (m *Manager) GetStream(key string) (*StreamInfo, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info, exists := m.streams[key]
	return info, exists
}

// GetAllStreams returns all active streams
func (m *Manager) GetAllStreams() []*StreamInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	streams := make([]*StreamInfo, 0, len(m.streams))
	for _, info := range m.streams {
		streams = append(streams, info)
	}
	return streams
}

// UpdateBitrate updates stream bitrate
func (m *Manager) UpdateBitrate(key string, bitrate int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, exists := m.streams[key]; exists {
		info.Bitrate = bitrate
	}
}

// AddClient increments viewer count
func (m *Manager) AddClient(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, exists := m.streams[key]; exists {
		info.Clients++
	}
}

// RemoveClient decrements viewer count
func (m *Manager) RemoveClient(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, exists := m.streams[key]; exists && info.Clients > 0 {
		info.Clients--
	}
}
