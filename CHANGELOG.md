# Changelog

All notable changes to Local Stream Server will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.2] - Latency fixes + startup key display

### 🔧 Fixed

- **HLS "infinity latency"** — `video.duration` is `Infinity` for live HLS streams; replaced with `hlsInstance.latency` (HLS.js built-in live-edge offset)
- **WebSocket "-- latency"** — no measurement was running; added 500ms poll of `buffered.end − currentTime` after flv.js attaches, plus `STATISTICS_INFO` event hook
- **WebRTC "-- latency"** — no measurement was running; added 1s poll of `RTCPeerConnection.getStats()` reading `inbound-rtp` jitter + 20ms estimate after first track arrives
- **Broken WebSocket probe** — `probe.close()` fired `onerror` in Chrome on healthy servers, showing false "Go server not running" warning; probe removed entirely (flv.js handles errors itself)
- **Stale latency on mode switch** — `switchPlayerMode()` now resets badge to `-- latency` before new mode starts measuring

### ✨ Added

- `_setLatencyBadge(valueMs)` — shared helper formats latency as `NNNms` (sub-second) or `N.Ns` (over 1s) with correct colour class
- **API keys always printed on startup** — all `sk_…` keys shown in terminal every restart (not only first-run), so the key is never lost

---

## [1.5.0] - RTMP/SRT UI selector + full test suite

### ✨ Added

- **RTMP / SRT protocol selector** in Stream Details modal
  - Two tabs: RTMP (OBS/vMix/Wirecast) and SRT (~120ms ultra-low latency)
  - RTMP tab: server URL, stream key, HLS playback URL, OBS instructions
  - SRT tab: pre-filled `srt://IP:8554?streamid=key=X&latency=120000` one-click copy, stream key, WebSocket playback URL, OBS SRT setup steps, FFmpeg command auto-populated with real IP + key
  - `switchIngestProtocol()` JS function — panel visibility toggle
- **Full automated test suite** — 111 tests, 100% pass, 0 failures
  - Node.js (vitest + supertest): 67 tests — helpers, auth, API integration
  - Go: 44 tests — stream manager, RTMP/SRT key extraction, FLV format, AVCC→AnnexB, AAC→LATM, HTTP API
  - Broadcast latency benchmarks: 33ns (1 viewer), 137ns (10 viewers), 708ns (100 viewers)
  - `TestBroadcastLatencyUnder1ms` structural gate: avg=562ns for 10 subscribers
- **`helpers.js`** — extracted `isValidUUID`, `sanitizeTitle`, `redactStreamKey`, `safeArgs` from `server.js` for testability
- **`makeFLVHeader()`** extracted in websocket server for testability (no behaviour change)
- `/api/info` now returns `srtPort` (8554) and `srtUrl` (`srt://IP:8554`)
- Sidebar and Server Info modal now show SRT port
- `npm` scripts: `test`, `test:watch`, `test:go`, `test:go:bench`, `test:all`

### 🔧 Fixed

- **RTMP args log leakage** — `safeArgs()` strips `tcUrl`/`swfUrl`/`pageUrl` from all RTMP event logs; OBS embeds stream keys in these fields
- **Redundant RTP sequence override** — removed manual `seqVideo` counter that was fighting `rtp.NewPacketizer`'s own `RandomSequencer` for video packets (audio path unaffected — it uses a raw `rtp.Packet`)

### 🧹 Chores

- Deleted `bin/mediamtx.zip` (old unused binary, was gitignored but present)
- Removed hard-coded personal path from `cloudflare-tunnel-config.yml`; fixed stale port 8080→8081; replaced placeholder hostname
- `auth.js`: removed `validateAPIKey` from `module.exports` (internal-only function)
- `.gitignore`: removed duplicate bare `node_modules` entry

## [1.4.0] - Real WebRTC video/audio + real FLV timestamps

### ✨ Fixed — WebRTC now decodes video and audio in the browser

