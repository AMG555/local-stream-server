# Getting Started - Simple Guide for Beginners 🚀

**Never used streaming software before? No problem!** This guide walks you through everything step-by-step.

## 📋 What You'll Need

### Required (Must Have):
- ✅ **Computer** - Windows, Mac, or Linux
- ✅ **Internet connection** - Any speed works
- ✅ **10 minutes** - That's all!

### We'll Install Together:
- 🔧 **Node.js** - Runs the server (FREE)
- 🔧 **FFmpeg** - Processes video (FREE)
- 🎥 **OBS Studio** - Streaming software (FREE)

**Everything is 100% FREE. No credit card. No signup.**

---

## 🎯 What This Does

This tool lets you:
1. **Create your own streaming server** (like a mini YouTube)
2. **Test your stream settings** privately before going live
3. **Share streams** with friends on same WiFi
4. **Go global** with Cloudflare Tunnel (optional)

**Think of it like:** Having your own YouTube Live for testing!

---

## ⚡ Super Quick Start (3 Steps)

### Step 1: Install Node.js (2 minutes)

**Windows:**
1. Go to: https://nodejs.org/
2. Download the **LTS version** (big green button)
3. Run the installer
4. Click "Next" on everything (use defaults)
5. Restart your computer

**Mac:**
```bash
# Open Terminal and run:
brew install node

# Don't have Homebrew? Install it first:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Verify it worked:**
Open Command Prompt (Windows) or Terminal (Mac/Linux):
```bash
node --version
# Should show: v20.x.x or similar
```

### Step 2: Install Project (1 minute)

**Windows (Command Prompt):**
```bash
cd Downloads\Temp stream server
npm install
```

**Mac/Linux (Terminal):**
```bash
cd ~/Downloads/Temp\ stream\ server
npm install
```

Wait for it to finish (downloads packages).

### Step 3: Start Server (10 seconds)

```bash
npm start
```

**You'll see:**
```
🎥 Local Streaming Server Started!
📡 RTMP Server: rtmp://192.168.1.100:1935/live
🌐 Web Interface: http://192.168.1.100:8000
```

**Copy that web interface URL** and open in your browser!

🎉 **Done! Server is running!**

---

## 🎮 Using the Server

### Open the Web Interface

1. Open your browser (Chrome, Firefox, Safari)
2. Go to: `http://localhost:8000`
3. You'll see a YouTube-like interface

### Create Your First Stream

1. Click **"Create Stream"** (big red button)
2. Type a name: "My Test Stream"
3. (Optional) Select a preset: "720p30 - Balanced"
4. Click **"Generate Stream Key"**

**A popup appears with:**
- RTMP Server URL (for OBS)
- Stream Key (keep secret!)
- Playback URL (for watching)

**Click the copy buttons** to save these!

### Test Without OBS (Just to See)

Right now you can:
- ✅ See the web interface
- ✅ Create stream keys
- ✅ Browse around
- ⚠️ Can't stream yet (need OBS)

**Next: Install OBS to actually stream!**

---

## 🎥 Installing OBS Studio (Optional)

**Only if you want to stream video/screen/camera.**

### Download OBS

1. Go to: https://obsproject.com/
2. Click **Download** (free)
3. Choose your OS (Windows/Mac/Linux)
4. Run the installer
5. Follow setup wizard (defaults are fine)

### First Time OBS Setup

1. Open OBS Studio
2. **Auto-Configuration Wizard** appears:
   - Select: "Optimize for streaming"
   - Video: 1920x1080, 30 FPS
   - Click through to finish

