package stream

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// ── RegisterStream / UnregisterStream / IsLive / GetStream ───────────────────

func TestRegisterAndIsLive(t *testing.T) {
	m := NewManager()
	const key = "test-key-1"

	if m.IsLive(key) {
		t.Fatal("expected stream to not be live before registration")
	}

	m.RegisterStream(key, "rtmp")

	if !m.IsLive(key) {
		t.Fatal("expected stream to be live after registration")
	}

	info, exists := m.GetStream(key)
	if !exists {
		t.Fatal("expected GetStream to find the key")
	}
	if info.Key != key {
		t.Errorf("got key %q, want %q", info.Key, key)
	}
	if info.Protocol != "rtmp" {
		t.Errorf("got protocol %q, want %q", info.Protocol, "rtmp")
	}
	if info.StartTime.IsZero() {
		t.Error("StartTime should not be zero")
	}
}

func TestUnregisterStream(t *testing.T) {
	m := NewManager()
	const key = "test-key-2"

	m.RegisterStream(key, "srt")
	m.UnregisterStream(key)

	if m.IsLive(key) {
		t.Fatal("expected stream to not be live after unregistration")
	}
	if _, exists := m.GetStream(key); exists {
		t.Fatal("expected GetStream to return not-found after unregister")
	}
}

func TestGetAllStreams(t *testing.T) {
	m := NewManager()
	m.RegisterStream("a", "rtmp")
	m.RegisterStream("b", "srt")
	m.RegisterStream("c", "rtmp")

	all := m.GetAllStreams()
	if len(all) != 3 {
		t.Errorf("expected 3 streams, got %d", len(all))
	}
}

// ── UpdateBitrate / AddClient / RemoveClient ─────────────────────────────────

func TestUpdateBitrate(t *testing.T) {
	m := NewManager()
	const key = "br-key"
	m.RegisterStream(key, "rtmp")

	m.UpdateBitrate(key, 5000)

	info, _ := m.GetStream(key)
	if info.Bitrate != 5000 {
		t.Errorf("expected bitrate 5000, got %d", info.Bitrate)
	}
}

func TestUpdateBitrateNoOp(t *testing.T) {
	m := NewManager()
	// Should not panic for unknown key
	m.UpdateBitrate("ghost-key", 9999)
}

func TestClientCounting(t *testing.T) {
	m := NewManager()
	const key = "client-key"
	m.RegisterStream(key, "rtmp")

	m.AddClient(key)
	m.AddClient(key)

	info, _ := m.GetStream(key)
	if info.Clients != 2 {
		t.Errorf("expected 2 clients, got %d", info.Clients)
	}

	m.RemoveClient(key)
	info, _ = m.GetStream(key)
	if info.Clients != 1 {
		t.Errorf("expected 1 client after remove, got %d", info.Clients)
	}

	// Should not go below zero
	m.RemoveClient(key)
	m.RemoveClient(key)
	info, _ = m.GetStream(key)
	if info.Clients < 0 {
		t.Errorf("clients went negative: %d", info.Clients)
	}
}

// ── Subscribe / Broadcast ────────────────────────────────────────────────────

func TestBroadcastAudio(t *testing.T) {
	m := NewManager()
	const key = "audio-key"
	m.RegisterStream(key, "rtmp")

	received := make([]MediaFrame, 0, 2)
	var mu sync.Mutex

	unsub := m.SubscribeAudio(key, func(f MediaFrame) {
		mu.Lock()
		received = append(received, f)
		mu.Unlock()
	})
	defer unsub()

	m.BroadcastAudio(key, []byte{0xAF, 0x01, 0xDE}, 100)
	m.BroadcastAudio(key, []byte{0xAF, 0x01, 0xAD}, 200)

	// Give goroutines a moment (broadcast is synchronous, so this is just safety)
	time.Sleep(5 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(received) != 2 {
		t.Fatalf("expected 2 frames, got %d", len(received))
	}
	if received[0].Timestamp != 100 {
		t.Errorf("frame[0] timestamp: got %d, want 100", received[0].Timestamp)
	}
	if received[1].Timestamp != 200 {
		t.Errorf("frame[1] timestamp: got %d, want 200", received[1].Timestamp)
	}
}

func TestBroadcastVideo(t *testing.T) {
	m := NewManager()
	const key = "video-key"
	m.RegisterStream(key, "rtmp")

	var count atomic.Int32
	unsub := m.SubscribeVideo(key, func(f MediaFrame) {
		count.Add(1)
	})
	defer unsub()

	for i := 0; i < 10; i++ {
		m.BroadcastVideo(key, []byte{0x17, 0x01}, uint32(i*33))
	}

	if count.Load() != 10 {
		t.Errorf("expected 10 video frames, got %d", count.Load())
	}
}

func TestUnsubscribeStopsDelivery(t *testing.T) {
	m := NewManager()
	const key = "unsub-key"
	m.RegisterStream(key, "rtmp")

	var count atomic.Int32
	unsub := m.SubscribeAudio(key, func(f MediaFrame) {
		count.Add(1)
	})

	m.BroadcastAudio(key, []byte{0x01}, 1)
	unsub() // unsubscribe
	m.BroadcastAudio(key, []byte{0x02}, 2)
	m.BroadcastAudio(key, []byte{0x03}, 3)

	if count.Load() != 1 {
		t.Errorf("expected exactly 1 delivery before unsub, got %d", count.Load())
	}
}

func TestMultipleSubscribers(t *testing.T) {
	m := NewManager()
	const key = "multi-key"
	m.RegisterStream(key, "rtmp")

	var wg sync.WaitGroup
	counts := [3]atomic.Int32{}
	unsubs := make([]func(), 3)

	for i := range counts {
		i := i
		wg.Add(1)
		unsubs[i] = m.SubscribeVideo(key, func(f MediaFrame) {
			counts[i].Add(1)
			wg.Done()
		})
	}

	m.BroadcastVideo(key, []byte{0x27, 0x01}, 42)
	wg.Wait()

	for i := range counts {
		if counts[i].Load() != 1 {
			t.Errorf("subscriber %d: expected 1 frame, got %d", i, counts[i].Load())
		}
	}

	for _, u := range unsubs {
		u()
	}
}

// ── Concurrency: no races on concurrent broadcast + subscribe ────────────────

func TestConcurrentBroadcastSubscribe(t *testing.T) {
	m := NewManager()
	const key = "race-key"
	m.RegisterStream(key, "rtmp")

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			unsub := m.SubscribeAudio(key, func(f MediaFrame) {})
			m.BroadcastAudio(key, []byte{0x01}, 0)
			unsub()
		}()
	}
	wg.Wait()
}