#### H.264 → RTP (RFC 6184 FU-A packetization)
- RTMP video tags stripped of FLV header (codec byte, AVCPacketType, CompositionTime)
- AVCC (length-prefixed) NAL units converted to Annex B (start-code prefixed) per ISO 14496-15
- pion `H264Payloader` fragments NAL units into FU-A RTP packets at 1200-byte MTU
- Sequence header tags (AVCPacketType=0, EOS=2) silently skipped — only NALU frames sent
- RTP timestamp = RTMP timestamp (ms) × 90 (90kHz H.264 clock)

#### AAC → RTP (RFC 6416 LATM)
- RTMP audio tags stripped of FLV codec header (codec byte, AACPacketType)
- AudioSpecificConfig frames (AACPacketType=0) silently skipped
- Raw AAC frames wrapped in minimal LATM AU-Header-Section (4-byte header per RFC 6416 §6.3)
- SDP advertises `audio/MP4A-LATM` at 44100 Hz, 2 channels — Chrome/Firefox decode natively
- RTP timestamp = RTMP timestamp (ms) × 44.1 (44100 Hz clock)

#### MediaEngine per peer-connection
- Each `HandleOffer` builds its own `webrtc.MediaEngine` advertising PT 102 (H.264) and PT 96 (AAC-LATM)
- Per-peer unique SSRC and starting sequence numbers (random) prevent stream mixing

### ✨ Fixed — real encoder timestamps in FLV WebSocket stream
- `stream.Manager` `BroadcastAudio`/`BroadcastVideo` now carry `MediaFrame{Data, Timestamp uint32}`
- RTMP handler passes the `timestamp uint32` from `yutopp/go-rtmp` `OnAudio`/`OnVideo` callbacks
- SRT handler extracts 33-bit PTS from MPEG-TS PES header and converts to ms (÷90 from 90kHz)
- FLV WebSocket muxer uses `frame.Timestamp` directly — no more synthetic `+33ms` counter
- flv.js latency chasing now works correctly because timestamps match real encoder cadence


## [1.3.0] - Real SRT + FLV WebSocket

### ✨ Added

- **Full SRT protocol** via `datarhei/gosrt` — replaces the UDP-only skeleton
  - Real SRT handshake (versions 4 and 5), ACK/NAK, congestion control, optional AES encryption
  - MPEG-TS demuxer: reads 188-byte TS packets, reassembles PES, classifies audio (0xC0–0xDF) / video (0xE0–0xEF) and fans out to stream manager
  - Stream key parsed from SRT StreamID in all formats used by major encoders:
    - `key=<uuid>` — OBS SRT / FFmpeg explicit
    - `#!::r=live/<uuid>` — SRT Access Control (mediamtx style)
    - raw `<uuid>` — FFmpeg default
  - Duplicate stream rejected with `REJ_RESOURCE`; missing key rejected with `REJ_ROGUE`
  - Latency configured from `config.yml` `srt.latency` (default 120ms)
- **FLV-over-WebSocket** — WebSocket server now emits a proper FLV container (9-byte header + tagged frames) consumed by flv.js MSE
- **flv.js** added to dashboard (`cdn.jsdelivr.net`) for real in-browser WebSocket playback at ~300ms latency

### 🔧 Fixed

- `switchPlayerMode('ws')` was hiding `<video>` and showing canvas — flv.js attaches to `<video>`; visibility logic corrected
- `hideVideoPlayer()` now delegates to `_teardownCurrentPlayer()` — cleans up all modes (HLS, flv.js, WebRTC), resets mode buttons and `currentPlayingKey`
- `_teardownCurrentPlayer` destroys `flvPlayerInstance` directly as belt-and-suspenders

### 🔧 Go

- `datarhei/gosrt v0.12.0` added as direct dependency; `go.mod` updated to Go 1.26


## [1.2.0] - Enterprise Hardening

### 🔒 Security Fixes

