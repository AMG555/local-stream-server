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
  - Hardware encoders
- Cloudflare Tunnel integration for remote access
  - Quick start mode (temporary URLs)
  - Persistent mode (permanent URLs)
  - Batch scripts for Windows
- Persistent stream key storage (JSON)
- Socket.IO for real-time updates
- Mobile-responsive interface
- YouTube Live testing presets (1080p60, 720p30, etc.)
- Comprehensive documentation:
  - Getting Started Guide
  - OBS Setup Guide (encoder comparisons)
  - Cloudflare Tunnel Guide
  - YouTube Live Testing Guide
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

---

## [Unreleased]

### Planned Features
- [ ] Stream recording with auto-cleanup
- [ ] Multi-bitrate transcoding (ABR)
- [ ] WebRTC playback support
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
