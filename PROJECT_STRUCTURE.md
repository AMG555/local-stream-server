# Project Structure 📁

Visual guide to all files in the Local Stream Server project.

## 📂 File Tree

```
local-stream-server/
│
├── 📘 Documentation (Start Here!)
│   ├── GETTING_STARTED.md        ⭐ NEW USER? READ THIS FIRST!
│   ├── README.md                  📖 Project overview & features
│   ├── OBS_SETUP_GUIDE.md        🎥 Configure OBS Studio
│   ├── CLOUDFLARE_TUNNEL_GUIDE.md 🌐 Global access setup
│   ├── PLATFORM_TESTING_GUIDE.md  🎬 Multi-platform testing
│   └── PROJECT_STRUCTURE.md       📁 This file
│
├── ⚙️ Configuration Files
│   ├── package.json               📦 Node.js dependencies
│   ├── package-lock.json          🔒 Locked dependency versions
│   ├── .gitignore                 🚫 Git ignore rules
│   └── cloudflare-tunnel-config.yml 🌐 Tunnel configuration
│
├── 🖥️ Server Code
│   └── server.js                  💻 Main server application
│
├── 🌐 Web Interface (public/)
│   ├── index.html                 📄 Main webpage
│   ├── styles.css                 🎨 YouTube-like styling
│   └── app.js                     ⚡ Frontend JavaScript
│
├── 🚀 Quick Start Scripts (Windows)
│   ├── install-cloudflared.bat           🔧 Install tunnel tool
│   ├── setup-tunnel.bat                  ⚙️ Configure tunnel (once)
│   ├── start-tunnel-quick.bat            ⚡ Quick public URL
│   └── start-tunnel-persistent.bat       🌐 Start configured tunnel
│
├── 💾 Data Storage (auto-created)
│   ├── media/                     📹 Stream files (while live)
│   ├── stream-keys.json          🔑 Saved stream keys
│   └── node_modules/             📚 Installed packages
│
└── 🔧 System Files
    └── .cloudflared/             🔐 Tunnel credentials (created by setup)
```

---

## 📘 Documentation Files Explained

### For Absolute Beginners:

#### GETTING_STARTED.md ⭐
**Read this first if you've never done streaming before!**
- Install Node.js step-by-step
- Run server in 10 minutes
- Connect OBS for first stream
- Common problems solved
- No technical knowledge required

**When to read:** Before anything else!

---

### Core Documentation:

#### README.md
**Project overview and feature list**
- What this tool does
- Complete feature list
- Quick start commands
- API documentation
- Troubleshooting basics

**When to read:** After GETTING_STARTED, to understand features

#### OBS_SETUP_GUIDE.md
**Complete OBS Studio configuration guide**
- How to configure OBS settings
- Compare encoders (x264, NVENC, QuickSync, AMF)
- Optimal settings for different scenarios
- Testing different encoders
- Troubleshooting OBS issues

**When to read:** When setting up OBS Studio

---

### Advanced Features:

#### CLOUDFLARE_TUNNEL_GUIDE.md
**Make your server accessible from anywhere (FREE)**
- Quick start: Get public URL in 30 seconds
- Full setup: Permanent custom URLs
- OBS can connect from any network
- Security best practices
- Complete troubleshooting

**When to read:** When you want global access

#### PLATFORM_TESTING_GUIDE.md
**Test and go live on any streaming platform**
- YouTube, Facebook, Twitch, Instagram, TikTok, LinkedIn, Twitter/X
- Platform-specific requirements and settings
- Health dashboard testing workflow
- Multi-platform comparison table
- Platform-specific presets and limitations

**When to read:** Before going live on any platform

#### PROJECT_STRUCTURE.md
**Understanding project files**
- What each file does
- Which files to edit
- Which files to ignore
- Project organization

**When to read:** When you want to understand the project

---

## ⚙️ Configuration Files

### package.json
**Node.js project configuration**
```json
{
  "name": "local-stream-server",
  "dependencies": {
    "express": "HTTP server",
    "node-media-server": "RTMP server",
    "socket.io": "Real-time updates",
    "uuid": "Stream key generation"
  }
}
```
**Don't edit unless you know what you're doing!**

