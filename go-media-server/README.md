# Go Media Server — Phase 2 ✅

Ultra-low-latency media backend for the Local Stream Server.
Handles RTMP ingest and distributes media to WebSocket and WebRTC viewers.

## Status

| Component | Status | Notes |
|-----------|--------|-------|
| RTMP listener | ✅ Working | Full protocol via `yutopp/go-rtmp`; validates stream keys; fan-out to WebSocket/WebRTC consumers |
| SRT listener | ✅ Working | Full SRT handshake via `datarhei/gosrt`; MPEG-TS demux → PES fan-out; stream key from StreamID |
| WebSocket server | ✅ Working | FLV-over-WebSocket (flv.js MSE compatible); per-connection subscription |
| WebRTC signaling | ✅ Working | SDP offer/answer; per-peer ICE; multiple simultaneous viewers supported |
| REST API | ✅ Working | `/streams`, `/health`, `/streams/{key}` |
| Stream manager | ✅ Working | Thread-safe; consumer IDs with unsubscribe; copy-on-broadcast (no lock held during I/O) |
| Config loading | ✅ Working | `config.yml` |
| Graceful shutdown | ✅ Working | SIGTERM/SIGINT |

## Building

Go 1.21+ required.

```bash
cd go-media-server
go mod tidy      # downloads yutopp/go-rtmp, pion/webrtc, gorilla/websocket
go build -o go-media-server.exe .
.\go-media-server.exe
```

Or from the project root:
```bash
npm run go:build   # runs the above
npm run go:run     # go run . inside go-media-server/
```

## Configuration (`config.yml`)

```yaml
rtmp:
  port: 2936        # RTMP relay port (Node.js relays from ingest port 2935)
  chunk_size: 4096
  gop_cache: true
  ping_timeout: 60

srt:
  port: 9554        # Ultra-low latency SRT ingest (UDP)
  latency: 120      # ms

api:
  port: 9084        # HTTP / WebSocket (/ws) / WebRTC (/webrtc/*)
  host: "0.0.0.0"
```

## Architecture

```
OBS/Encoder
    │
    ├─ RTMP (:2935) ──► Node.js NMS Ingest
    │                        │
    │                        ├─ Relay (:2936) ──► Go Media Server
    │                        │                         │
    │                        │                         ├─ WebSocket (:9084/ws)
    │                        │                         └─ WebRTC (:9084/webrtc/*)
    │                        │
    │                        └─ Transcode ──► HLS (:9081)
    │
    ├─ SRT (:9554) ───► Go SRT Server ──► WebSocket / WebRTC
    │
    └─ Dashboard (:9000) ──► Web UI
```

## Latency Comparison

| Path | Latency | Requires Go server |
|------|---------|--------------------|
| RTMP → FFmpeg → HLS → Browser | ~2s | No (Node.js only) |
| RTMP → WebSocket (flv.js MSE) → Browser | ~300ms | Yes |
| RTMP → WebRTC → Browser | ~50ms | Yes |
| **SRT → MPEG-TS → WebSocket/WebRTC** | ~120ms | Yes |

## Running Both Servers

```bash
# Terminal 1: Node.js (RTMP ingest + HLS + Dashboard)
npm start

# Terminal 2: Go server (WebSocket/WebRTC distribution)
cd go-media-server && .\go-media-server.exe
```

Node.js runs RTMP ingest on port 2935, and relays active streams to the Go server on port 2936.
The Go server distributes live streams via WebSocket MSE and WebRTC on port 9084, and accepts direct SRT ingest on port 9554.

**SRT ingest (Go server, port 9554):**
```bash
# OBS: Settings → Stream → Service: Custom, Server: srt://YOUR_IP:9554, Stream Key: <your-key>
# FFmpeg: ffmpeg -re -i input.mp4 -f mpegts srt://YOUR_IP:9554?streamid=key=YOUR_KEY
# vMix: Add Input → Stream/External → SRT → srt://YOUR_IP:9554 with streamid key=YOUR_KEY
```

StreamID formats supported:
- `key=<uuid>` — OBS SRT / FFmpeg with explicit key
- `#!::r=live/<uuid>` — SRT Access Control (mediamtx style)
- `<uuid>` — raw UUID (FFmpeg default)

## License

MIT — same as parent project.
