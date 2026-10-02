# Multi-Platform Stream Testing Guide 🎥

Use your Local Stream Server to test and perfect your streaming settings before going live on **YouTube, Facebook, Twitch, Instagram, TikTok, LinkedIn, Twitter/X**, and other platforms!

## 🎯 Why Test Locally First?

### Problems with Testing Directly on Live Platforms:
- ❌ **Public mistakes** - viewers see your test streams
- ❌ **Limited tests** - platforms have streaming quotas
- ❌ **Can't replay** - once live, it's live
- ❌ **No control** - can't inspect actual stream data
- ❌ **Stressful** - pressure of being "live"
- ❌ **Platform differences** - each has different requirements
- ❌ **Risk of bans** - repeated test streams can trigger flags

### Benefits of Local Testing:
- ✅ **Private** - nobody sees your tests
- ✅ **Unlimited** - test as much as you want
- ✅ **Full control** - inspect every detail
- ✅ **No pressure** - perfect your setup first
- ✅ **Universal workflow** - same RTMP protocol across all platforms
- ✅ **Real metrics** - actual bitrate, FPS, latency
- ✅ **Multi-platform ready** - test once, stream anywhere

---

## 📋 Streaming Platform Settings Presets

The server includes **recommended settings** for popular platforms.

### Universal Guidelines

**All platforms use RTMP protocol** - same workflow, different destinations!

**Common settings across platforms:**
- **Keyframe Interval**: 2 seconds (ALWAYS)
- **Audio Sample Rate**: 48 kHz
- **Audio Bitrate**: 128-160 kbps stereo
- **Color Format**: NV12
- **Color Space**: 709
- **Color Range**: Limited
- **Rate Control**: CBR (Constant Bitrate)

### Available Presets

Choose based on your target platform and network:

#### 1080p60 - Best Quality (YouTube, Twitch)
**Perfect for:** Gaming, sports, high-action content

```
Resolution: 1920x1080
Frame Rate: 60 fps
Bitrate: 6000 kbps
Keyframe: 2 seconds
Encoder: NVENC H.264 (GPU) or x264 (CPU)
Preset: Quality (NVENC) or medium (x264)
Profile: high
```

**Platforms:**
- ✅ YouTube (up to 51000 kbps)
- ✅ Twitch (6000 kbps non-partner, 8500 partner)
- ❌ Facebook (max 1080p30)
- ❌ TikTok (max 1080p30)

**Requirements:**
- Strong CPU (i7+) or NVIDIA GPU (GTX 1060+)
- Upload speed: 8+ Mbps
- RAM: 8GB+

#### 1080p30 - High Quality (All Platforms)
**Perfect for:** Tutorials, podcasts, presentations, general content

```
Resolution: 1920x1080
Frame Rate: 30 fps
Bitrate: 4500 kbps
Keyframe: 2 seconds
Encoder: NVENC H.264 or x264
Preset: Quality (NVENC) or fast (x264)
Profile: high
```

**Platforms:**
- ✅ YouTube
- ✅ Facebook (under 4500 limit)
- ✅ Twitch
- ✅ Instagram (landscape/square)
- ✅ TikTok (landscape)
- ✅ LinkedIn
- ✅ Twitter/X (at 720p)

**Requirements:**
- Medium CPU (i5+) or NVIDIA GPU
- Upload speed: 6+ Mbps
- RAM: 8GB

#### 720p60 - Smooth Motion
**Perfect for:** Gaming on older hardware

```
Resolution: 1280x720
Frame Rate: 60 fps
Bitrate: 4500 kbps
Keyframe: 2 seconds
Encoder: NVENC H.264 or x264
Preset: Quality (NVENC) or veryfast (x264)
Profile: high
```

**Platforms:**
- ✅ YouTube
- ✅ Twitch
- ⚠️ Facebook (downscale to 720p30)

**Requirements:**
- Medium CPU or any recent GPU
- Upload speed: 6+ Mbps
- RAM: 4GB+

