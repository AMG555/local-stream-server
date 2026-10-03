package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/local-stream-server/go-media-server/pkg/config"
	"github.com/local-stream-server/go-media-server/pkg/stream"
)

// newTestServer creates an API server wired to a fresh stream.Manager,
// registers the default routes, and returns the server + a test HTTP server.
func newTestServer(t *testing.T) (*Server, *httptest.Server) {
	t.Helper()
	cfg := config.APIConfig{Host: "localhost", Port: 0}
	mgr := stream.NewManager()
	srv := NewServer(cfg, mgr)

	// Register routes the same way main.go does (minus WS/WebRTC which need
	// live gorilla/websocket / pion connections — those are out-of-process).
	srv.mux.HandleFunc("/health", srv.corsMiddleware(srv.handleHealth))
	srv.mux.HandleFunc("/streams", srv.corsMiddleware(srv.handleStreams))
	srv.mux.HandleFunc("/streams/", srv.corsMiddleware(srv.handleStreamDetail))

	ts := httptest.NewServer(srv.mux)
	t.Cleanup(ts.Close)
	return srv, ts
}

// ── /health ───────────────────────────────────────────────────────────────────

func TestHealthEndpoint(t *testing.T) {
	_, ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/health")
	if err != nil {
		t.Fatalf("GET /health: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status: got %d, want 200", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf(`status field: got %q, want "ok"`, body["status"])
	}
	if body["server"] != "go-media-server" {
		t.Errorf(`server field: got %q, want "go-media-server"`, body["server"])
	}
}

func TestHealthCORSHeaders(t *testing.T) {
	_, ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/health")
	if err != nil {
		t.Fatalf("GET /health: %v", err)
	}
	defer resp.Body.Close()

	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("CORS origin: got %q, want %q", got, "*")
	}
}

func TestHealthCORSPreflightOPTIONS(t *testing.T) {
	_, ts := newTestServer(t)

	req, _ := http.NewRequest("OPTIONS", ts.URL+"/health", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("OPTIONS /health: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("OPTIONS status: got %d, want 200", resp.StatusCode)
	}
}

// ── /streams ──────────────────────────────────────────────────────────────────

func TestStreamsEndpointEmpty(t *testing.T) {
	_, ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/streams")
	if err != nil {
		t.Fatalf("GET /streams: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status: got %d, want 200", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}

	// count field should be 0 when no streams are registered
	count, ok := body["count"].(float64)
	if !ok {
		t.Fatalf("count field missing or wrong type: %v", body["count"])
	}
	if count != 0 {
		t.Errorf("count: got %v, want 0", count)
	}
}

func TestStreamsEndpointWithActiveStreams(t *testing.T) {
	srv, ts := newTestServer(t)

	srv.streamManager.RegisterStream("key-a", "rtmp")
	srv.streamManager.RegisterStream("key-b", "srt")

	resp, err := http.Get(ts.URL + "/streams")
	if err != nil {
		t.Fatalf("GET /streams: %v", err)
	}
	defer resp.Body.Close()

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}

	count, _ := body["count"].(float64)
	if count != 2 {
		t.Errorf("count: got %v, want 2", count)
	}

	streams, ok := body["streams"].([]interface{})
	if !ok {
		t.Fatalf("streams field missing or wrong type")
	}
	if len(streams) != 2 {
		t.Errorf("streams length: got %d, want 2", len(streams))
	}
}

// ── /streams/{key} ────────────────────────────────────────────────────────────

func TestStreamDetailFound(t *testing.T) {
	srv, ts := newTestServer(t)

	srv.streamManager.RegisterStream("my-stream-key", "rtmp")

	resp, err := http.Get(ts.URL + "/streams/my-stream-key")
	if err != nil {
		t.Fatalf("GET /streams/my-stream-key: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status: got %d, want 200", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["key"] != "my-stream-key" {
		t.Errorf("key field: got %q, want %q", body["key"], "my-stream-key")
	}
	if body["protocol"] != "rtmp" {
		t.Errorf("protocol field: got %q, want %q", body["protocol"], "rtmp")
	}
}

func TestStreamDetailNotFound(t *testing.T) {
	_, ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/streams/ghost-key")
	if err != nil {
		t.Fatalf("GET /streams/ghost-key: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("status: got %d, want 404", resp.StatusCode)
	}
}

func TestStreamDetailEmptyKey(t *testing.T) {
	_, ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/streams/")
	if err != nil {
		t.Fatalf("GET /streams/: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status: got %d, want 400", resp.StatusCode)
	}
}
