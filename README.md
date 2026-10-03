# Local Stream Server 🎥

**Test your encoders locally before going live on ANY platform!** Professional RTMP server for testing OBS, vMix, Wirecast, and any RTMP encoder. Validate stream settings, encoder performance, and broadcast quality without burning platform stream keys.

**Perfect for testing before streaming to:**
- ✅ YouTube Live
- ✅ Facebook Live  
- ✅ Twitch
- ✅ Instagram Live
- ✅ LinkedIn Live
- ✅ Twitter/X Live
- ✅ TikTok Live
- ✅ Custom RTMP servers

**Use cases:**
- Test encoder configurations (x264, NVENC, QuickSync, AMD VCE)
- Validate stream quality before going l
ive on any platform
- Encoder comparison and benchmarking
- Training and education (streaming courses, workshops)
- Development and testing of streaming pipelines/middleware

---

## 📖 Documentation Guide

**⚠️ COMMON ISSUE: Video Not Playing? [Jump to solution](#%EF%B8%8F-video-playback-not-working)**

**👉 New to streaming? Start here:**
- **[GETTING_STARTED.md](GETTING_STARTED.md)** ⭐ Complete beginner guide
  - Step-by-step installation
  - First stream in 10 minutes
  - Common issues solved
  - No coding required!

**📘 Core Documentation:**
- **[README.md](README.md)** (this file) - Overview and features
- **[OBS_SETUP_GUIDE.md](OBS_SETUP_GUIDE.md)** - Configure OBS Studio with ultra-low latency
  - Complete setup for all encoders (NVENC, x264, QuickSync, AMF)
  - Ultra-low latency settings (1.5-2.5s end-to-end)
  - Optimal settings for different scenarios
  - Testing and troubleshooting guide
- **[ENCODER_COMPARISON.md](ENCODER_COMPARISON.md)** - Comprehensive encoder guide
  - NVENC vs x264 vs QuickSync vs AMF vs VideoToolbox
  - Performance metrics and quality comparison
  - Decision matrix and recommendations
  - Advanced tuning for each encoder

**🌐 Advanced Features:**
- **[CLOUDFLARE_TUNNEL_GUIDE.md](CLOUDFLARE_TUNNEL_GUIDE.md)** - Global access (FREE)
  - Quick start (5 min - temporary URL)
  - Full setup (20 min - permanent URLs)
  - OBS from anywhere in the world
  - Security and troubleshooting

**🎥 Platform Testing:**
- **[PLATFORM_TESTING_GUIDE.md](PLATFORM_TESTING_GUIDE.md)** - Go live on any platform
  - YouTube, Facebook, Twitch, Instagram, TikTok, LinkedIn, Twitter/X
  - Platform-specific settings and requirements
  - Health dashboard testing workflow
  - Multi-platform comparison table

**📋 Read in this order:**
1. GETTING_STARTED.md (absolute beginner)
2. README.md (this file - overview)
3. OBS_SETUP_GUIDE.md (configure streaming)
4. CLOUDFLARE_TUNNEL_GUIDE.md (public access)
5. PLATFORM_TESTING_GUIDE.md (test for any platform)

---

## ✨ Features

- 🎬 **Multiple Protocol Support** - RTMP (1935), SRT (8554), WebSocket, WebRTC
- 📺 **Multiple Playback Options** - HLS (1.5-2.5s), WebSocket+MSE (0.3-0.8s), WebRTC (0.05-0.3s)
- 🔑 **Stream Key Management** - Generate and manage unlimited test streams
- 📊 **Real-time Monitoring** - Live bitrate, FPS, resolution, dropped frames, actual latency
- 🏥 **Health Dashboard** - YouTube Studio-style quality indicators (Excellent/Good/Fair/Poor)
- 🎨 **Professional Interface** - Clean, responsive, keyboard-accessible UI
- 🌐 **Local & Remote Access** - Test on local network or via Cloudflare Tunnel (free)
- ⚡ **Ultra-Low Latency** - SRT + WebRTC for 50-300ms end-to-end latency
- 🏗️ **Dual Architecture** - Node.js UI + Go media server for optimal performance
- 💯 **Production Ready** - 27 security/performance bugs fixed, enterprise-grade
- ⚡ **Zero Cloud Costs** - 100% self-hosted, no subscriptions
- 🔒 **Private Testing** - No public exposure, perfect for pre-production validation
- 📱 **Mobile Responsive** - Monitor from phone/tablet while streaming

**Protocol Support:**
- ✅ **RTMP** (Real-Time Messaging Protocol) - Port 1935 (Node.js + Go)
- ✅ **SRT** (Secure Reliable Transport) - Port 8554 (Go server, 120ms latency)
- ✅ **WebRTC** - Ultra-low latency peer-to-peer (Go server, 50-300ms)
- ✅ **WebSocket** - Low-latency streaming with MSE (Go server, 300-800ms)

All major platforms (YouTube, Twitch, Facebook) support RTMP. SRT and WebRTC provide lower latency options for local testing.

## 🎯 Supported Encoders

**Desktop Applications:**
- ✅ OBS Studio (free, open-source)
- ✅ Streamlabs Desktop
- ✅ XSplit Broadcaster
- ✅ vMix
- ✅ Wirecast
- ✅ FFmpeg (command line)

**Mobile Apps:**
- ✅ Larix Broadcaster (iOS/Android)
- ✅ CameraFi Live (Android)

**Hardware Encoders:**
- ✅ Teradek encoders (RTMP mode)
- ✅ LiveU units (RTMP mode)
- ✅ Any RTMP-compatible hardware

**Note:** SRT and WebRTC encoders require different server software (MediaMTX, Nimble Streamer, etc.).

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- FFmpeg (optional but recommended for HLS playback)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
npm start
```

3. **Access the web interface:**
```
http://localhost:8000
```

The server will display your local IP address. Use this to access from other devices on the same network.

---

## ⚠️ Video Playback Not Working?

**If you see a loading spinner when trying to watch streams in the browser:**

**Reason:** FFmpeg is not installed. FFmpeg is needed for HLS transcoding (browser playback).

**What DOES work without FFmpeg:**
- ✅ RTMP streaming from OBS/vMix/Wirecast (works!)
- ✅ Stream stats and health monitoring (works!)
- ✅ Stream key management (works!)
- ✅ Watching with VLC Player (works!)
- ✅ Watching with OBS Preview (works!)

**What NEEDS FFmpeg:**
- ❌ Browser playback (HTML5 video player)

**Quick FFmpeg Install:**
```bash
# Windows - Run installer script (EASIEST)
install-ffmpeg.bat

# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

**Windows Manual Install:**
1. Download: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH (see: https://www.java.com/en/download/help/path.html)
4. Restart terminal/PowerShell
5. Restart server: `npm start`
6. Refresh browser

**After installing FFmpeg:**
- Restart the server
- Refresh the web interface
- Browser playback will now work!

### 🌐 Public Access with Cloudflare Tunnel (FREE)

Want to access from anywhere? Use Cloudflare Tunnel!

**Quick Start (5 minutes):**
```bash
# Windows
start-tunnel-quick.bat

# Mac/Linux
npx cloudflared tunnel --url http://localhost:8000
```

Get a public URL like `https://random-words.trycloudflare.com` - share with anyone!

**Full Setup** → See [CLOUDFLARE_TUNNEL_GUIDE.md](CLOUDFLARE_TUNNEL_GUIDE.md)

---

## 🎥 Multi-Platform Streaming Testing

**Test streams for YouTube, Facebook, Twitch, Instagram - all use RTMP!**

This server replicates the streaming workflow of ANY RTMP platform:
- ✅ Same RTMP ingest process (universal protocol)
- ✅ Platform-like health dashboard (bitrate, FPS, dropped frames)
- ✅ Platform encoder presets (YouTube 1080p60, Facebook 720p30, Twitch presets)
- ✅ Test unlimited streams without burning platform stream keys
- ✅ Private testing - validate before going live
- ✅ Perfect for testing new encoder settings, hardware, or scenes

**Why this works for all platforms:** YouTube, Facebook, Twitch, Instagram, TikTok, LinkedIn all use RTMP ingest with the same protocol. If your encoder settings are stable here with good bitrate and zero dropped frames → they'll work on ANY platform.

**Platform-Specific Testing Guides:**
- **All Platforms** → See [PLATFORM_TESTING_GUIDE.md](PLATFORM_TESTING_GUIDE.md)
  - YouTube Live, Facebook Live, Twitch
  - Instagram Live, TikTok Live, LinkedIn Live, Twitter/X
  - Platform comparison table and requirements

---

## 🎯 Use Cases

**Content Creators:**
- Test stream quality before YouTube/Twitch broadcast
- Compare encoder settings (x264 vs NVENC vs QuickSync)
- Validate new scenes, overlays, and transitions
- Practice streaming workflow without public exposure

**Businesses & Organizations:**
- Pre-production testing for corporate events
- Encoder training for production teams
- Quality validation for client deliverables
- Conference and webinar setup testing

**Developers:**
- Test streaming integrations and APIs
- Validate RTMP client implementations
- Develop streaming applications locally
- Debug encoder issues without platform dependencies

**Educators:**
- Teach streaming concepts and best practices
- Demonstrate encoder configurations
- Live production training courses
- Student practice environments

## 📖 How to Use

### Step 1: Create a Stream Key

1. Open web interface: `http://localhost:8000`
2. Click **"New Stream Key"** button
3. Enter stream title (e.g., "Encoder Test 1")
4. Copy generated RTMP URL and Stream Key

### Step 2: Configure Your Encoder

**OBS Studio:**
1. Settings → Stream
2. Service: `Custom`
3. Server: `rtmp://YOUR_LOCAL_IP:1935/live`
4. Stream Key: `[your generated key]`

**vMix:**
1. Settings → Outputs → Stream
2. Destination: `Custom RTMP Server`
3. URL: `rtmp://YOUR_LOCAL_IP:1935/live/[your-key]`

**Wirecast:**
1. Output → Output Settings
2. Destination: `RTMP Server`
3. Address: `rtmp://YOUR_LOCAL_IP:1935/live`
4. Stream: `[your generated key]`

**See [OBS_SETUP_GUIDE.md](OBS_SETUP_GUIDE.md) for detailed encoder comparisons**

### Step 3: Start Streaming & Monitor

1. **Start streaming** from your encoder (OBS → "Start Streaming")
2. **Web interface shows stream as LIVE** 🔴 with real-time stats
3. **Monitor health dashboard**: bitrate, FPS, dropped frames, connection quality

### Step 4: Watch Your Stream

**📊 View Stats (Works Without FFmpeg):**
- Click "Live Streams" tab
- See real-time metrics and health indicators

**🎥 Watch Video Playback:**

**Option A: Browser Playback** (Requires FFmpeg)
- Install FFmpeg: Run `install-ffmpeg.bat` (Windows) or see README
- Restart server: `npm start`
- Click stream card in web interface
- HLS player opens in browser

**Option B: VLC Player** (No FFmpeg Needed)
- Open VLC → Media → Open Network Stream
- Enter: `rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY`
- Click Play

**Option C: OBS Preview** (No FFmpeg Needed)
- Open second OBS instance
- Add "Media Source"
- URL: `rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY`
- Uncheck "Local File"

**Option D: FFplay** (If FFmpeg installed)
```bash
ffplay rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY
```

## 🎮 OBS Settings for Best Quality

### Output Settings
- **Output Mode**: Advanced
- **Encoder**: x264 or NVENC (GPU)
- **Rate Control**: CBR
- **Bitrate**: 2500-6000 kbps
- **Keyframe Interval**: 2 seconds
- **Preset**: veryfast to medium
- **Profile**: high
- **Tune**: zerolatency

### Video Settings
- **Base Resolution**: 1920x1080
- **Output Resolution**: 1920x1080
- **Downscale Filter**: Lanczos
- **FPS**: 30 or 60

### Advanced Settings
- **Process Priority**: High
- **Renderer**: Direct3D 11

## 🔧 Configuration

### Server Ports

- **HTTP Server**: 8000 (Web Interface)
- **RTMP Server**: 1935 (Stream Ingest — Node.js)
- **Media Server**: 8081 (HLS Playback — Node.js)
- **SRT Server**: 8554 (Ultra-low latency ingest — Go)
- **Go API**: 8084 (WebSocket/WebRTC/streams — Go)

### Customize Ports

Edit `server.js`:

```javascript
const HTTP_PORT = 8000;
const RTMP_PORT = 1935;
```

## 📱 Using on New Devices (Complete Guide)

### 🖥️ Running on a New Computer/Device

#### Option 1: Copy the Project Folder

1. **Copy the entire project folder** to your new device:
   - Via USB drive, network share, or cloud storage
   - Copy all files including `node_modules/` folder (faster)
   - OR copy without `node_modules/` and run `npm install` on new device

2. **Install Node.js** (if not already installed):
   - Download from: https://nodejs.org/
   - Install version 14 or higher
   - Verify: Open terminal/PowerShell and run `node --version`

3. **Install FFmpeg** (if not already installed):
   - **Windows**: 
     - Download from https://ffmpeg.org/download.html
     - Extract to `C:\ffmpeg`
     - Add `C:\ffmpeg\bin` to System PATH
     - OR update `server.js` line 52 with full FFmpeg path
   - **Mac**: Run `brew install ffmpeg` in Terminal
   - **Linux**: Run `sudo apt install ffmpeg` in Terminal

4. **Navigate to project folder**:
   ```bash
   cd path/to/local-stream-server
   ```

5. **Install dependencies** (if you didn't copy `node_modules/`):
   ```bash
   npm install
   ```

6. **Start the server**:
   ```bash
   npm start
   ```

7. **Note the IP address** shown in terminal (e.g., `192.168.1.100`)

8. **Access from any device on same WiFi**:
   - Web Interface: `http://192.168.1.100:8000`
   - RTMP Server: `rtmp://192.168.1.100:1935/live`

#### Option 2: Fresh Install on New Device

1. **Install Node.js and FFmpeg** (see steps above)

2. **Copy only these files** to new device:
   ```
   - server.js
   - package.json
   - public/ (entire folder)
   - README.md
   - OBS_SETUP_GUIDE.md
   ```

3. **Open terminal** in project folder

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start server**:
   ```bash
   npm start
   ```

### 📱 Accessing from Phones/Tablets (No Installation)

**To watch streams from mobile devices:**

1. **Ensure mobile device is on SAME WiFi** as streaming server
2. **Get server IP address** from terminal where server is running
3. **Open mobile browser** (Safari, Chrome, Firefox)
4. **Navigate to**: `http://SERVER_IP:8000`
   - Example: `http://192.168.1.100:8000`
5. **Click any live stream** to watch
6. **Works on**:
   - iPhone/iPad (Safari)
   - Android phones/tablets (Chrome)
   - Any device with modern browser

### 🎮 Streaming FROM Other Devices

**To stream from a different computer/device using OBS:**

1. **Install OBS Studio** on that device
2. **Ensure device is on SAME WiFi** as streaming server
3. **Get server IP address** (shown when server starts)
4. **In OBS Settings → Stream**:
   ```
   Service: Custom
   Server: rtmp://SERVER_IP:1935/live
   Stream Key: [get from web interface at http://SERVER_IP:8000]
   ```
5. **Start Streaming** in OBS

### 🌐 Finding Your Server IP Address

**The server shows IP when starting**, but you can also find it manually:

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

**Mac/Linux:**
```bash
ifconfig
# OR
ip addr show
```
Look for "inet" address (not 127.0.0.1)

**Quick way - In browser on server computer:**
- Visit: https://www.whatismyip.com/ (shows external IP - not needed)
- OR check router's connected devices page for local IP

### 🔥 Firewall Setup (If Connections Fail)

**Windows Firewall:**
```powershell
# Allow RTMP port
New-NetFirewallRule -DisplayName "Stream Server RTMP" -Direction Inbound -LocalPort 1935 -Protocol TCP -Action Allow

# Allow HTTP port
New-NetFirewallRule -DisplayName "Stream Server HTTP" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Allow Media port
New-NetFirewallRule -DisplayName "Stream Server Media" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow

# Allow SRT port (UDP — Go media server)
New-NetFirewallRule -DisplayName "Stream Server SRT" -Direction Inbound -LocalPort 8554 -Protocol UDP -Action Allow
```

**Mac Firewall:**
- System Preferences → Security & Privacy → Firewall
- Click "Firewall Options"
- Add Node.js to allowed apps

**Linux Firewall (UFW):**
```bash
sudo ufw allow 1935/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 8554/udp  # SRT
```

### 📋 Quick Setup Checklist for New Devices

- [ ] Node.js installed (v14+)
- [ ] FFmpeg installed and in PATH (for HLS recording)
- [ ] Go installed (v1.21+) and binary built: `npm run go:build`
- [ ] Project files copied to device
- [ ] `npm install` completed successfully
- [ ] Node.js server started: `npm start`
- [ ] Go media server started: `npm run go:run`
- [ ] Server IP address noted
- [ ] Firewall ports opened (1935 TCP, 8000 TCP, 8081 TCP, 8554 UDP)
- [ ] All devices on same WiFi network
- [ ] Web interface accessible from browser

### 🎯 Common Scenarios

#### Scenario 1: Stream from Laptop, Watch on Phone
1. Run server on laptop: `npm start`
2. Note laptop IP: `192.168.1.50`
3. Configure OBS on laptop with stream key
4. On phone browser: `http://192.168.1.50:8000`
5. Watch live stream on phone

#### Scenario 2: Server on Desktop, Stream from Laptop
1. Run server on desktop: `npm start`
2. Note desktop IP: `192.168.1.100`
3. On laptop, install OBS
4. Laptop browser: `http://192.168.1.100:8000` → Create stream key
5. Laptop OBS: Use `rtmp://192.168.1.100:1935/live` + stream key
6. Watch on desktop browser or any other device

#### Scenario 3: Multiple Viewers
1. Run server on one device
2. Multiple people on same WiFi open: `http://SERVER_IP:8000`
3. Everyone can watch all live streams
4. No limit on viewers (depends on server hardware)

#### Scenario 4: New Computer Setup (First Time)
1. Transfer project folder to new computer
2. Install Node.js: https://nodejs.org/
3. Install FFmpeg (see platform-specific instructions above)
4. Open PowerShell/Terminal in project folder
5. Run: `npm install` (wait for completion)
6. Run: `npm start`
7. Access: `http://localhost:8000` on same computer
8. Access: `http://YOUR_IP:8000` from other devices

### ⚠️ Important Network Notes

- **Same WiFi Required**: All devices MUST be on same WiFi network
- **Server Must Keep Running**: Don't close terminal window
- **IP Can Change**: If server device restarts, IP might change
- **Router Settings**: Some routers isolate devices (AP isolation) - disable this
- **VPN Issues**: Disconnect VPN if devices can't connect
- **Mobile Hotspot**: Works but may have NAT restrictions

### 🚀 Running Server Permanently

**Keep server running 24/7:**

**Using PM2 (Process Manager):**
```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start server.js --name stream-server

# Auto-start on boot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs stream-server
```

**Using Windows Service:**
- Use tools like NSSM (Non-Sucking Service Manager)
- Runs server as Windows service

**Using systemd (Linux):**
```bash
# Create service file
sudo nano /etc/systemd/system/stream-server.service

# Enable and start
sudo systemctl enable stream-server
sudo systemctl start stream-server
```

## 🎯 Use Cases

### Encoder Testing
- Test different bitrates and encoding settings
- Measure actual latency in your local network
- Compare different encoders (x264, NVENC, QuickSync)

### Production Rehearsal
- Practice live streaming setup without going live
- Test scenes, transitions, and overlays
- Train new streamers in safe environment

### Local Events
- Stream to devices on same network without internet
- Perfect for LAN parties, conferences, or local events
- No bandwidth costs or cloud dependencies

### Development
- Test streaming integrations and APIs
- Develop custom streaming applications
- Build custom overlays and extensions

## 🛠️ Troubleshooting

### Stream Not Connecting

1. **Check Firewall**: Allow ports 1935, 8000, 8081 (TCP) and 8554 (UDP for SRT)
2. **Verify Stream Key**: Ensure it exists in the web interface
3. **Check FFmpeg**: Ensure FFmpeg is installed and in PATH

### No Video Playback

1. **Browser Support**: Use Chrome, Firefox, or Safari
2. **HLS Support**: Player uses HLS.js for compatibility
3. **Wait for GOP**: First frame may take 2-6 seconds

### High Latency

1. **OBS Settings**: Set keyframe interval to 1-2 seconds
2. **Tune**: Use "zerolatency" tune in OBS
3. **Bitrate**: Lower bitrate for better latency
4. **Network**: Check WiFi signal strength

### FFmpeg Not Found

**Windows:**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH
4. Update `server.js`: `ffmpeg: 'C:/ffmpeg/bin/ffmpeg.exe'`

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

## 📊 API Endpoints

### Create Stream Key
```http
POST /api/stream/create
Content-Type: application/json

{
  "title": "My Stream"
}
```

### Get All Streams
```http
GET /api/streams
```

### Get Active Streams
```http
GET /api/streams/active
```

### Get Stream Info
```http
GET /api/stream/:key
```

### Delete Stream Key
```http
DELETE /api/stream/:key
```

### Server Info
```http
GET /api/info
```

## 🔌 Real-time Events (Socket.IO)

```javascript
// Stream started
socket.on('streamStarted', (data) => {
  console.log(`${data.title} is live!`);
});

// Stream ended
socket.on('streamEnded', (data) => {
  console.log(`Stream ${data.key} ended`);
});

// Stream statistics
socket.on('streamStats', (data) => {
  console.log(`Bitrate: ${data.stats.bitrate} kbps`);
});
```

## 🧪 Testing Different Encoders

### OBS Studio
```
Server: rtmp://YOUR_IP:1935/live
Key: [your-stream-key]
```

### Streamlabs OBS
Same as OBS Studio - use Custom RTMP Server

### FFmpeg Command Line
```bash
ffmpeg -re -i input.mp4 -c:v libx264 -preset veryfast \
  -tune zerolatency -c:a aac -b:a 128k -f flv \
  rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY
```

### VLC Media Player
```
Media → Stream → Add File
Stream → Next → New Destination: RTMP
Address: rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY
```

## 📈 Performance Tips

### Server Performance
- Run on wired ethernet for best stability
- Use SSD for media storage
- Allocate sufficient RAM (4GB minimum)
- Close unnecessary applications

### Network Performance
- Use 5GHz WiFi when possible
- Keep devices close to router
- Avoid network congestion during tests
- Use QoS settings on router if available

### Encoding Performance
- Use hardware encoding (NVENC, QuickSync) for better performance
- Lower resolution/framerate if CPU struggles
- Monitor CPU usage in Task Manager
- Adjust OBS preset based on CPU performance

## 🔐 Security

**Authentication** is required for all API endpoints. An API key (`sk_...`) is auto-generated on first run and printed to the console. All subsequent requests need `Authorization: Bearer <key>`.

**Built-in hardening:**
- ✅ API key authentication on all `/api/*` routes
- ✅ Rate limiting: 120 req/min general, 10 req/min for downloads, 10 creates/15min
- ✅ Body size capped at 64 KB (DoS prevention)
- ✅ UUID-only stream keys (no guessable IDs)
- ✅ Input sanitization (titles, file paths, stream keys)
- ✅ CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers
- ✅ Path traversal guard on recording downloads
- ✅ 0 npm audit vulnerabilities

**Network posture:**
- Designed for LAN / Cloudflare Tunnel. Do not expose RTMP port 1935 to the open internet without a firewall rule.
- RTMP is unencrypted by default. Use Cloudflare Tunnel or an RTMPS proxy for public deployments.

## 📊 API Reference

All endpoints require `Authorization: Bearer <api-key>` except `/api/info` and `/health`.

### Stream Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stream/create` | Create stream key `{ title }` |
| `GET` | `/api/streams` | List all streams (paginated: `?page=1&limit=50`) |
| `GET` | `/api/streams/active` | Live streams only |
| `GET` | `/api/stream/:key` | Stream info + live stats |
| `DELETE` | `/api/stream/:key` | Delete stream key |
| `GET` | `/api/streams/export` | Export history (`?format=json\|csv`) |

### Recording
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stream/:key/record/start` | Start recording to `recordings/` (FFmpeg) |
| `POST` | `/api/stream/:key/record/stop` | Stop recording (writes MP4 moov atom) |
| `GET` | `/api/stream/:key/record` | Recording status + duration |
| `GET` | `/api/recordings` | List saved recordings |
| `GET` | `/api/recordings/:file` | Download recording |
| `DELETE` | `/api/recordings/:file` | Delete recording |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/keys` | List keys (redacted previews + IDs) |
| `POST` | `/api/keys` | Create key `{ name }` → returns full key once |
| `DELETE` | `/api/keys/id/:id` | Revoke key by UUID (browser-safe) |
| `DELETE` | `/api/keys/:key` | Revoke key by full value (CLI) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic liveness check (public) |
| `GET` | `/health/deep` | FFmpeg, disk, recordings, RTMP (authenticated) |
| `GET` | `/api/info` | Server IP, ports, FFmpeg status (public) |

## 📝 Project Structure

```
local-stream-server/
├── server.js              # Express + RTMP + all API endpoints
├── auth.js                # API key middleware, generate, revoke, list
├── helpers.js             # Pure utils: isValidUUID, sanitizeTitle, safeArgs, redactStreamKey
├── package.json
├── vitest.config.mjs      # Vitest configuration
├── public/
│   ├── index.html         # Dashboard UI (RTMP/SRT protocol selector, multi-mode player)
│   ├── styles.css
│   └── app.js             # Frontend: HLS/WS/WebRTC player, recordings, API keys
├── tests/                 # Node.js test suite (vitest + supertest)
│   ├── helpers.test.js    # 27 unit tests for helper functions
│   ├── auth.test.js       # 16 unit tests for auth module
│   └── api.test.js        # 24 API integration tests
├── go-media-server/       # Go media server — SRT + WebSocket + WebRTC + RTMP
│   ├── main.go
│   ├── config.yml         # RTMP:1935, SRT:8554, API:8084
│   └── pkg/
│       ├── rtmp/          # yutopp/go-rtmp handler + tests
│       ├── srt/           # datarhei/gosrt — real SRT with MPEG-TS demux + tests
│       ├── stream/        # Thread-safe fan-out manager + tests + benchmarks
│       ├── websocket/     # gorilla/websocket FLV muxer + tests
│       ├── webrtc/        # pion/webrtc H.264 FU-A + AAC-LATM + tests
│       ├── api/           # REST + CORS middleware + tests
│       └── config/
├── recordings/            # MP4 recordings (gitignored)
├── media/                 # HLS segments (gitignored)
├── CHANGELOG.md
├── SECURITY.md
└── README.md
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Some good first areas:

- **Multi-bitrate HLS** — add ABR ladder (1080p/720p/480p) via FFmpeg `-map` outputs
- **WHIP ingest** — WebRTC-HTTP Ingestion Protocol (publish from browser, no OBS needed)
- **Stream thumbnails** — FFmpeg periodic JPEG snapshots for stream card previews
- **Docker** — `Dockerfile` + `docker-compose.yml` for single-command startup
- **Chat overlay** — Socket.IO room per stream key

## 📄 License

MIT License - Free to use and modify

## 🙏 Credits

Built with:

**Node.js stack:**
- [Express](https://expressjs.com/) — HTTP server and middleware
- [node-media-server](https://github.com/illuspas/Node-Media-Server) — RTMP ingest + HLS transcode
- [Socket.IO](https://socket.io/) — real-time events
- [HLS.js](https://github.com/video-dev/hls.js/) — in-browser HLS playback
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) — API rate limiting

**Go stack:**
- [yutopp/go-rtmp](https://github.com/yutopp/go-rtmp) — pure-Go RTMP server library
- [datarhei/gosrt](https://github.com/datarhei/gosrt) — pure-Go SRT (v0.12.0, Windows-compatible)
- [pion/webrtc](https://github.com/pion/webrtc) — WebRTC peer connection + ICE
- [pion/rtp](https://github.com/pion/rtp) — H.264 FU-A packetization + AAC-LATM wrapping
- [gorilla/websocket](https://github.com/gorilla/websocket) — WebSocket + FLV muxer

## 💬 Support

For issues or questions:
1. Check the Troubleshooting section
2. Verify FFmpeg installation
3. Check firewall settings
4. Ensure all devices on same network

---

**Happy Streaming! 🎥✨**

Made for encoder testing and local streaming experiments.
