# Changelog

All notable changes to Local Stream Server will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-01

### 🎉 Initial Release

#### Added
- RTMP stream ingestion server (port 1935)
- HLS playback with FFmpeg transcoding (port 8080)
- Web-based stream key management interface (port 8000)
- Real-time health monitoring dashboard
  - Bitrate tracking
  - FPS monitoring
  - Dropped frames detection
  - Connection quality indicators (Excellent/Good/Fair/Poor)
- YouTube Studio-style health dashboard
- Support for multiple encoders:
  - OBS Studio
  - vMix
  - Wirecast
  - XSplit
  - Streamlabs Desktop
  - Hardware encoders (RTMP mode)
- Multi-platform streaming support:
  - YouTube Live
  - Facebook Live
  - Twitch
  - Instagram Live
  - TikTok Live
  - LinkedIn Live
  - Twitter/X Live
  - Custom RTMP servers
- Cloudflare Tunnel integration for remote access
  - Quick start mode (temporary URLs)
  - Persistent mode (permanent URLs)
  - Batch scripts for Windows
- Persistent stream key storage (JSON)
- Socket.IO for real-time updates
- Mobile-responsive interface
- Platform testing presets (1080p60, 720p30, vertical 9:16, etc.)
- Comprehensive documentation:
  - Getting Started Guide
  - OBS Setup Guide (encoder comparisons)
  - Cloudflare Tunnel Guide
  - Platform Testing Guide (all platforms)
  - Project Structure Guide
- Automated screenshot tool (Puppeteer)
- MIT License

#### Technical Details
- Node.js backend with Express
- node-media-server for RTMP handling
- Socket.IO for WebSocket communication
- UUID-based stream key generation
- FFmpeg auto-detection with graceful fallback
- Cross-platform support (Windows, macOS, Linux)
- **Protocol:** RTMP only (SRT and WebRTC not supported)

---

## [Unreleased]

### Planned Features
- [ ] Stream recording with auto-cleanup
- [ ] Multi-bitrate transcoding (ABR)
- [ ] WebRTC playback support
- [ ] SRT protocol support (Secure Reliable Transport)
- [ ] Stream analytics export (CSV/JSON)
- [ ] API authentication
- [ ] Docker support
- [ ] Rate limiting
- [ ] RTMPS (encrypted RTMP)

---

## Version History

- **1.0.0** (2024-10-01) - Initial public release

---

## How to Update

```bash
git pull origin main
npm install
npm start
```

## Breaking Changes

None yet (first release)