- **MEDIUM**: `/api/info` no longer exposes `ffmpegPath` (full server disk path) to unauthenticated clients
- **CSP hardened**: added `'unsafe-eval'` for socket.io, `media-src 'self' blob:` for WebRTC, `Referrer-Policy: strict-origin-when-cross-origin`
- **Body size limit**: JSON requests capped at 64 KB to prevent large-payload DoS attacks
- **Recording downloads rate-limited**: `GET /api/recordings/:file` now subject to 10 req/min per IP

### ⚡ Performance & Reliability

- **General API rate limiter**: all `/api/*` routes now limited to 120 req/min per IP (public endpoints exempted)
- **Go stream manager**: fixed unbounded consumer slice growth — each `SubscribeAudio`/`SubscribeVideo` call returns an unsubscribe function; WebSocket and WebRTC servers call it on disconnect
- **Go BroadcastAudio/Video**: fixed lock-held-during-IO deadlock risk — consumer slice is copied under RLock, then callbacks are invoked without any lock held
- **Go WebRTC**: fixed single-viewer-per-stream limitation — peer connections are now keyed by unique per-connection IDs, not stream keys; multiple simultaneous viewers work correctly
- **Go WebSocket**: removed `RWMutex` in favor of `Mutex`; `BroadcastData` replaced with per-connection `sendToConn` so slow clients cannot block others

### ✨ New Endpoints

- `GET /health/deep` (authenticated): deep health check returning FFmpeg status, disk free space, active recordings, and RTMP port state
- `GET /api/streams` now paginated: `?page=1&limit=50` (max 200); response includes `total`, `pages`, `page`, `limit`

### 🔧 Frontend Fixes

- `app.js`: `MutationObserver` for `currentPlayingKey` now registered directly on the DOM element (scripts run after DOM is ready — no `DOMContentLoaded` wrapper needed)
- `app.js`: WebRTC ICE candidates now sent with `?peerId=` instead of `?key=` to match the Go server's per-peer routing
- `app.js`: WebRTC answer parsing handles the new `{ answer, peerId }` response envelope from the Go server

### 📚 Documentation

- `go-media-server/README.md` updated to reflect Phase 2 working status: RTMP ✅, WebSocket ✅, WebRTC ✅, SRT ⚠️ (skeleton)

## [1.1.0] - Phase 2

### ✨ New Features

#### Stream Recording
- `POST /api/stream/:key/record/start` — start recording a live stream to `recordings/` as MP4 (requires FFmpeg)
- `POST /api/stream/:key/record/stop` — gracefully stop the recording (writes moov atom)
- `GET /api/stream/:key/record` — get recording status for a stream
- `GET /api/recordings` — list all saved recording files
- `GET /api/recordings/:file` — download a recording (authenticated)
- Recording automatically stops when the stream ends or server shuts down
- Real-time `recordingEnded` / `recordingError` Socket.IO events
- **Recordings panel** in sidebar — see all recordings with file size, date, download button

#### API Key Management UI
- **API Keys panel** in sidebar — view all keys, last-used timestamps, create new keys inline
- Create API key modal — generates key and shows it once for copying
- **Export Analytics** buttons — download streams history as JSON or CSV directly from the dashboard

#### Analytics Export
- `GET /api/streams/export?format=json` — export all stream history as JSON
- `GET /api/streams/export?format=csv` — export all stream history as CSV with headers
- Both endpoints are authenticated and served as file downloads

#### Multi-Protocol Video Player
- Player mode bar in video player modal: **HLS** (~2s), **WebSocket** (~300ms), **WebRTC** (~50ms)
- HLS mode: existing HLS.js player (unchanged, works without Go server)
- WebSocket mode: connects to Go media server port 8084 — live binary media receive via canvas
- WebRTC mode: full SDP offer/answer negotiation with Go media server — displays stream via native `<video>` srcObject
- All modes degrade gracefully if the Go media server is not running

#### Real Stats from NMS Sessions
- Bitrate, FPS, resolution, video codec, audio codec now read from live NMS session objects
- Replaces simulated random values with real encoder data
- Recording status included in stats payload

