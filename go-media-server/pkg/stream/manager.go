package stream

import (
	"sync"
	"time"
)

// StreamInfo holds information about an active stream.
type StreamInfo struct {
	Key       string    `json:"key"`
	Protocol  string    `json:"protocol"` // rtmp, srt
	StartTime time.Time `json:"start_time"`
	Bitrate   int64     `json:"bitrate"`  // kbps
	Clients   int       `json:"clients"`  // connected viewers
}

// MediaFrame carries a media payload with its presentation timestamp.
type MediaFrame struct {
	Data      []byte
	Timestamp uint32 // milliseconds, from encoder
}

// MediaConsumer is a callback that receives a media frame.
type MediaConsumer func(frame MediaFrame)

// consumerEntry pairs a consumer with a unique ID so it can be removed.
type consumerEntry struct {
	id       uint64
	consumer MediaConsumer
}

// Manager handles stream lifecycle, metadata, and fan-out distribution.
type Manager struct {
	mu             sync.RWMutex
	streams        map[string]*StreamInfo
	audioConsumers map[string][]consumerEntry
	videoConsumers map[string][]consumerEntry
	nextID         uint64
}

func NewManager() *Manager {
	return &Manager{
		streams:        make(map[string]*StreamInfo),
		audioConsumers: make(map[string][]consumerEntry),
		videoConsumers: make(map[string][]consumerEntry),
	}
}

// RegisterStream adds a new active stream.
func (m *Manager) RegisterStream(key, protocol string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.streams[key] = &StreamInfo{
		Key:       key,
		Protocol:  protocol,
		StartTime: time.Now(),
	}
	// Initialise consumer slices so they're never nil.
	if m.audioConsumers[key] == nil {
		m.audioConsumers[key] = make([]consumerEntry, 0)
	}
	if m.videoConsumers[key] == nil {
		m.videoConsumers[key] = make([]consumerEntry, 0)
	}
}

// UnregisterStream removes a stream and all of its consumers.
func (m *Manager) UnregisterStream(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.streams, key)
	delete(m.audioConsumers, key)
	delete(m.videoConsumers, key)
}

// GetStream retrieves stream info (nil, false if not found).
func (m *Manager) GetStream(key string) (*StreamInfo, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info, exists := m.streams[key]
	return info, exists
}

// IsLive returns true if a stream with the given key is active.
func (m *Manager) IsLive(key string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, exists := m.streams[key]
	return exists
}

// GetAllStreams returns a snapshot of all active streams.
func (m *Manager) GetAllStreams() []*StreamInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make([]*StreamInfo, 0, len(m.streams))
	for _, info := range m.streams {
		out = append(out, info)
	}
	return out
}

// UpdateBitrate updates the bitrate for a stream.
func (m *Manager) UpdateBitrate(key string, bitrate int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, ok := m.streams[key]; ok {
		info.Bitrate = bitrate
	}
}

// AddClient increments the viewer count for a stream.
func (m *Manager) AddClient(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, ok := m.streams[key]; ok {
		info.Clients++
	}
}

// RemoveClient decrements the viewer count for a stream.
func (m *Manager) RemoveClient(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if info, ok := m.streams[key]; ok && info.Clients > 0 {
		info.Clients--
	}
}

// SubscribeAudio registers a consumer for audio frames.
// Returns an unsubscribe function — callers MUST call it when done.
func (m *Manager) SubscribeAudio(key string, consumer MediaConsumer) func() {
	m.mu.Lock()
	m.nextID++
	id := m.nextID
	if m.audioConsumers[key] == nil {
		m.audioConsumers[key] = make([]consumerEntry, 0)
	}
	m.audioConsumers[key] = append(m.audioConsumers[key], consumerEntry{id, consumer})
	m.mu.Unlock()

	return func() { m.removeAudio(key, id) }
}

// SubscribeVideo registers a consumer for video frames.
// Returns an unsubscribe function — callers MUST call it when done.
func (m *Manager) SubscribeVideo(key string, consumer MediaConsumer) func() {
	m.mu.Lock()
	m.nextID++
	id := m.nextID
	if m.videoConsumers[key] == nil {
		m.videoConsumers[key] = make([]consumerEntry, 0)
	}
	m.videoConsumers[key] = append(m.videoConsumers[key], consumerEntry{id, consumer})
	m.mu.Unlock()

	return func() { m.removeVideo(key, id) }
}

func (m *Manager) removeAudio(key string, id uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.audioConsumers[key] = removeByID(m.audioConsumers[key], id)
}

func (m *Manager) removeVideo(key string, id uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.videoConsumers[key] = removeByID(m.videoConsumers[key], id)
}

func removeByID(entries []consumerEntry, id uint64) []consumerEntry {
	for i, e := range entries {
		if e.id == id {
			return append(entries[:i], entries[i+1:]...)
		}
	}
	return entries
}

// BroadcastAudio delivers an audio frame to all registered consumers.
// The consumer slice is copied under RLock; callbacks run without any lock
// held so a slow consumer cannot stall the broadcaster.
func (m *Manager) BroadcastAudio(key string, data []byte, ts uint32) {
	m.mu.RLock()
	entries := make([]consumerEntry, len(m.audioConsumers[key]))
	copy(entries, m.audioConsumers[key])
	m.mu.RUnlock()

	frame := MediaFrame{Data: data, Timestamp: ts}
	for _, e := range entries {
		e.consumer(frame)
	}
}

// BroadcastVideo delivers a video frame to all registered consumers.
func (m *Manager) BroadcastVideo(key string, data []byte, ts uint32) {
	m.mu.RLock()
	entries := make([]consumerEntry, len(m.videoConsumers[key]))
	copy(entries, m.videoConsumers[key])
	m.mu.RUnlock()

	frame := MediaFrame{Data: data, Timestamp: ts}
	for _, e := range entries {
		e.consumer(frame)
	}
}
