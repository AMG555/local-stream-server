package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	RTMP RTMPConfig `yaml:"rtmp"`
	SRT  SRTConfig  `yaml:"srt"`
	API  APIConfig  `yaml:"api"`
}

type RTMPConfig struct {
	Port        int    `yaml:"port"`
	ChunkSize   int    `yaml:"chunk_size"`
	GOPCache    bool   `yaml:"gop_cache"`
	PingTimeout int    `yaml:"ping_timeout"`
}

type SRTConfig struct {
	Port           int `yaml:"port"`
	Latency        int `yaml:"latency"`
	MaxBandwidth   int `yaml:"max_bandwidth"`
	OverheadBW     int `yaml:"overhead_bw"`
}

type APIConfig struct {
	Port int    `yaml:"port"`
	Host string `yaml:"host"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	// Set defaults
	if cfg.RTMP.Port == 0 {
		cfg.RTMP.Port = 1935
	}
	if cfg.RTMP.ChunkSize == 0 {
		cfg.RTMP.ChunkSize = 4096
	}
	if cfg.SRT.Port == 0 {
		cfg.SRT.Port = 8554
	}
	if cfg.SRT.Latency == 0 {
		cfg.SRT.Latency = 120 // 120ms default latency
	}
	if cfg.API.Port == 0 {
		cfg.API.Port = 8084
	}
	if cfg.API.Host == "" {
		cfg.API.Host = "0.0.0.0"
	}

	return &cfg, nil
}