3. Click **"Start Streaming"** (won't work yet - we need to configure it)

### Connect OBS to Your Server

1. In OBS: **Settings** (bottom right)
2. Click **Stream** (left sidebar)
3. **Service**: Select "Custom"
4. **Server**: Paste your RTMP URL
   - Example: `rtmp://192.168.1.100:1935/live`
5. **Stream Key**: Paste your stream key
   - Example: `abc12345-1234-5678-9012-123456789abc`
6. Click **OK**

### Start Your First Stream!

1. Add a source (e.g., **Display Capture** to stream your screen)
2. Click **"Start Streaming"** (bottom right)
3. **Stream is now live!** 🔴

### Watch Your Stream

**📊 View Stats (Always Works):**
1. Go to web interface: `http://YOUR_IP:8000`
2. Click **"Live Streams"** in sidebar
3. See your stream with real-time stats (bitrate, FPS, health)

**🎥 Watch Video:**

**Without FFmpeg (3 easy options):**

1. **VLC Player** (Recommended for testing):
   - Download VLC: https://www.videolan.org/
   - Media → Open Network Stream
   - Paste: `rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY`
   - Click Play

2. **OBS Preview**:
   - Open another OBS window
   - Add "Media Source"
   - URL: `rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY`
   - Uncheck "Local File"

3. **FFplay** (command line):
   ```bash
   ffplay rtmp://YOUR_IP:1935/live/YOUR_STREAM_KEY
   ```

**With FFmpeg (browser playback):**
1. Install FFmpeg (see below)
2. Restart server
3. Click stream card in web interface
4. Watch in browser!

---

## ⚠️ Common First-Time Issues

### "npm is not recognized"
**Fix:** Node.js not installed or not in PATH
1. Reinstall Node.js
2. Restart computer
3. Try again

### "Cannot find module"
**Fix:** Forgot to run `npm install`
```bash
npm install
```

### "Port 8000 is already in use"
**Fix:** Server already running or port taken
```bash
# Windows: Kill the process
taskkill /f /im node.exe

# Mac/Linux: Kill the process
killall node
```

### "FFmpeg not found" Warning
**This is OK!** Your streams work perfectly without FFmpeg.

**FFmpeg is ONLY needed for:**
- ✅ Browser playback (HLS in web interface)

**FFmpeg is NOT needed for:**
- ✅ RTMP streaming from OBS (works now!)
- ✅ Viewing stats and monitoring (works now!)
- ✅ Stream key management (works now!)
- ✅ Using VLC to watch (works now!)

**Want browser playback? Install FFmpeg:**

**Windows - Easy Way:**
```bash
# Run from project folder
install-ffmpeg.bat
```

**Windows - Manual:**
1. Download: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH
4. Restart terminal and server

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

### "OBS won't connect"
**Check these:**
- [ ] Server is running (`npm start`)
- [ ] Stream key exists (created in web interface)
- [ ] RTMP URL is correct (starts with `rtmp://`)
- [ ] Stream Key is complete (long UUID)

---

## 📱 Accessing from Other Devices

### Same WiFi

**On your phone/tablet/another computer:**

1. Find server IP (shown when starting: `192.168.1.100`)
2. Open browser
3. Go to: `http://192.168.1.100:8000`
4. Can watch streams!

**Can't access?**
- Both devices on same WiFi? ✓
- Firewall blocking? (Windows: allow Node.js)
- Correct IP? (check server startup message)

### Internet Access (Cloudflare Tunnel)

**Want friends anywhere to access?**

**Super Quick (30 seconds):**
```bash
# Windows
start-tunnel-quick.bat

# Mac/Linux
npx cloudflared tunnel --url http://localhost:8000
```

**Get a public URL like:**
`https://random-words-1234.trycloudflare.com`

Share this URL with anyone!

**Full Setup (permanent URLs):**
See `CLOUDFLARE_TUNNEL_GUIDE.md`

---

## 🎓 What to Do Next

### Beginner Path:
1. ✅ **Got server running** → Create a stream key
2. ✅ **Installed OBS** → Connect and stream your screen
3. ✅ **Streaming works** → Watch yourself in browser
4. ✅ **Invite a friend** → Share your local URL

### Intermediate Path:
1. ✅ **Comfortable with basics** → Try different OBS sources
2. ✅ **Want better quality** → Select YouTube presets
3. ✅ **Need remote access** → Setup Cloudflare Tunnel
4. ✅ **Testing for YouTube** → Follow YouTube testing guide

### Advanced Path:
1. ✅ **Master local setup** → Read OBS Setup Guide
2. ✅ **Optimize settings** → Test different encoders/bitrates
3. ✅ **Go global** → Full Cloudflare Tunnel setup
4. ✅ **Production ready** → Use for real streaming

---

## 📚 Documentation Guide

**Start here (you are here!):**
- `GETTING_STARTED.md` ← You're reading this!

**Basic usage:**
- `README.md` - Overview and features
- `OBS_SETUP_GUIDE.md` - Configure OBS properly

**Advanced topics:**
- `CLOUDFLARE_TUNNEL_GUIDE.md` - Global access setup
- `YOUTUBE_LIVE_TESTING.md` - Test YouTube settings

**Read in this order:**
1. GETTING_STARTED.md (this file)
2. README.md (project overview)
3. OBS_SETUP_GUIDE.md (when configuring OBS)
4. CLOUDFLARE_TUNNEL_GUIDE.md (when ready for public access)
5. YOUTUBE_LIVE_TESTING.md (when testing for YouTube)

---

## ❓ FAQ for Beginners

### Q: Do I need to know coding?
**A:** Nope! Just run the commands shown. Copy-paste works!

### Q: Is this really free?
**A:** Yes! 100% free. No hidden costs. No trials. No credit card.

### Q: Can I break something?
**A:** No! Worst case: restart the server. Can't harm your computer.

### Q: What if I get stuck?
**A:** Check "Common Issues" section above. Most problems have simple fixes!

### Q: Do I need fast internet?
**A:** Not really! Works on any home internet. Even slow connections fine for testing.

### Q: Can I use this for real streaming?
**A:** For testing: Yes! For production: Better use YouTube/Twitch/etc.

### Q: Will my computer get hacked?
**A:** No. Server only accessible on your local network by default. Very safe!

### Q: Do I need a powerful computer?
**A:** Basic streaming: Any modern PC works. High quality (1080p60): Need decent CPU/GPU.

### Q: How do I stop the server?
**A:** Press `Ctrl+C` in the terminal where it's running.

### Q: Can I use this on multiple computers?
**A:** Yes! Run server on one, stream from another, watch from a third. All on same WiFi.

---

## 🎯 Quick Command Reference

### Start Server:
```bash
npm start
```

### Stop Server:
Press `Ctrl+C`

### Quick Tunnel (public access):
```bash
start-tunnel-quick.bat
```

### Install Dependencies:
```bash
npm install
```

### Check Node.js Version:
```bash
node --version
```

### Open Web Interface:
```
http://localhost:8000
```

---

## ✅ Checklist for Success

**Before starting:**
- [ ] Node.js installed (`node --version` works)
- [ ] Project files downloaded
- [ ] In correct folder (`cd` to project)

**First run:**
- [ ] Ran `npm install` (only once)
- [ ] Ran `npm start`
- [ ] See "Server Started!" message
- [ ] Can open web interface in browser

**OBS streaming:**
- [ ] OBS Studio installed
- [ ] Created stream key in web interface
- [ ] OBS configured with RTMP URL + Stream Key
- [ ] Can click "Start Streaming" without errors
- [ ] Stream appears as LIVE in web interface
- [ ] Can watch stream in browser

**Everything working?**
- [ ] Server starts without errors
- [ ] Web interface loads
- [ ] Can create stream keys
- [ ] OBS connects successfully
- [ ] Stream appears live
- [ ] Can watch video
- [ ] Friends can access (same WiFi)

---

## 🎉 You Did It!

**Congratulations!** You've:
- ✅ Set up your own streaming server
- ✅ Created stream keys
- ✅ Connected OBS (if you wanted to)
- ✅ Know how to start/stop server
- ✅ Can share with friends

### What You Can Do Now:

**For Fun:**
- Stream your screen to friends
- Test webcam without going public
- Practice streaming before going live
- Host local watch parties

**For Learning:**
- Understand how streaming works
- Test different video settings
- Measure your upload speed
- Compare encoder quality

**For Preparation:**
- Test YouTube Live settings
- Measure actual latency
- Perfect your OBS setup
- Train for real streaming

---

## 🆘 Still Need Help?

### Step-by-step help:

**Can't install Node.js?**
→ Ask a tech-savvy friend
→ Search "how to install Node.js [your OS]"
→ Many YouTube tutorials available

**Can't get server running?**
→ Check "Common First-Time Issues" section
→ Make sure you're in project folder
→ Try restarting computer

**OBS won't connect?**
→ Double-check RTMP URL (must start with `rtmp://`)
→ Verify stream key (long random text)
→ Make sure server is actually running

**Need more details?**
→ Read README.md for full documentation
→ Check OBS_SETUP_GUIDE.md for OBS help
→ All guides have troubleshooting sections

---

## 🚀 Ready for More?

**Feeling confident?** Level up:

**Next Challenge:**
- Setup Cloudflare Tunnel for public access
- Test different YouTube presets
- Stream from multiple sources in OBS
- Monitor stream health dashboard
- Perfect settings for YouTube Live

**Read next:**
- `OBS_SETUP_GUIDE.md` - Optimize your stream
- `CLOUDFLARE_TUNNEL_GUIDE.md` - Go global
- `YOUTUBE_LIVE_TESTING.md` - Prep for YouTube

---

**Welcome to streaming! Have fun! 🎥✨**

Remember: Everyone starts as a beginner. You've got this!
