# Go Media Server — Phase 2 ✅

Ultra-low-latency media backend for the Local Stream Server.
Handles RTMP ingest and distributes media to WebSocket and WebRTC viewers.

## Status

| Component | Status | Notes |
|-----------|--------|-------|
| RTMP listener | ✅ Working | Full protocol via `yutopp/go-rtmp`; validates stream keys; fan-out to WebSocket/WebRTC consumers |
| WebSocket server | ✅ Working | Per-connection subscription with proper unsubscribe on disconnect |
| WebRTC signaling | ✅ Working | SDP offer/answer; per-peer ICE; multiple simultaneous viewers supported |
| REST API | ✅ Working | `/streams`, `/health`, `/streams/{key}` |
| Stream manager | ✅ Working | Thread-safe; consumer IDs with unsubscribe; copy-on-broadcast (no lock held during I/O) |
| SRT listener | ⚠️ Skeleton | Listens on UDP but SRT protocol not implemented |
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
  port: 1935        # RTMP ingest (matches Node.js)
  chunk_size: 4096
  gop_cache: true
  ping_timeout: 60

srt:
  port: 8554        # UDP (skeleton only)
  latency: 120      # ms

api:
  port: 8084        # HTTP: /streams, /health, /ws, /webrtc/*
  host: "0.0.0.0"
```

## Architecture

```
OBS/Encoder
    │
    ├─ RTMP (:1935) ─────► Go RTMP Server
    │                           │
    │                           ├─ BroadcastVideo/Audio
    │                           │
    │                  ┌────────┴──────────┐
    │                  │                   │
    │            WebSocket              WebRTC
    │         (:8084/ws)          (:8084/webrtc/*)
    │               │                    │
    │           Browser (MSE)      Browser (native)
    │           ~300ms latency      ~50ms latency
    │
    └─ REST API (:8084) ──► Node.js dashboard + health

Node.js server (port 1935, 8000, 8081) continues to handle
HLS transcoding via FFmpeg for the standard ~2s latency path.
```

## Latency Comparison

| Path | Latency | Requires Go server |
|------|---------|--------------------|
| RTMP → FFmpeg → HLS → Browser | ~2s | No (Node.js only) |
| RTMP → WebSocket → Browser | ~300ms | Yes |
| RTMP → WebRTC → Browser | ~50ms | Yes |

## Running Both Servers

```bash
# Terminal 1: Node.js (RTMP ingest + HLS + Dashboard)
npm start

# Terminal 2: Go server (WebSocket/WebRTC distribution)
cd go-media-server && .\go-media-server.exe
```

The Node.js and Go servers share the same RTMP port (1935). 
**Do not run both simultaneously unless you change one of the RTMP ports.**
The intended split: Node.js handles RTMP + HLS; the Go server handles WebSocket + WebRTC only.
In that split, set Go's RTMP port to something unused (e.g. 1936) and route OBS to Node.js.

## License

MIT — same as parent project.
