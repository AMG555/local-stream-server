# Cloudflare Tunnel Setup Guide 🌐

Complete guide to deploying your Local Stream Server globally using Cloudflare Tunnel - **100% FREE!**

## 📋 Table of Contents

1. [What is Cloudflare Tunnel?](#what-is-cloudflare-tunnel)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Persistent Setup (20 minutes)](#persistent-setup-20-minutes)
4. [YouTube Live Testing](#youtube-live-testing)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced-configuration)

---

## What is Cloudflare Tunnel?

**Cloudflare Tunnel** exposes your local server to the internet through Cloudflare's network without opening ports or configuring your router.

### How It Works:
```
OBS (anywhere) → Cloudflare Edge → Tunnel → Your Local Server
                  ↓
             Viewers (anywhere)
```

### Benefits:
- ✅ **Free Forever** - No bandwidth limits
- ✅ **No Port Forwarding** - Works behind any firewall
- ✅ **HTTPS Automatic** - Free SSL certificates
- ✅ **Global Access** - Anyone can connect from anywhere
- ✅ **DDoS Protection** - Built-in security
- ✅ **Fast** - Uses Cloudflare's global CDN

### What You Get:
- **Web Interface**: Accessible from anywhere via HTTPS
- **RTMP Server**: OBS can connect from any network
- **Media Server**: HLS streams served globally

---

## Quick Start (5 minutes)

**Perfect for:** Testing, temporary access, sharing with friends

### Step 1: Start Your Server
```bash
npm start
```

### Step 2: Start Quick Tunnel
**Windows:**
```bash
start-tunnel-quick.bat
```

**Mac/Linux:**
```bash
npx cloudflared tunnel --url http://localhost:9000
```

### Step 3: Copy the URL
You'll see output like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                                          |
|  https://random-words-1234.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

### Step 4: Share!
- **Web Interface**: `https://random-words-1234.trycloudflare.com`
- **OBS Connection**: Use your LOCAL IP (tunnel doesn't expose RTMP in quick mode)

### Limitations of Quick Mode:
- ⚠️ URL changes every restart
- ⚠️ OBS must connect to local network
- ⚠️ Tunnel closes when you close terminal

**For permanent URLs and remote OBS access, use Persistent Setup below.**

---

## Persistent Setup (20 minutes)

**Perfect for:** Long-term use, remote OBS streaming, custom domains

### Prerequisites
- ✅ Cloudflare account (free - signup at cloudflare.com)
- ✅ Email address for verification
- ✅ Optional: Domain name (if you want custom URLs)

### Step 1: Install Cloudflared

**Windows (Run as Administrator):**
```bash
install-cloudflared.bat
```

This will install using:
- **winget** (if available) - Recommended
- **Chocolatey** (if winget not available)
- **Manual** (if neither available)

**Mac:**
```bash
brew install cloudflared
```

**Linux:**
```bash
# Debian/Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Other Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

Verify installation:
```bash
cloudflared --version
```

### Step 2: Setup Tunnel

**Windows:**
```bash
setup-tunnel.bat
```

**Mac/Linux:**
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create local-stream-server

# Optional: Setup DNS (if you have a domain)
cloudflared tunnel route dns local-stream-server stream.yourdomain.com
cloudflared tunnel route dns local-stream-server rtmp.yourdomain.com
```

This will:
1. Open browser for Cloudflare authentication
2. Create a tunnel named "local-stream-server"
3. Generate credentials file
4. (Optional) Setup DNS routes

### Step 3: Configure Tunnel

Edit `cloudflare-tunnel-config.yml`:

```yaml
tunnel: local-stream-server
credentials-file: /path/to/.cloudflared/tunnel-credentials.json

ingress:
  # Web interface
  - hostname: stream.yourdomain.com  # Or use trycloudflare.com
    service: http://localhost:9000
  
  # RTMP server (for OBS)
  - hostname: rtmp.yourdomain.com
    service: tcp://localhost:2935
  
  # Media server (HLS)
  - hostname: media.yourdomain.com
    service: http://localhost:9081
  
  # Go media server (WebSocket MSE / WebRTC)
  - hostname: ws.yourdomain.com
    service: http://localhost:9084

  - service: http_status:404
```

**Update these:**
- `credentials-file`: Path shown during setup
- `hostname`: Your domain or leave for auto-generated URLs

### Step 4: Start Tunnel

**Windows:**
```bash
start-tunnel-persistent.bat
```

**Mac/Linux:**
```bash
cloudflared tunnel --config cloudflare-tunnel-config.yml run local-stream-server
```

### Step 5: Access Your Server

**If using custom domain:**
- Web: `https://stream.yourdomain.com`
- RTMP: `rtmp://rtmp.yourdomain.com/live`

**If using auto-generated URLs:**
- Check tunnel output for URLs
- Example: `https://local-stream-server.trycloudflare.com`

### Step 6: Configure OBS

1. Open OBS Studio
2. Settings → Stream
3. Service: **Custom**
4. Server: `rtmp://rtmp.yourdomain.com/live` (or your RTMP URL)
5. Stream Key: Generate one in web interface

**Now OBS can connect from ANY network, ANYWHERE!** 🎉

---

## YouTube Live Testing

This server is **perfect for testing YouTube Live streams** before going live!

### Why Use This for YouTube Testing?

1. ✅ **Exact same RTMP workflow** as YouTube Live
2. ✅ **Test encoder settings** without going public
3. ✅ **Measure actual latency** on your network
4. ✅ **Compare different bitrates** and presets
5. ✅ **Practice OBS scenes** and transitions
6. ✅ **No viewers watching** your tests
7. ✅ **Unlimited testing** - no YouTube quotas

### YouTube Live vs Local Stream Server

| Feature | YouTube Live | Local Stream Server |
|---------|--------------|---------------------|
| **RTMP Ingest** | ✅ | ✅ |
| **Stream Keys** | ✅ | ✅ |
| **HLS Playback** | ✅ | ✅ (with FFmpeg) |
| **Real-time Stats** | ✅ | ✅ |
| **Health Dashboard** | ✅ | ✅ |
| **Global Access** | ✅ | ✅ (with Tunnel) |
| **Free** | ✅ | ✅ |
| **Private Testing** | ❌ | ✅ |
| **No Quotas** | ❌ | ✅ |
| **Full Control** | ❌ | ✅ |

### Using YouTube Presets

When creating a stream, select a preset:

- **1080p60** - 6000 kbps (YouTube's highest quality)
- **1080p30** - 4500 kbps (Standard HD)
- **720p60** - 4500 kbps (Smooth gaming)
- **720p30** - 2500 kbps (Balanced)
- **480p30** - 1500 kbps (Low bandwidth)

Each preset shows **exact OBS settings** matching YouTube's recommendations.

### Testing Workflow

1. **Select Preset** in web interface
2. **Copy OBS settings** shown
3. **Configure OBS** exactly as shown
4. **Start streaming**
5. **Monitor health dashboard** (like YouTube Studio)
6. **Watch stream** to verify quality
7. **Adjust settings** if needed
8. **Repeat** until perfect

Once satisfied, **use same settings on YouTube Live!**

### Health Dashboard

Monitor your stream like YouTube Studio:

- ✅ **Overall Health**: Excellent / Good / Fair / Poor
- ✅ **Bitrate**: Real-time kbps
- ✅ **Frame Rate**: Actual FPS
- ✅ **Dropped Frames**: Connection issues
- ✅ **Connection Quality**: Stable / Unstable

### Comparing with YouTube Live

**Test locally first, then YouTube:**

1. Stream to your server → Check latency and quality
2. Apply same settings to YouTube → Compare results
3. Identify issues → Network vs Encoder vs Service
4. Optimize settings → Perfect balance

---

## Troubleshooting

### Tunnel Won't Start

**Error: `cloudflared not found`**
```bash
# Reinstall cloudflared
install-cloudflared.bat
```

**Error: `tunnel credentials not found`**
```bash
# Re-run setup
setup-tunnel.bat
```

**Error: `port already in use`**
```bash
# Check if server is running
# Stop old tunnel process
taskkill /f /im cloudflared.exe
```

### OBS Can't Connect

**Check 1: Is tunnel running?**
```bash
# Should see "Connection established" messages
```

**Check 2: Correct RTMP URL?**
```
Should be: rtmp://rtmp.yourdomain.com/live
NOT: rtmps:// or https://
```

**Check 3: Stream key exists?**
- Create stream key in web interface
- Copy entire key (UUID format)

**Check 4: Firewall blocking?**
```bash
# Windows: Allow cloudflared
netsh advfirewall firewall add rule name="Cloudflared" dir=in action=allow program="C:\Program Files\cloudflared\cloudflared.exe"
```

### Playback Not Working

**Error: `FFmpeg not found`**
```bash
# Install FFmpeg first
# See README.md for installation instructions
```

**Error: `Stream loads but no video`**
- Wait 2-6 seconds for first GOP
- Check OBS is actually streaming
- Verify bitrate is sufficient (>1500 kbps)

### Tunnel Disconnects

**Check internet connection:**
```bash
ping cloudflare.com
```

**Restart tunnel:**
```bash
# Stop tunnel (Ctrl+C)
# Restart with:
start-tunnel-persistent.bat
```

**Check system resources:**
- CPU usage < 80%
- RAM available > 500MB
- Disk space > 1GB

---

## Advanced Configuration

### Auto-Start on Windows Boot

**Create Windows Service:**

1. Download NSSM: https://nssm.cc/download
2. Extract `nssm.exe`
3. Run as Administrator:

```bash
# Install server service
nssm install LocalStreamServer "node" "C:\path\to\project\server.js"
nssm set LocalStreamServer AppDirectory "C:\path\to\project"
nssm start LocalStreamServer

# Install tunnel service
nssm install CloudflareTunnel "cloudflared" "tunnel --config C:\path\to\project\cloudflare-tunnel-config.yml run local-stream-server"
nssm set CloudflareTunnel AppDirectory "C:\path\to\project"
nssm start CloudflareTunnel
```

### Custom Domains

**If you own a domain on Cloudflare:**

1. Add domain to Cloudflare (free)
2. Run DNS route commands:

```bash
cloudflared tunnel route dns local-stream-server stream.yourdomain.com
cloudflared tunnel route dns local-stream-server rtmp.yourdomain.com
cloudflared tunnel route dns local-stream-server media.yourdomain.com
```

3. Update `cloudflare-tunnel-config.yml` with your domains
4. Restart tunnel

**DNS propagates in ~5 minutes.**

### Multiple Tunnels

Run different tunnels for different purposes:

```bash
# Create tunnels
cloudflared tunnel create stream-test
cloudflared tunnel create stream-prod

# Different configs
# stream-test-config.yml
# stream-prod-config.yml

# Run specific tunnel
cloudflared tunnel --config stream-test-config.yml run stream-test
```

### Load Balancing

Spread load across multiple servers:

```yaml
ingress:
  - hostname: stream.yourdomain.com
    service: http://localhost:9000
    originRequest:
      connectTimeout: 10s
      noHappyEyeballs: true
```

### Metrics and Monitoring

View tunnel metrics:

```bash
# Access metrics endpoint
curl http://localhost:51822/metrics

# Or visit in browser
http://localhost:51822/metrics
```

Shows:
- Request count
- Response times
- Error rates
- Tunnel health

---

## Security Best Practices

### 1. Protect Stream Keys

Stream keys are like passwords:
- ✅ Never share publicly
- ✅ Rotate regularly
- ✅ Delete unused keys
- ✅ One key per user/device

### 2. Add Authentication (Optional)

Add password to web interface:

```javascript
// In server.js
const PASSWORD = process.env.ADMIN_PASSWORD || 'your-secure-password';

app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (req.path.startsWith('/api/')) {
    if (auth !== `Bearer ${PASSWORD}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});
```

### 3. Monitor Access

Check tunnel logs:

```bash
# Show recent connections
cloudflared tunnel info local-stream-server

# Watch live
cloudflared tunnel --loglevel debug run local-stream-server
```

### 4. Rate Limiting

Prevent abuse:

```javascript
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Cost Analysis

### What's FREE:
- ✅ Cloudflare Tunnel - Unlimited bandwidth
- ✅ HTTPS certificates - Auto-renewed
- ✅ DDoS protection - Always on
- ✅ Global CDN - 300+ locations
- ✅ DNS hosting - Unlimited records
- ✅ IPv4 + IPv6 - Both supported

### What You Pay:
- 💰 **Electricity** - ~$5-10/month (running your PC)
- 💰 **Domain** (optional) - ~$10/year
- 💰 **VPS** (optional) - $5-10/month if not running at home

### Compared to Alternatives:
- **YouTube Live**: Free but public
- **Twitch**: Free but public
- **Cloudflare Stream**: ~$10/month serverless
- **AWS IVS**: ~$100/month
- **Wowza Cloud**: ~$50/month

**Cloudflare Tunnel = Best value for private testing!**

---

## FAQ

### Can multiple people stream at once?
Yes! Each gets their own stream key. Limit depends on your hardware.

### Does the tunnel use my bandwidth?
Yes. Viewers pull data through your connection. Monitor usage.

### Can I use this in production?
For testing: ✅ Perfect
For production: ⚠️ Consider Cloudflare Stream for reliability

### What if my IP changes?
Doesn't matter! Tunnel reconnects automatically with same URLs.

### Can I use without a domain?
Yes! Auto-generated `.trycloudflare.com` URLs work great.

### Is my stream data private?
- ✅ Stream keys required to broadcast
- ✅ HTTPS encrypts web traffic
- ⚠️ Anyone with stream key can stream
- ⚠️ Anyone with web URL can watch

Add authentication for true privacy.

### Can I record streams?
Yes! Streams are stored in `media/` folder while live.

---

## Support

### Getting Help

1. **Check logs**: `server.js` output and tunnel output
2. **Verify config**: Double-check all URLs and paths
3. **Test locally**: Ensure server works without tunnel first
4. **Check status**: https://www.cloudflarestatus.com/

### Reporting Issues

Include:
- Operating system
- Node.js version (`node --version`)
- Cloudflared version (`cloudflared --version`)
- Error messages (full output)
- Config files (redact credentials)

---

## Next Steps

✅ **Setup Complete?** → Test with OBS
✅ **Working locally?** → Add Cloudflare Tunnel
✅ **Tunnel running?** → Share with friends
✅ **Testing YouTube presets?** → Perfect your settings
✅ **Ready for production?** → Consider Cloudflare Stream

---

**Happy Streaming! 🚀**

Made with ❤️ for encoder testing and YouTube Live preparation.
