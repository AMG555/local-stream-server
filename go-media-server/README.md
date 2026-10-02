# Go Media Server

Ultra-low latency streaming server written in Go with RTMP, SRT, WebSocket, and WebRTC support.

## Features

- **RTMP Ingestion** (Port 1935) - Compatible with OBS, vMix, Wirecast
- **SRT Ingestion** (Port 8554) - Low-latency UDP transport (120ms default)
- **WebSocket Streaming** (Port 8084/ws) - 0.3-0.8s latency with MSE
- **WebRTC** (Port 8084/webrtc) - 0.05-0.3s latency (peer-to-peer)
- **REST API** (Port 8084) - Stream state and health monitoring

## Architecture

```
OBS/Encoder
    │
    ├─ RTMP (:1935) ──┐
    │                 │
    └─ SRT  (:8554) ──┤
                      │
                      ▼
              Go Media Server
                      │
                      ├─ WebSocket ──▶ Browser (MSE player)
                      ├─ WebRTC ─────▶ Browser (native)
                      └─ REST API ───▶ Node.js UI
```

## Quick Start

### 1. Start the Server

```bash
cd go-media-server
.\go-media-server.exe
```

### 2. Configure OBS

**For RTMP:**
```
Server: rtmp://localhost:1935/live
Stream Key: your-stream-key
```

**For SRT (ultra-low latency):**
```
Server: srt://localhost:8554
Stream Key: streamid=your-stream-key
```

### 3. Watch the Stream

**WebSocket (MSE):**
```javascript
ws://localhost:8084/ws?key=your-stream-key
```

**WebRTC:**
```javascript
POST http://localhost:8084/webrtc/offer?key=your-stream-key
```

## Configuration

Edit `config.yml`:

```yaml
rtmp:
  port: 1935
  chunk_size: 4096
  gop_cache: true

srt:
  port: 8554
  latency: 120  # milliseconds

api:
  port: 8084
  host: "0.0.0.0"
```

## API Endpoints

### Health Check
```
GET /health
```

### List Active Streams
```
GET /streams
```

### Stream Details
```
GET /streams/{key}
```

### WebSocket Upgrade
```
WS /ws?key={stream-key}
```

### WebRTC Offer
```
POST /webrtc/offer?key={stream-key}
Content-Type: application/json

{
  "type": "offer",
  "sdp": "..."
}
```

### WebRTC ICE Candidate
```
POST /webrtc/candidate?key={stream-key}
Content-Type: application/json

{
  "candidate": "...",
  "sdpMid": "...",
  "sdpMLineIndex": 0
}
```

## Latency Comparison

| Protocol | Expected Latency | Best For |
|----------|------------------|----------|
| RTMP → HLS | 1.5-2.5s | Compatibility |
| SRT → WebSocket | 0.3-0.8s | Low latency |
| SRT → WebRTC | 0.05-0.3s | Ultra-low latency |

## Building from Source

```bash
# Install dependencies
go get gopkg.in/yaml.v3
go get github.com/gorilla/websocket

# Build
go build -o go-media-server.exe .

# Run
.\go-media-server.exe
```

## OBS Settings for Ultra-Low Latency

### SRT Configuration

**Settings → Output:**
```
Output Mode: Advanced
Encoder: NVENC P1 or x264 ultrafast
Rate Control: CBR
Bitrate: 4500 Kbps
Keyframe Interval: 1
Tune: zerolatency
```

**Settings → Stream:**
```
Service: Custom
Server: srt://localhost:8554?streamid=your-key&latency=120000
```

**Advanced SRT Options:**
```
streamid=your-stream-key
latency=120000           # 120ms in microseconds
maxbw=0                  # unlimited bandwidth
mode=caller              # OBS connects to server
```

## Development Status

### ✅ Complete
- Basic server architecture
- RTMP handshake skeleton
- SRT listener skeleton
- WebSocket server
- WebRTC signaling skeleton
- REST API
- Stream management
- Configuration loading

### 🚧 In Progress
- Full RTMP protocol parsing (needs yapingxin/gortmp)
- Full SRT protocol implementation (needs datarhei/gosrt)
- WebRTC media pipeline (needs pion/webrtc)
- H.264/AAC parsing and forwarding
- FLV to MSE conversion

### 📋 Planned
- HLS output generation
- Recording to disk
- Multiple quality transcoding
- Authentication/authorization
- Metrics and monitoring

## Integration with Node.js UI

The Node.js server queries this Go server for stream state:

```javascript
// Node.js polls Go API
const response = await fetch('http://localhost:8084/streams');
const { streams } = await response.json();
```

## License

MIT License - Same as parent project

## Contributing

This is part of the larger local-stream-server project. See main README for contribution guidelines.
