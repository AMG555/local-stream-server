package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadValidConfig(t *testing.T) {
	tmpDir := t.TempDir()
	confPath := filepath.Join(tmpDir, "config.yml")
	content := []byte(`
rtmp:
  port: 2936
  chunk_size: 8192
  gop_cache: true
  ping_timeout: 45
srt:
  port: 9554
  latency: 150
api:
  port: 9084
  host: "127.0.0.1"
`)
	if err := os.WriteFile(confPath, content, 0644); err != nil {
		t.Fatalf("Failed to write temp config: %v", err)
	}

	cfg, err := Load(confPath)
	if err != nil {
		t.Fatalf("Load returned unexpected error: %v", err)
	}

	if cfg.RTMP.Port != 2936 {
		t.Errorf("RTMP.Port = %d; want 2936", cfg.RTMP.Port)
	}
	if cfg.RTMP.ChunkSize != 8192 {
		t.Errorf("RTMP.ChunkSize = %d; want 8192", cfg.RTMP.ChunkSize)
	}
	if !cfg.RTMP.GOPCache {
		t.Errorf("RTMP.GOPCache = false; want true")
	}
	if cfg.RTMP.PingTimeout != 45 {
		t.Errorf("RTMP.PingTimeout = %d; want 45", cfg.RTMP.PingTimeout)
	}
	if cfg.SRT.Port != 9554 {
		t.Errorf("SRT.Port = %d; want 9554", cfg.SRT.Port)
	}
	if cfg.SRT.Latency != 150 {
		t.Errorf("SRT.Latency = %d; want 150", cfg.SRT.Latency)
	}
	if cfg.API.Port != 9084 {
		t.Errorf("API.Port = %d; want 9084", cfg.API.Port)
	}
	if cfg.API.Host != "127.0.0.1" {
		t.Errorf("API.Host = %s; want 127.0.0.1", cfg.API.Host)
	}
}

func TestLoadDefaults(t *testing.T) {
	tmpDir := t.TempDir()
	confPath := filepath.Join(tmpDir, "empty_config.yml")
	if err := os.WriteFile(confPath, []byte("{}"), 0644); err != nil {
		t.Fatalf("Failed to write temp config: %v", err)
	}

	cfg, err := Load(confPath)
	if err != nil {
		t.Fatalf("Load returned unexpected error: %v", err)
	}

	if cfg.RTMP.Port != 1935 {
		t.Errorf("Default RTMP.Port = %d; want 1935", cfg.RTMP.Port)
	}
	if cfg.RTMP.ChunkSize != 4096 {
		t.Errorf("Default RTMP.ChunkSize = %d; want 4096", cfg.RTMP.ChunkSize)
	}
	if cfg.SRT.Port != 8554 {
		t.Errorf("Default SRT.Port = %d; want 8554", cfg.SRT.Port)
	}
	if cfg.SRT.Latency != 120 {
		t.Errorf("Default SRT.Latency = %d; want 120", cfg.SRT.Latency)
	}
	if cfg.API.Port != 8084 {
		t.Errorf("Default API.Port = %d; want 8084", cfg.API.Port)
	}
	if cfg.API.Host != "0.0.0.0" {
		t.Errorf("Default API.Host = %s; want 0.0.0.0", cfg.API.Host)
	}
}

func TestLoadNonExistentFile(t *testing.T) {
	_, err := Load("does_not_exist_12345.yml")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestLoadMalformedYAML(t *testing.T) {
	tmpDir := t.TempDir()
	confPath := filepath.Join(tmpDir, "bad.yml")
	if err := os.WriteFile(confPath, []byte("rtmp:\n  port: [not, a, number"), 0644); err != nil {
		t.Fatalf("Failed to write bad config: %v", err)
	}

	_, err := Load(confPath)
	if err == nil {
		t.Error("Expected error for malformed YAML, got nil")
	}
}