#### 720p30 - Balanced (Universal)
**Perfect for:** Most content, reliable streaming across all platforms

```
Resolution: 1280x720
Frame Rate: 30 fps
Bitrate: 2500-3000 kbps
Keyframe: 2 seconds
Encoder: Any (x264, NVENC, QuickSync)
Preset: Any
Profile: high
```

**Platforms:**
- ✅ ALL platforms support this
- Best universal preset for testing

**Requirements:**
- Any modern CPU
- Upload speed: 4+ Mbps
- RAM: 4GB

#### 480p30 - Low Bandwidth
**Perfect for:** Weak connections, mobile streaming

```
Resolution: 854x480
Frame Rate: 30 fps
Bitrate: 1500 kbps
Keyframe: 2 seconds
Encoder: x264
Preset: veryfast
Profile: main
```

**Platforms:**
- ✅ ALL platforms (emergency fallback)

**Requirements:**
- Any CPU
- Upload speed: 2+ Mbps
- RAM: 2GB

#### 1080x1920 Vertical - Mobile Platforms
**Perfect for:** Instagram, TikTok, mobile-first content

```
Resolution: 1080x1920 (9:16 portrait)
Frame Rate: 30 fps
Bitrate: 3000 kbps
Keyframe: 2 seconds
Encoder: NVENC or x264
Preset: Quality/fast
Profile: high
```

**Platforms:**
- ✅ Instagram Live
- ✅ TikTok Live
- ⚠️ YouTube Shorts (recorded, not live)

**Requirements:**
- Medium CPU or GPU
- Upload speed: 4+ Mbps
- Vertical scene setup in OBS

---

## 🎮 OBS Configuration Guide

### Step 1: Select Preset in Web Interface

1. Open web interface
2. Click "Create Stream"
3. Select preset (e.g., "1080p30 - 4500 kbps")
4. See detailed settings displayed
5. Generate stream key

### Step 2: Configure OBS Settings

#### Output Settings
1. Open OBS Studio
2. **Settings** → **Output**
3. **Output Mode**: `Advanced`
4. **Streaming** tab:
   - **Encoder**: Select based on preset
     - GPU: `NVENC H.264`
     - CPU: `x264`
   - **Rate Control**: `CBR`
   - **Bitrate**: Match preset (e.g., `4500`)
   - **Keyframe Interval**: `2`

#### For NVENC (GPU):
- **Preset**: `Quality` or `Max Quality`
- **Profile**: `high`
- **Look-ahead**: `OFF` (lower latency)
- **Psycho Visual Tuning**: `ON`
- **GPU**: `0`
- **Max B-frames**: `2`

#### For x264 (CPU):
- **CPU Usage Preset**: `veryfast` to `medium`
- **Profile**: `high`
- **Tune**: `zerolatency`
- **x264 Options**: `bframes=2`

#### Video Settings
1. **Settings** → **Video**
2. **Base (Canvas) Resolution**: Your monitor (e.g., `1920x1080`)
3. **Output (Scaled) Resolution**: Match preset (e.g., `1920x1080`)
4. **Downscale Filter**: `Lanczos` (best quality)
5. **FPS**: Match preset (`30` or `60`)
   - **Common FPS Values**: Use integer like `30` (not variable)

#### Audio Settings
1. **Settings** → **Audio**
2. **Sample Rate**: `48 kHz`
3. **Channels**: `Stereo`
4. **Desktop Audio**: Select your audio output
5. **Mic/Auxiliary Audio**: Select your microphone

#### Advanced Settings
1. **Settings** → **Advanced**
2. **Process Priority**: `High` (if CPU encoding)
3. **Renderer**: `Direct3D 11`
4. **Color Format**: `NV12`
5. **Color Space**: `709`
6. **Color Range**: `Limited`

### Step 3: Connect to Server

1. **Settings** → **Stream**
2. **Service**: `Custom`
3. **Server**: Your RTMP URL
   - Local: `rtmp://192.168.1.100:1935/live`
   - Tunnel: `rtmp://rtmp.yourdomain.com/live`