### 🔧 Go Media Server — Phase 2 (RTMP rewrite)
- Replaced fabricated `yapingxin/gortmp` import with **`yutopp/go-rtmp`** — a real, maintained pure-Go RTMP server library
- `connHandler` implements `OnPublish`, `OnAudio`, `OnVideo`, `OnClose` from go-rtmp's handler interface
- Media from OBS/vMix flows through to `BroadcastAudio` / `BroadcastVideo` for WebSocket and WebRTC consumers
- Stream key validation reads from `../stream-keys.json` at startup
- Added `npm run go:build` and `npm run go:run` scripts to `package.json`
- Added `npm run go:build` for when Go is installed: `cd go-media-server && go mod tidy && go build -o go-media-server.exe .`


## [1.0.4] - 2026-02-10

### ✨ YouTube-Style Live Streaming + Ultra-Low Latency

#### Added
- **YouTube-style live behavior**: Always jumps to LIVE edge on stream start (not paused position)
- **"GO LIVE" button**: Red pulsing button appears when viewer falls >3 seconds behind live (was >5s)
- **Auto-reconnect**: Automatically recovers from network errors and jumps back to live
- **Auto-jump to live**: Automatically seeks to live if viewer falls >8 seconds behind (was >20s)
- **LIVE indicator**: Visual badge with opacity change when not at live edge
- **Smart reconnection**: On play after pause, auto-jumps to live if >5 seconds behind (was >15s)

#### Improved - Ultra-Low Latency Optimization
- **HLS.js buffering**: Reduced from 30-60s to 4-8s (minimal buffer = minimal latency)
- **Live sync**: Stay 1 second from edge (was 3s), max 3s behind (was 10s)
- **Seek precision**: 0.1s from absolute edge (was 0.5s)
- **Segment duration**: 1 second segments (was 2s) for faster updates
- **Playlist size**: Only 2 segments (was 3) - minimum for playback
- **Lag monitoring**: Check every 0.5s (was 1s) for faster UI response
- **No back buffer**: Old segments discarded immediately (was 90s)
- **Faster loading**: 2s timeouts, 500ms retry delays for manifest/fragments

#### Technical
- Player always prioritizes live content over buffered content
- Expected end-to-end latency: **~2-4 seconds** (was ~10-15 seconds)
- HLS flags: `independent_segments` for better seeking
- Aggressive ABR for stable low-latency playback
- Fragment prefetching enabled
- Proper cleanup of live check intervals on player close

#### Perfect For
- Real-time encoder testing (minimal delay)
- Live monitoring scenarios
- Interactive streaming applications

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
- [ ] Multi-bitrate HLS transcoding (ABR ladder)
- [ ] Docker / docker-compose single-command startup
- [ ] RTMPS (TLS-wrapped RTMP) support
- [ ] Chat overlay (Socket.IO room per stream key)
- [ ] SRT → HLS re-mux (currently SRT feeds WebSocket/WebRTC only)

---

## Version History

- **1.5.2** - Real-time latency for HLS/WS/WebRTC, remove broken WS probe, API keys printed on every startup
- **1.5.0** - RTMP/SRT protocol selector in UI, full 111-test suite (vitest + Go), helpers.js extracted
- **1.4.0** - Real WebRTC H.264 RTP packetizer + AAC-LATM, real FLV timestamps from encoder PTS
- **1.3.0** - Real SRT ingest (datarhei/gosrt, MPEG-TS demux), FLV-over-WebSocket (flv.js), player mode fixes
- **1.2.0** - Enterprise hardening: API key auth, rate limiting, CSP, Go concurrency fixes, revoke-by-ID, delete recordings
- **1.1.0** - Phase 2: recording, API key UI, multi-protocol player (HLS/WS/WebRTC), real NMS stats, analytics export
- **1.0.4** - YouTube-style live edge, ultra-low latency HLS config
- **1.0.3** - Graceful shutdown, uptime timer memory leak, corrupted JSON handling
- **1.0.2** - CVE-2025-27137 (uuid), XSS in data attrs, CSP headers, rate limiting (create/delete)
- **1.0.1** - XSS via inline onclick, FFmpeg zombie process fix, HLS segment cleanup
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