### cloudflare-tunnel-config.yml
**Cloudflare Tunnel settings**
```yaml
tunnel: local-stream-server
ingress:
  - hostname: stream.yourdomain.com  # Web interface
  - hostname: rtmp.yourdomain.com    # RTMP for OBS
  - hostname: media.yourdomain.com   # HLS playback
```
**Edit after running setup-tunnel.bat**

### .gitignore
**Files to exclude from git**
- node_modules/ (too large)
- media/ (temporary stream files)
- stream-keys.json (private data)

**Don't edit this file**

---

## 🖥️ Server Code

### server.js
**Main server application (Node.js)**

**What it does:**
- Runs RTMP server (port 1935) for OBS
- Runs HTTP server (port 8000) for web interface
- Runs Media server (port 8080) for HLS streams
- Manages stream keys
- Handles real-time updates via Socket.IO
- Auto-detects FFmpeg
- Saves stream keys to file

**Key sections:**
```javascript
// FFmpeg detection and error handling
function detectFFmpeg() { ... }

// RTMP Events (when OBS connects/disconnects)
nms.on('prePublish', ...) 
nms.on('donePublish', ...)

// API Routes
app.post('/api/stream/create', ...)  // Create stream key
app.get('/api/streams', ...)         // Get all streams
app.delete('/api/stream/:key', ...)  // Delete stream key

// Socket.IO for real-time updates
io.on('connection', ...)
```

**When to edit:**
- Change ports
- Add features
- Customize behavior

**Lines to find:**
- Line 33: `const HTTP_PORT = 8000` (change web port)
- Line 34: `const RTMP_PORT = 1935` (change RTMP port)

---

## 🌐 Web Interface Files

### public/index.html
**Main webpage structure**

**What's inside:**
- Header with logo and search
- Sidebar navigation
- Stream cards grid (like YouTube)
- Create stream modal
- Stream details modal
- Video player modal
- Health dashboard

**YouTube-like sections:**
- Live streams tab
- All stream keys tab
- Statistics dashboard
- Health monitoring

### public/styles.css
**YouTube-like styling**