4. **Stream Key**: Paste from web interface
5. Click **OK**

---

## 📊 Testing Workflow

### Phase 1: Initial Test (5 minutes)

1. **Select preset** (start with 720p30)
2. **Configure OBS** with preset settings
3. **Start streaming**
4. **Check health dashboard**:
   - Overall status: Should be "Good" or "Excellent"
   - Bitrate: Should match target (±10%)
   - FPS: Should match preset exactly
   - Dropped frames: Should be 0

5. **Watch stream** in browser
6. **Check latency** (should be <3 seconds)

**If all good → Move to Phase 2**
**If problems → See Troubleshooting section**

### Phase 2: Quality Test (10 minutes)

1. **Play video** or game in OBS
2. **Monitor stats** continuously
3. **Check for issues**:
   - Stuttering or freezing
   - Bitrate fluctuations
   - Dropped frames
   - Audio sync issues

4. **Try different scenes**:
   - Static content (slides)
   - High motion (gaming)
   - Camera switching

5. **Record metrics**:
   - Average bitrate
   - Frame drops
   - CPU usage
   - GPU usage

### Phase 3: Stress Test (15 minutes)

1. **Increase complexity**:
   - Add more sources
   - Enable filters/effects
   - Increase game settings

2. **Monitor resources**:
   - CPU usage (<80%)
   - GPU usage (<90%)
   - RAM usage
   - Upload bandwidth

3. **Check stability**:
   - No encoder lag
   - No rendering lag
   - No network issues

4. **Document results**:
   - What worked
   - What didn't
   - Resource limits found

### Phase 4: Final Optimization

1. **Adjust settings** based on tests
2. **Re-test** with new settings
3. **Find sweet spot**:
   - Best quality your system can handle
   - Stable throughout test
   - No dropped frames

4. **Save settings**:
   - Create OBS profile
   - Document all settings
   - Create checklist

---

## 📈 Reading the Health Dashboard

### Overall Health Indicator

**Excellent (Green)**
- Bitrate: Stable at target ±5%
- FPS: Exactly at target
- Dropped frames: 0
- Connection: Stable

**Good (Light Green)**
- Bitrate: Within target ±10%
- FPS: Mostly at target
- Dropped frames: <1%
- Connection: Stable

**Fair (Yellow)**
- Bitrate: Fluctuating ±15%
- FPS: Occasional drops
- Dropped frames: 1-5%
- Connection: Intermittent issues

**Poor (Red)**
- Bitrate: Very unstable
- FPS: Frequent drops
- Dropped frames: >5%
- Connection: Unreliable

### Interpreting Metrics

#### Bitrate
- **Stable at target**: Perfect encoder settings
- **Lower than target**: CPU/GPU overloaded
- **Fluctuating wildly**: Network or encoder issues

#### Frame Rate
- **Matches preset**: Encoder keeping up
- **Dropping below**: CPU/GPU can't keep up
- **Variable**: Wrong FPS setting in OBS

#### Dropped Frames
- **0 frames**: Perfect connection
- **<1%**: Acceptable, minor blips
- **1-5%**: Network issues, reduce bitrate
- **>5%**: Serious problems, check everything

#### Connection Quality
- **Stable**: All systems go
- **Intermittent**: Network congestion
- **Unstable**: Check internet connection

---

## 🔧 Troubleshooting

### Problem: Poor Health Status

**Symptoms:** Dashboard shows "Poor" or "Fair"

**Solutions:**
1. Lower preset (1080p60 → 1080p30)
2. Reduce bitrate by 20%
3. Change encoder preset (slow → fast)
4. Close other applications
5. Check CPU/GPU usage

### Problem: High Dropped Frames

**Symptoms:** Dropped frames >1%

**Causes & Fixes:**

**Encoding Lag:**
```
CPU/GPU can't encode fast enough
→ Use faster preset
→ Enable hardware encoding
→ Lower resolution/FPS
```

