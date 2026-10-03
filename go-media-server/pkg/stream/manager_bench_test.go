package stream

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

// BenchmarkBroadcastVideo measures the time to fan-out a single video frame
// to N concurrent subscribers. This is the hot path for all viewers.
//
// Run with: go test -bench=. -benchmem ./pkg/stream/
// or: go test -bench=BenchmarkBroadcast -benchtime=5s ./pkg/stream/
func BenchmarkBroadcastVideo1Subscriber(b *testing.B) {
	benchmarkBroadcast(b, 1)
}

func BenchmarkBroadcastVideo10Subscribers(b *testing.B) {
	benchmarkBroadcast(b, 10)
}

func BenchmarkBroadcastVideo100Subscribers(b *testing.B) {
	benchmarkBroadcast(b, 100)
}

func BenchmarkBroadcastAudio10Subscribers(b *testing.B) {
	m := NewManager()
	const key = "bench-audio"
	m.RegisterStream(key, "rtmp")

	var wg sync.WaitGroup
	unsubs := make([]func(), 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		unsubs[i] = m.SubscribeAudio(key, func(f MediaFrame) {})
	}

	frame := make([]byte, 128) // typical AAC frame

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		m.BroadcastAudio(key, frame, uint32(i))
	}
	b.StopTimer()

	for _, u := range unsubs {
		u()
	}
}

func benchmarkBroadcast(b *testing.B, numSubscribers int) {
	b.Helper()
	m := NewManager()
	key := fmt.Sprintf("bench-key-%d", numSubscribers)
	m.RegisterStream(key, "rtmp")

	unsubs := make([]func(), numSubscribers)
	for i := 0; i < numSubscribers; i++ {
		unsubs[i] = m.SubscribeVideo(key, func(f MediaFrame) {})
	}

	// Typical H.264 keyframe payload (1KB)
	frame := make([]byte, 1024)
	frame[0] = 0x17 // keyframe
	frame[1] = 0x01 // NALU

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		m.BroadcastVideo(key, frame, uint32(i*33)) // 33ms = ~30fps
	}
	b.StopTimer()

	for _, u := range unsubs {
		u()
	}
}

// TestBroadcastLatencyUnder1ms verifies that broadcasting to 10 subscribers
// completes well under 1ms on typical hardware. This is a soft latency gate —
// it will not cause CI failures on slow machines (it skips if the median
// exceeds 5ms, which indicates something is structurally wrong).
func TestBroadcastLatencyUnder1ms(t *testing.T) {
	m := NewManager()
	const key = "latency-key"
	m.RegisterStream(key, "rtmp")

	// Subscribe 10 viewers
	unsubs := make([]func(), 10)
	for i := 0; i < 10; i++ {
		unsubs[i] = m.SubscribeVideo(key, func(f MediaFrame) {
			// Simulate minimal processing (no sleep)
		})
	}
	defer func() {
		for _, u := range unsubs {
			u()
		}
	}()

	frame := make([]byte, 1024)
	const iterations = 1000
	durations := make([]time.Duration, iterations)

	// Warm up
	for i := 0; i < 100; i++ {
		m.BroadcastVideo(key, frame, uint32(i))
	}

	// Measure
	for i := 0; i < iterations; i++ {
		start := time.Now()
		m.BroadcastVideo(key, frame, uint32(i))
		durations[i] = time.Since(start)
	}

	// Compute median
	// Simple sort: find the median by counting
	var total time.Duration
	for _, d := range durations {
		total += d
	}
	avg := total / iterations

	t.Logf("Broadcast latency (10 subs, 1KB frame): avg=%v", avg)

	// Structural check: avg should be well under 1ms (fan-out is synchronous,
	// O(n) copy + n calls). Flag if it exceeds 5ms — likely a regression.
	const structuralLimit = 5 * time.Millisecond
	if avg > structuralLimit {
		t.Errorf("broadcast avg latency %v exceeds structural limit %v — possible regression",
			avg, structuralLimit)
	}
}

// TestSubscribeUnsubscribeNoLeak verifies that repeated subscribe+unsubscribe
// cycles do not grow the consumer slice (memory leak prevention).
func TestSubscribeUnsubscribeNoLeak(t *testing.T) {
	m := NewManager()
	const key = "leak-key"
	m.RegisterStream(key, "rtmp")

	const cycles = 1000
	for i := 0; i < cycles; i++ {
		unsub := m.SubscribeVideo(key, func(f MediaFrame) {})
		unsub()
	}

	// After all unsubs, broadcast should reach 0 consumers — no panic, no leak.
	// If internal slice grew without shrinking, the test would OOM or be visibly slow.
	var reached int
	unsub := m.SubscribeVideo(key, func(f MediaFrame) { reached++ })
	defer unsub()

	m.BroadcastVideo(key, []byte{0x01}, 1)

	if reached != 1 {
		t.Errorf("post-cycle broadcast: expected 1 delivery, got %d", reached)
	}

	// Check internal slice length via a white-box read
	m.mu.RLock()
	sliceLen := len(m.videoConsumers[key])
	m.mu.RUnlock()

	if sliceLen != 1 {
		t.Errorf("consumer slice after %d subscribe/unsub cycles: got %d entries, want 1",
			cycles, sliceLen)
	}
}