**Design system:**
- Dark theme (#0f0f0f background)
- YouTube red (#ff0000 primary)
- Smooth animations
- Responsive breakpoints
- Loading states
- Toast notifications

**Key classes:**
```css
.stream-card { ... }          /* YouTube-style stream cards */
.youtube-health-panel { ... } /* YouTube Studio dashboard */
.quality-indicator { ... }    /* Stream quality badges */
.notification { ... }         /* Toast notifications */
```

### public/app.js
**Frontend JavaScript logic**

**What it does:**
- Connects to server via Socket.IO
- Creates/deletes stream keys
- Updates UI in real-time
- Handles video playback (HLS.js)
- Monitors stream health
- Shows YouTube-like presets

**Key functions:**
```javascript
createStream()              // Create new stream key
loadAllStreams()           // Fetch all streams
updateHealthDashboard()    // YouTube Studio metrics
updatePresetInfo()         // Show YouTube preset details
playStream()               // Start video player
```

---

## 🚀 Quick Start Scripts

### For Windows Users:

#### install-cloudflared.bat
**Installs Cloudflare Tunnel tool**
- Uses winget (if available)
- Falls back to Chocolatey
- Shows manual instructions if needed
- Run as Administrator

**When to run:** Once, before using tunnel

#### setup-tunnel.bat
**Configures Cloudflare Tunnel**
- Authenticates with Cloudflare
- Creates tunnel
- (Optional) Sets up custom domains
- Generates credentials

**When to run:** Once, after installing cloudflared

#### start-tunnel-quick.bat
**Starts temporary tunnel**
- No setup required
- Get public URL instantly
- URL changes each restart
- Perfect for quick tests

**When to run:** Every time you want public access (temporary)

#### start-tunnel-persistent.bat
**Starts configured tunnel**
- Uses permanent URLs
- Requires prior setup
- Exposes RTMP for OBS
- Auto-reconnects

**When to run:** Every time you want public access (permanent)

---

## 💾 Data Storage

### media/ folder
**Temporary stream files**
- Created automatically when server starts
- Stores HLS segments (.ts files)
- Stores HLS playlists (.m3u8 files)
- Auto-cleaned when stream ends

**Don't edit or delete while streaming!**

### stream-keys.json
**Persistent stream key storage**
```json
[
  {
    "key": "abc123-...",
    "title": "My Stream",
    "createdAt": 1234567890
  }
]
```
**Created automatically when you create first stream key**
**Stream keys survive server restarts**

### node_modules/
**Installed npm packages**
- Created by `npm install`
- 1000+ files
- ~100 MB size
- Never edit manually

**Delete and run `npm install` if corrupted**

---

## 🔧 System Files

### .cloudflared/ folder
**Cloudflare Tunnel credentials**
- Created by `cloudflared tunnel login`
- Contains authentication certificates
- Contains tunnel credentials JSON
- Don't share these files!

**Location:**
- Windows: `C:\Users\YourName\.cloudflared\`
- Mac/Linux: `~/.cloudflared/`

---

## 📊 File Size Reference

```
Small (< 1 KB):
  - .gitignore
  - cloudflare-tunnel-config.yml
  - All .bat scripts

Medium (1-100 KB):
  - server.js (~10 KB)
  - public/app.js (~8 KB)
  - public/styles.css (~15 KB)
  - public/index.html (~12 KB)

Large (100 KB - 1 MB):
  - All documentation files combined (~500 KB)

Very Large (> 1 MB):
  - node_modules/ (~100 MB)
  - media/ (varies based on streams)
```

---

## 🔍 Which Files Can I Edit?

### ✅ Safe to Edit:
- `cloudflare-tunnel-config.yml` (after setup)
- `public/styles.css` (customize styling)
- `public/index.html` (change text/layout)
- `public/app.js` (add features)
- `server.js` (if you know Node.js)

### ⚠️ Edit with Caution:
- `package.json` (breaks dependencies if wrong)
- `.gitignore` (affects git behavior)

### ❌ Don't Edit:
- `package-lock.json` (auto-generated)
- `node_modules/` (auto-managed)
- `media/` (auto-generated)
- `stream-keys.json` (use web interface instead)
- `.cloudflared/` (security credentials)

---

## 🗑️ What Can I Delete?

### ✅ Safe to Delete:
- `media/` (will recreate when streaming)
- `node_modules/` (run `npm install` to restore)
- `stream-keys.json` (loses saved stream keys)
- `.cloudflared/` (re-run setup if needed)

### ⚠️ Delete Resets Features:
- `stream-keys.json` → Lose all stream keys
- `.cloudflared/` → Need to re-authenticate

### ❌ Don't Delete:
- `server.js` (breaks server)
- `package.json` (breaks npm)
- `public/` folder (breaks web interface)
- Documentation files (you'll miss them!)

---

## 🔄 Common File Operations

### Starting Fresh:
```bash
# Delete everything except core files
rm -rf node_modules media stream-keys.json

# Reinstall
npm install

# Start server
npm start
```

### Updating Project:
```bash
# Pull new version from git
git pull

# Update dependencies
npm install

# Restart server
npm start
```

### Backing Up:
**Copy these to backup:**
- `stream-keys.json` (your data)
- `cloudflare-tunnel-config.yml` (your config)
- `.cloudflared/` (your credentials)

**Don't need to backup:**
- `node_modules/` (can reinstall)
- `media/` (temporary)
- Documentation (can re-download)

---

## 🎯 File Access Matrix

| File | View | Edit | Delete | Share |
|------|------|------|--------|-------|
| **Documentation** | ✅ | ✅ | ⚠️ | ✅ |
| **server.js** | ✅ | ⚠️ | ❌ | ✅ |
| **public/** | ✅ | ✅ | ❌ | ✅ |
| **package.json** | ✅ | ⚠️ | ❌ | ✅ |
| **stream-keys.json** | ✅ | ❌ | ⚠️ | ❌ |
| **.cloudflared/** | ❌ | ❌ | ⚠️ | ❌ |
| **node_modules/** | ❌ | ❌ | ✅ | ❌ |
| **Scripts (.bat)** | ✅ | ⚠️ | ⚠️ | ✅ |

Legend:
- ✅ Yes, go ahead
- ⚠️ Careful, know what you're doing
- ❌ Don't do it

---

## 📚 Related Documentation

For detailed information about each topic:

- **Setup**: See `GETTING_STARTED.md`
- **Features**: See `README.md`
- **OBS**: See `OBS_SETUP_GUIDE.md`
- **Tunnel**: See `CLOUDFLARE_TUNNEL_GUIDE.md`
- **Platform Testing**: See `PLATFORM_TESTING_GUIDE.md`

---

**Understanding the structure helps you navigate the project better! 🚀**