**Rendering Lag:**
```
OBS can't render scene
→ Simplify scenes
→ Reduce sources
→ Disable filters
```

**Network Lag:**
```
Upload can't keep up
→ Lower bitrate
→ Check network usage
→ Use wired connection
```

### Problem: Low Bitrate

**Symptoms:** Actual bitrate much lower than target

**Causes & Fixes:**

**CPU Overload:**
```
→ Task Manager: CPU at 100%
→ Use hardware encoder (NVENC)
→ Close other programs
```

**GPU Overload:**
```
→ Task Manager: GPU at 100%
→ Lower game settings
→ Use slower NVENC preset
```

**Wrong Settings:**
```
→ Check OBS Output settings
→ Verify Rate Control = CBR
→ Confirm bitrate matches preset
```

### Problem: Stuttering Video

**Symptoms:** Video freezes or jumps

**Causes & Fixes:**

**Low FPS:**
```
→ Check Stats: Rendering lag?
→ Simplify OBS scene
→ Lower game graphics
```

**Network Issues:**
```
→ Check dropped frames
→ Test upload speed
→ Use wired ethernet
```

**Keyframe Issues:**
```
→ Set keyframe to 2 seconds
→ Never set to 0 or auto
```

### Problem: Out of Sync Audio

**Symptoms:** Audio doesn't match video

**Fixes:**
1. **Settings** → **Advanced**
2. **Audio Monitoring**: `Monitor and Output`
3. Add **Audio Sync Offset**: Try +/- 100ms increments
4. Use **Audio Mixer**: Mute/unmute to resync

---

## ✅ Pre-Stream Checklist (Universal)

Before going live on **any platform**, verify:

### Technical Checks
- [ ] Health dashboard shows "Good" or "Excellent"
- [ ] Bitrate stable at target ±5%
- [ ] FPS matches preset exactly
- [ ] Zero dropped frames for 5+ minutes
- [ ] Latency appropriate for platform
- [ ] Audio in sync
- [ ] Quality looks good in player
- [ ] Correct aspect ratio for platform

### System Checks
- [ ] CPU usage <80%
- [ ] GPU usage <90%
- [ ] RAM available >2GB
- [ ] Upload speed >target bitrate + 20%
- [ ] Using wired ethernet (not WiFi if possible)
- [ ] No other heavy programs running
- [ ] Upload speed tested: https://fast.com

### OBS Checks
- [ ] Correct preset selected
- [ ] All settings match platform requirements
- [ ] Scenes working properly
- [ ] Audio levels good (-12dB to -6dB)
- [ ] Webcam working (if used)
- [ ] Overlays/alerts working
- [ ] Hotkeys configured
- [ ] Correct aspect ratio (16:9 landscape or 9:16 portrait)

### Platform-Specific Checks
- [ ] Stream key copied correctly (no extra spaces)
- [ ] Platform account in good standing
- [ ] Platform requirements met (followers, verification, etc.)
- [ ] Platform bitrate limit known and respected
- [ ] Platform resolution/FPS limits known
- [ ] Platform latency expectations understood

### Final Checks
- [ ] Tested for 15+ minutes continuously
- [ ] No issues found
- [ ] Settings documented
- [ ] Backup plan ready (lower quality preset)
- [ ] Emergency stop procedure known
- [ ] Local recording enabled (optional backup)

---

## 📝 Settings Documentation Template

Save this for each platform and preset you test:

```
Date: _______________
Platform: _______________ (YouTube/Facebook/Twitch/etc.)
Preset: _______________

OBS SETTINGS:
- Encoder: _______________
- Bitrate: _______________ kbps
- Preset: _______________
- Resolution: _______________
- FPS: _______________
- Keyframe: _______________ seconds
- Aspect Ratio: _______________ (16:9 / 9:16 / 1:1)

RESULTS:
- Average Bitrate: _______________ kbps
- CPU Usage: _______________%
- GPU Usage: _______________%
- Dropped Frames: _______________%
- Latency: _______________ seconds
- Quality: _______________

PLATFORM NOTES:
- Platform health dashboard status: _______________
- Platform-specific issues: _______________
- Platform latency: _______________

NOTES:
_________________________________
_________________________________
_________________________________

READY FOR LIVE: [ ] YES  [ ] NO
PLATFORM TESTED: [ ] YouTube [ ] Facebook [ ] Twitch 
                 [ ] Instagram [ ] TikTok [ ] LinkedIn
                 [ ] Twitter/X [ ] Other: ___________
```

