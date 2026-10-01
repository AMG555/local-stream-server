# Local Stream Server 🎥

**Test your encoders locally before going live!** Professional RTMP server for testing OBS, vMix, Wirecast, and any RTMP encoder on your local network. Validate stream settings, encoder performance, and broadcast quality without using platform stream keys.

**Perfect for:**
- Testing encoder configurations (x264, NVENC, QuickSync, AMD VCE)
- Validating stream quality before YouTube/Twitch go-live
- Encoder comparison and benchmarking
- Training and education (streaming courses, workshops)
- Development and testing of streaming applications

---

## 📖 Documentation Guide

**👉 New to streaming? Start here:**
- **[GETTING_STARTED.md](GETTING_STARTED.md)** ⭐ Complete beginner guide
  - Step-by-step installation
  - First stream in 10 minutes
  - Common issues solved
  - No coding required!

**📘 Core Documentation:**
- **[README.md](README.md)** (this file) - Overview and features
- **[OBS_SETUP_GUIDE.md](OBS_SETUP_GUIDE.md)** - Configure OBS Studio
  - Encoder comparisons (x264, NVENC, QuickSync)
  - Optimal settings for different scenarios
  - Testing different encoders
  - Troubleshooting guide

**🌐 Advanced Features:**
- **[CLOUDFLARE_TUNNEL_GUIDE.md](CLOUDFLARE_TUNNEL_GUIDE.md)** - Global access (FREE)
  - Quick start (5 min - temporary URL)
  - Full setup (20 min - permanent URLs)
  - OBS from anywhere in the world
  - Security and troubleshooting

**🎥 YouTube Live Testing:**
- **[YOUTUBE_LIVE_TESTING.md](YOUTUBE_LIVE_TESTING.md)** - Perfect your stream
  - Test before going live
  - YouTube official presets
  - Health dashboard like YouTube Studio
  - Complete testing workflow

**📋 Read in this order:**
1. GETTING_STARTED.md (absolute beginner)
2. README.md (this file - overview)
3. OBS_SETUP_GUIDE.md (configure streaming)
4. CLOUDFLARE_TUNNEL_GUIDE.md (public access)
5. YOUTUBE_LIVE_TESTING.md (YouTube preparation)

---

## ✨ Features

- 🎬 **RTMP Stream Ingestion** - Compatible with OBS, vMix, Wirecast, Streamlabs, XSplit
- 📺 **HLS Playback** - Low-latency video streaming in browser
- 🔑 **Stream Key Management** - Generate and manage unlimited test streams
- 📊 **Real-time Monitoring** - Live bitrate, FPS, resolution, dropped frames, latency
- � **Health Dashboard** - YouTube Studio-style quality indicators (Excellent/Good/Fair/Poor)
- 🎨 **Professional Interface** - Clean, responsive, keyboard-accessible UI
- 🌐 **Local & Remote Access** - Test on local network or via Cloudflare Tunnel (free)
- ⚡ **Zero Cloud Costs** - 100% self-hosted, no subscriptions
- 🔒 **Private Testing** - No public exposure, perfect for pre-production validation
- 📱 **Mobile Responsive** - Monitor from phone/tablet while streaming

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
- ✅ Teradek encoders
- ✅ LiveU units
- ✅ Any RTMP-compatible hardware

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system

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

## 🎥 YouTube Live Testing

**Test your streams exactly like YouTube Live - without going public!**

This server replicates the YouTube Live streaming workflow:
- ✅ Same RTMP ingest process
- ✅ YouTube Studio-style health dashboard  
- ✅ Official YouTube encoder presets (1080p60, 720p30, 480p30, etc.)
- ✅ Test unlimited streams without platform quotas
- ✅ Private testing - validate before going live
- ✅ Perfect for testing new encoder settings, hardware, or scenes

**Complete Testing Workflow** → See [YOUTUBE_LIVE_TESTING.md](YOUTUBE_LIVE_TESTING.md)

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

1. Start streaming from your encoder
2. Web interface shows stream as **LIVE** 🔴
3. Monitor real-time stats: bitrate, FPS, health indicators
4. Click stream card to watch HLS playback

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
- **RTMP Server**: 1935 (Stream Ingest)
- **Media Server**: 8080 (HLS Playback)

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
New-NetFirewallRule -DisplayName "Stream Server Media" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

**Mac Firewall:**
- System Preferences → Security & Privacy → Firewall
- Click "Firewall Options"
- Add Node.js to allowed apps

**Linux Firewall (UFW):**
```bash
sudo ufw allow 1935/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
```

### 📋 Quick Setup Checklist for New Devices

- [ ] Node.js installed (v14+)
- [ ] FFmpeg installed and in PATH
- [ ] Project files copied to device
- [ ] `npm install` completed successfully
- [ ] Server started with `npm start`
- [ ] Server IP address noted
- [ ] Firewall ports opened (1935, 8000, 8080)
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

1. **Check Firewall**: Allow ports 1935, 8000, and 8080
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

## 🔐 Security Notes

⚠️ **This server is designed for LOCAL NETWORK use only!**

- Never expose RTMP port (1935) to the internet
- Stream keys are UUID-based but not encrypted
- No authentication on web interface
- Intended for testing and local events only

For production streaming, use platforms like:
- YouTube Live
- Twitch
- Facebook Live
- Or professional streaming servers with proper security

## 📝 Project Structure

```
local-stream-server/
├── server.js              # Main server (Express + RTMP)
├── package.json           # Dependencies
├── public/
│   ├── index.html        # Web interface
│   ├── styles.css        # YouTube-like styling
│   └── app.js            # Frontend logic + Socket.IO
├── media/                # Created automatically (stream files)
└── README.md             # This file
```

## 🤝 Contributing

This is a local testing tool. Feel free to modify for your needs:
- Add authentication
- Custom themes
- Recording features
- Chat integration
- Multi-bitrate streaming

## 📄 License

MIT License - Free to use and modify

## 🙏 Credits

Built with:
- [Node.js](https://nodejs.org/)
- [node-media-server](https://github.com/illuspas/Node-Media-Server)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [HLS.js](https://github.com/video-dev/hls.js/)

## 💬 Support

For issues or questions:
1. Check the Troubleshooting section
2. Verify FFmpeg installation
3. Check firewall settings
4. Ensure all devices on same network

---

**Happy Streaming! 🎥✨**

Made for encoder testing and local streaming experiments.
