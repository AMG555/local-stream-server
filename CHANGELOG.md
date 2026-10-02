# Changelog

All notable changes to Local Stream Server will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-02-10

### ✨ YouTube-Style Live Streaming

#### Added
- **YouTube-style live behavior**: Always jumps to LIVE edge on stream start (not paused position)
- **"GO LIVE" button**: Red pulsing button appears when viewer falls >5 seconds behind live
- **Auto-reconnect**: Automatically recovers from network errors and jumps back to live
- **Auto-jump to live**: Automatically seeks to live if viewer falls >20 seconds behind
- **LIVE indicator**: Visual badge with opacity change when not at live edge
- **Smart reconnection**: On play after pause, auto-jumps to live if >15 seconds behind

#### Improved
- HLS.js configuration: `liveSyncDuration: 3s`, `liveMaxLatencyDuration: 10s`
- Network error recovery with automatic seek to live edge
- Media error recovery with HLS.js `recoverMediaError()`
- Lag checking every 1 second with UI feedback
- Better handling of stream breaks and signal drops

#### Technical
- Player always prioritizes live content over buffered content
- Interval-based lag monitoring with "Go Live" button toggle
- Proper cleanup of live check intervals on player close
- Auto-recovery handlers for NETWORK_ERROR and MEDIA_ERROR

## [1.0.3] - 2026-02-10

### 🐛 Critical Bug Fixes

#### Fixed
- **CRITICAL**: Graceful shutdown race condition - async callbacks now properly awaited with Promise.all() and 5-second timeout
- **CRITICAL**: Uptime timer memory leak - interval now properly tracked and cleared on page unload
- **CRITICAL**: Server crash on corrupted data - added Array.isArray() validation in loadStreamKeys() before forEach
- **HIGH**: Session lifecycle race - added activeStreams check and sessionId null validation in delete endpoint
- **HIGH**: Event listener memory leak - DOM nodes now cloned to remove old listeners before re-attaching
- **MEDIUM**: Slow server startup - reduced FFmpeg detection timeout from 3000ms to 1000ms
- **MEDIUM**: Poor error handling - added HTTP status checks and user-friendly error messages in deleteStream()
- **MEDIUM**: Global event listener cleanup - keyboardHandler now properly stored and removed on cleanup

#### Improved
- Memory management in long-running browser sessions
- Server stability with malformed configuration files
- Resource cleanup on server shutdown
- User feedback on API failures

## [1.0.2] - 2026-02-10

### 🔒 Critical Security Updates

#### Fixed
- **CRITICAL - CVE-2025-27137**: Upgraded uuid from 9.0.0 to 14.0.2 (buffer bounds vulnerability in v3/v5/v6 functions)
- **CRITICAL**: DoS prevention - added rate limiting to stream creation (10 per 15min per IP) and deletion (20 per 5min per IP)
- **HIGH**: XSS vulnerability in data attributes - escaped quotes with `&quot;` to prevent attribute breakout attacks
- **HIGH**: Added Content-Security-Policy headers (CSP, X-Frame-Options, X-XSS-Protection, X-Content-Type-Options)
- **HIGH**: Stream key leakage - redacted stream keys from all console logs
- **HIGH**: Race condition in stream activation - atomic check using activeStreams before setting isLive flag
- **MEDIUM**: Input validation - title sanitization (1-100 chars, strips control/zero-width characters)
- **MEDIUM**: Memory leak - clear streamStatsHistory Map when streams end

#### Added
- express-rate-limit middleware for API protection
- `sanitizeTitle()` helper for input sanitization
- `redactStreamKey()` helper to prevent key exposure in logs
- Comprehensive security headers on all HTTP responses

## [1.0.1] - 2026-02-10

### 🔒 Security & Stability

#### Fixed
- **CRITICAL**: XSS vulnerability in stream title rendering - replaced inline `onclick` handlers with event delegation
- **CRITICAL**: FFmpeg zombie processes - added graceful shutdown handlers for SIGINT/SIGTERM/uncaughtException
- **HIGH**: Race condition in stream state management - prevent duplicate live streams
- **HIGH**: Socket listener memory leak - proper cleanup on page unload  
- **HIGH**: Insecure stream key validation - added UUID format validation across all endpoints
- **HIGH**: HLS segment accumulation - changed `hlsKeep` to `false` for automatic cleanup
- Added global error handlers for unhandled promise rejections
- Enhanced resource cleanup on server shutdown

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