---

## 🚀 Going Live on Different Platforms

Once you've perfected your settings locally, here's how to go live on each platform.

**IMPORTANT:** Keep all OBS settings EXACTLY the same! Only change Service/Server/Stream Key.

---

### YouTube Live

#### Get Stream Key:
1. Go to https://studio.youtube.com
2. Click **Go Live** → **Stream**
3. Copy **Stream URL** and **Stream Key**

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `YouTube - RTMPS`
3. **Server**: Select closest server (Primary/Backup)
4. **Stream Key**: Paste YouTube key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1080p30 or 720p30
- **Bitrate**: 2500-6000 kbps
- **Keyframe**: 2 seconds
- **Latency**: Normal (10-20s), Low Latency (3-8s), Ultra-Low (1-3s)

#### Go Live:
1. Click **Start Streaming** in OBS
2. Wait 10-20 seconds for YouTube to detect stream
3. Check YouTube Studio dashboard
4. Click **Go Live** when ready

#### Monitor:
- YouTube Studio shows health metrics
- Compare with your local test results
- Should be identical if network is stable

---

### Facebook Live

#### Get Stream Key:
1. Go to https://www.facebook.com/live/create
2. Select destination (Timeline, Page, Group)
3. Click **Go Live**
4. Copy **Server URL** and **Stream Key**

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Facebook Live`
3. **Server**: Auto-select or choose closest
4. **Stream Key**: Paste Facebook key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1080p30 or 720p30
- **Bitrate**: 3000-4500 kbps (max 4500)
- **Keyframe**: 2 seconds
- **Audio**: 128 kbps stereo

#### Go Live:
1. Click **Start Streaming** in OBS
2. Wait 5-10 seconds
3. Check Facebook preview
4. Add title/description
5. Click **Go Live**

#### Platform Limits:
- Max bitrate: 4500 kbps
- Max resolution: 1080p30 (720p60 also supported)
- Max duration: 8 hours continuous

---

### Twitch

#### Get Stream Key:
1. Go to https://dashboard.twitch.tv/settings/stream
2. Find **Primary Stream key**
3. Click **Copy** (keep secret!)

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Twitch`
3. **Server**: Select closest ingest server
4. **Stream Key**: Paste Twitch key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1080p60 or 900p60
- **Bitrate**: 4500-6000 kbps (non-partners: max 6000)
- **Keyframe**: 2 seconds
- **Audio**: 160 kbps stereo

#### Go Live:
1. Click **Start Streaming** in OBS
2. Stream appears live immediately
3. Update title/category in Twitch dashboard
4. Check Twitch Inspector for health

#### Platform Limits:
- Non-partners: 6000 kbps max
- Partners: 8500 kbps max
- Transcoding (quality options) available for partners/affiliates

---

### Instagram Live (via RTMP)

**Note:** Instagram requires mobile app OR third-party tools (Restream, StreamYard).

#### Option 1: Mobile + OBS Camera (simplest)
1. Use OBS Virtual Camera
2. Stream to Instagram mobile app
3. Select OBS Virtual Camera as source

#### Option 2: Third-Party Tools
1. Use [Yellow Duck](https://yellowduck.tv) or similar
2. Get RTMP URL and Stream Key
3. Configure in OBS as custom service

#### Recommended Settings:
- **Resolution**: 1080x1920 (vertical) or 1080x1080 (square)
- **Bitrate**: 3000-4000 kbps
- **Keyframe**: 2 seconds
- **Duration**: Max 4 hours

---

### TikTok Live

**Requirements:** 1000+ followers to go live

#### Get Stream Key:
1. Open TikTok app
2. Tap **+** → **LIVE**
3. Tap three dots → **LIVE Events**
4. Copy **Server URL** and **Stream Key**

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Custom`
3. **Server**: Paste TikTok server URL
4. **Stream Key**: Paste TikTok key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1080x1920 (vertical portrait) or 1920x1080 (landscape)
- **Bitrate**: 2000-3000 kbps
- **FPS**: 30 fps
- **Keyframe**: 2 seconds

#### Go Live:
1. Click **Start Streaming** in OBS
2. Check TikTok app for preview
3. Add title/topic
4. Tap **Go LIVE**

---

### LinkedIn Live

**Requirements:** Must apply for LinkedIn Live access

#### Get Stream Key:
1. Go to https://www.linkedin.com/feed/
2. Click **Start a post** → **Event** → **LinkedIn Live**
3. Copy **RTMP URL** and **Stream Key**

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Custom`
3. **Server**: Paste LinkedIn RTMP URL
4. **Stream Key**: Paste LinkedIn key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1280x720 (720p30) recommended
- **Bitrate**: 2500-4000 kbps
- **Keyframe**: 2 seconds
- **Audio**: 128 kbps stereo

#### Go Live:
1. Click **Start Streaming** in OBS
2. Wait 10-20 seconds
3. Check LinkedIn preview
4. Add title/description
5. Click **Go Live**

---

### Twitter/X (Premium required)

**Requirements:** Twitter Blue/Premium subscription

#### Get Stream Key:
1. Go to https://studio.twitter.com
2. Click **Create** → **Go Live**
3. Select **Encoder setup**
4. Copy **RTMP URL** and **Stream Key**

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Custom`
3. **Server**: Paste Twitter RTMP URL
4. **Stream Key**: Paste Twitter key
5. Click **OK**

#### Recommended Settings:
- **Resolution**: 1280x720 (720p)
- **Bitrate**: 2000-3000 kbps
- **FPS**: 30 fps
- **Keyframe**: 2 seconds

#### Go Live:
1. Click **Start Streaming** in OBS
2. Check Twitter Studio preview
3. Add title/description
4. Click **Go Live**

---

### Custom RTMP Server

For any other RTMP-compatible platform:

#### OBS Settings:
1. **Settings** → **Stream**
2. **Service**: `Custom`
3. **Server**: Enter RTMP URL (format: `rtmp://server.com/app`)
4. **Stream Key**: Enter provided key
5. Click **OK**

#### Common Custom Platforms:
- **Restream.io** (multi-stream to many platforms)
- **StreamYard** (browser-based streaming)
- **Castr** (professional streaming)
- **Dacast** (enterprise streaming)
- **Self-hosted** (Nginx-RTMP, SRS, etc.)

---

## 📊 Platform Comparison Table

| Platform | Max Bitrate | Max Resolution | Max FPS | Latency | RTMP Support |
|----------|-------------|----------------|---------|---------|--------------|
| YouTube | 51000 kbps | 4K (2160p) | 60 | 3-20s | ✅ Native |
| Facebook | 4500 kbps | 1080p | 30 | 5-10s | ✅ Native |
| Twitch | 6000-8500 kbps | 1080p | 60 | 2-5s | ✅ Native |
| Instagram | 4000 kbps | 1080p (9:16) | 30 | 3-8s | ⚠️ Via tools |
| TikTok | 3000 kbps | 1080p (9:16) | 30 | 2-5s | ✅ Native |
| LinkedIn | 4000 kbps | 720p | 30 | 10-20s | ✅ Native |
| Twitter/X | 3000 kbps | 720p | 30 | 5-10s | ✅ Native |

---

## 🔄 Multi-Platform Streaming

Want to stream to multiple platforms simultaneously?

### Option 1: Restream.io (Recommended)
1. Sign up at https://restream.io
2. Connect all platforms (YouTube, Facebook, Twitch, etc.)
3. Get single RTMP URL + key from Restream
4. Stream to Restream → they distribute to all platforms

### Option 2: Native Multi-Stream (Advanced)
Use OBS plugin: **Multiple RTMP outputs**
1. Install plugin from https://obsproject.com/forum/resources/multiple-rtmp-outputs-plugin.964/
2. Configure each platform's RTMP details
3. Start streaming → goes to all platforms simultaneously

**Warning:** Multi-streaming requires 2-3x upload bandwidth!

---

## 🧪 Platform-Specific Testing Checklist

Before going live on each platform, test locally:

### YouTube Testing
- [ ] Test 1080p30 @ 4500 kbps
- [ ] Verify keyframe interval = 2s
- [ ] Check latency options (Normal/Low/Ultra-Low)
- [ ] Test stream health for 15+ minutes
- [ ] Verify no dropped frames

### Facebook Testing
- [ ] Test 720p30 @ 3000 kbps (safer than max)
- [ ] Verify bitrate stays under 4500 kbps
- [ ] Test for 10+ minutes
- [ ] Check audio sync

### Twitch Testing
- [ ] Test 1080p60 @ 6000 kbps (if non-partner)
- [ ] Test 900p60 @ 6000 kbps (alternative)
- [ ] Verify no encoding lag
- [ ] Check stream for 20+ minutes

### Instagram Testing
- [ ] Test 1080x1920 (vertical) @ 3000 kbps
- [ ] Verify portrait orientation
- [ ] Check 4-hour duration limit
- [ ] Test with third-party tool

### TikTok Testing
- [ ] Test 1080x1920 (portrait) @ 2500 kbps
- [ ] Verify vertical format
- [ ] Check mobile preview
- [ ] Test engagement features

### LinkedIn Testing
- [ ] Test 720p30 @ 2500 kbps
- [ ] Professional content check
- [ ] Test for 10+ minutes
- [ ] Verify audio clarity

### Twitter/X Testing
- [ ] Test 720p30 @ 2500 kbps
- [ ] Keep under 3000 kbps limit
- [ ] Test for 10+ minutes
- [ ] Check Twitter Studio preview

---

## 💡 Pro Tips for Multi-Platform Streaming

### Tip 1: Test Each Platform Separately
Network performance and platform requirements vary:
- Test YouTube at 1080p60 @ 6000 kbps
- Test Facebook at 720p30 @ 3000 kbps
- Test Twitch at 1080p60 @ 6000 kbps
- Test TikTok vertical 1080x1920 @ 3000 kbps

### Tip 2: Have Platform-Specific Profiles
Create OBS profiles for each platform:
- **YouTube-Best** (1080p60 @ 6000)
- **Facebook-Safe** (720p30 @ 3000)
- **Twitch-Gaming** (900p60 @ 6000)
- **Instagram-Vertical** (1080x1920 @ 3000)
- **Universal-Backup** (720p30 @ 2500)

Switch profiles in OBS: **Profile** menu → Select profile

### Tip 3: Know Platform Limits
Each platform has hard limits:
- Facebook: 4500 kbps max (exceed = stream drops)
- Twitch non-partner: 6000 kbps max
- TikTok: 3000 kbps recommended
- Instagram: 4000 kbps absolute max

Test at 80% of limit for safety margin.

### Tip 4: Consider Aspect Ratios

**Landscape (16:9):**
- YouTube, Twitch, Facebook, LinkedIn
- Best for desktop viewers
- Standard gaming/tutorial format

**Portrait (9:16):**
- Instagram, TikTok
- Mobile-first platforms
- Requires vertical scene setup

**Square (1:1):**
- Facebook, Instagram (alternative)
- Good for mobile + desktop
- 1080x1080 resolution

### Tip 5: Platform-Specific Features

**YouTube:**
- Latency modes: Normal (10-20s), Low (3-8s), Ultra-Low (1-3s)
- Choose based on interaction needs

**Twitch:**
- Lower latency by default (2-5s)
- Good for interactive gaming

**Facebook:**
- Higher latency (5-10s)
- Good for watch parties

**TikTok:**
- Low latency (2-5s)
- Mobile interaction heavy

### Tip 6: Multi-Platform Bandwidth

If streaming to multiple platforms simultaneously:
- 1 platform @ 6000 kbps = 6 Mbps upload needed
- 2 platforms = 12 Mbps upload
- 3 platforms = 18 Mbps upload

Test upload: https://fast.com or https://speedtest.net

### Tip 7: Platform-Specific Monitoring

Each platform has different dashboards:
- **YouTube Studio** - most detailed metrics
- **Twitch Inspector** - real-time health checks
- **Facebook Creator Studio** - basic metrics
- **TikTok LIVE** - mobile-only stats

Compare local test metrics with platform dashboards.

### Tip 8: Vertical Streaming Setup (Instagram/TikTok)

**OBS Vertical Scene Setup:**
1. **Settings** → **Video**
2. **Base Resolution**: `1080x1920`
3. **Output Resolution**: `1080x1920`
4. Create vertical scenes (camera, screen, etc.)
5. Position sources for portrait orientation

**Alternative:** Use 1920x1080 and crop to 1080x1920 in platform.

### Tip 9: Save Platform Credentials Securely

Never share stream keys publicly:
- Each key = direct access to your stream
- Reset keys if accidentally exposed
- Use password manager for storage
- Different key per platform

### Tip 10: Test Multi-Platform Before Big Events

Before important streams:
- Test each platform 24 hours before
- Verify stream keys still work
- Check platform requirements haven't changed
- Have backup streaming plan ready

---

## 🎓 Advanced Topics

### Comparing Encoders

Test each encoder with same settings:

**x264 (CPU):**
- Best quality at given bitrate
- High CPU usage
- Many tuning options

**NVENC (NVIDIA GPU):**
- Good quality
- Low CPU usage
- Fast encoding

**QuickSync (Intel iGPU):**
- Decent quality
- Very low CPU usage
- Good fallback option

**AMF (AMD GPU):**
- Good quality (varies by GPU)
- Low CPU usage
- Fewer options than NVENC

Document which gives best quality on your system.

### Custom x264 Settings

For advanced users:

```
Settings → Output → Recording → Custom Encoder Settings:
tune=zerolatency bframes=2 rc-lookahead=0
```

Test different combinations:
- `tune=film` for movies
- `tune=animation` for animation
- `tune=grain` for grainy content
- `bframes=0` for ultra-low latency

### Multi-Bitrate Testing

Test adaptive bitrate:

1. Start with 6000 kbps
2. Drop to 4500 kbps mid-stream
3. Drop to 2500 kbps
4. See how quality changes
5. Find minimum acceptable bitrate

---

**Ready to go live on any platform? You've got this! 🎥🚀**

---

## 📚 Additional Resources

### Platform Documentation:
- **YouTube Live**: https://support.google.com/youtube/answer/2853702
- **Facebook Live**: https://www.facebook.com/help/1636872026560015
- **Twitch**: https://help.twitch.tv/s/article/broadcasting-guidelines
- **Instagram**: https://help.instagram.com/292478487812558
- **TikTok Live**: https://support.tiktok.com/en/live-gifts-wallet/tiktok-live
- **LinkedIn Live**: https://www.linkedin.com/help/linkedin/answer/100225
- **Twitter/X**: https://help.twitter.com/en/using-twitter/twitter-live

### Encoder Tools:
- **OBS Studio**: https://obsproject.com
- **Streamlabs OBS**: https://streamlabs.com
- **vMix**: https://www.vmix.com
- **Wirecast**: https://www.telestream.net/wirecast

### Multi-Streaming Tools:
- **Restream.io**: https://restream.io
- **StreamYard**: https://streamyard.com
- **Castr**: https://castr.com

### Testing Tools:
- **Speedtest**: https://speedtest.net
- **Twitch Inspector**: https://inspector.twitch.tv
- **YouTube Stream Health**: https://studio.youtube.com/stream
