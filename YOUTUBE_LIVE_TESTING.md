# YouTube Live Stream Testing Guide 🎥

Use your Local Stream Server to test and perfect your YouTube Live settings before going public!

## 🎯 Why Test Locally First?

### Problems with Testing Directly on YouTube:
- ❌ **Public mistakes** - viewers see your test streams
- ❌ **Limited tests** - YouTube has streaming quotas
- ❌ **Can't replay** - once live, it's live
- ❌ **No control** - can't inspect actual stream data
- ❌ **Stressful** - pressure of being "live"

### Benefits of Local Testing:
- ✅ **Private** - nobody sees your tests
- ✅ **Unlimited** - test as much as you want
- ✅ **Full control** - inspect every detail
- ✅ **No pressure** - perfect your setup first
- ✅ **Exact workflow** - same as YouTube Live
- ✅ **Real metrics** - actual bitrate, FPS, latency

---

## 📋 YouTube Live Settings Presets

The server includes **exact YouTube recommendations** as presets.

### Available Presets

#### 1080p60 - Best Quality
**Perfect for:** Gaming, sports, high-action content

```
Resolution: 1920x1080
Frame Rate: 60 fps
Bitrate: 6000 kbps (YouTube maximum)
Keyframe: 2 seconds
Encoder: NVENC H.264 (GPU) or x264 (CPU)
Preset: Quality (NVENC) or medium (x264)
Profile: high
```

**Requirements:**
- Strong CPU (i7+) or NVIDIA GPU (GTX 1060+)
- Upload speed: 8+ Mbps
- RAM: 8GB+

#### 1080p30 - High Quality
**Perfect for:** Tutorials, podcasts, presentations

```
Resolution: 1920x1080
Frame Rate: 30 fps
Bitrate: 4500 kbps
Keyframe: 2 seconds
Encoder: NVENC H.264 or x264
Preset: Quality (NVENC) or fast (x264)
Profile: high
```

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

**Requirements:**
- Medium CPU or any recent GPU
- Upload speed: 6+ Mbps
- RAM: 4GB+

#### 720p30 - Balanced
**Perfect for:** Most content, reliable streaming

```
Resolution: 1280x720
Frame Rate: 30 fps
Bitrate: 2500 kbps (YouTube recommended)
Keyframe: 2 seconds
Encoder: Any (x264, NVENC, QuickSync)
Preset: Any
Profile: high
```

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

**Requirements:**
- Any CPU
- Upload speed: 2+ Mbps
- RAM: 2GB

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

## ✅ Pre-Stream Checklist

Before going live on YouTube, verify:

### Technical Checks
- [ ] Health dashboard shows "Good" or "Excellent"
- [ ] Bitrate stable at target ±5%
- [ ] FPS matches preset exactly
- [ ] Zero dropped frames for 5+ minutes
- [ ] Latency <3 seconds
- [ ] Audio in sync
- [ ] Quality looks good in player

### System Checks
- [ ] CPU usage <80%
- [ ] GPU usage <90%
- [ ] RAM available >2GB
- [ ] Upload speed >target bitrate + 20%
- [ ] Using wired ethernet (not WiFi)
- [ ] No other heavy programs running

### OBS Checks
- [ ] Correct preset selected
- [ ] All settings match recommendations
- [ ] Scenes working properly
- [ ] Audio levels good (-12dB to -6dB)
- [ ] Webcam working (if used)
- [ ] Overlays/alerts working
- [ ] Hotkeys configured

### Final Checks
- [ ] Tested for 15+ minutes continuously
- [ ] No issues found
- [ ] Settings documented
- [ ] Backup plan ready
- [ ] Emergency stop procedure known

---

## 📝 Settings Documentation Template

Save this for each preset you test:

```
Date: _______________
Preset: _______________

OBS SETTINGS:
- Encoder: _______________
- Bitrate: _______________ kbps
- Preset: _______________
- Resolution: _______________
- FPS: _______________
- Keyframe: _______________ seconds

RESULTS:
- Average Bitrate: _______________ kbps
- CPU Usage: _______________%
- GPU Usage: _______________%
- Dropped Frames: _______________%
- Latency: _______________ seconds
- Quality: _______________

NOTES:
_________________________________
_________________________________
_________________________________

READY FOR YOUTUBE: [ ] YES  [ ] NO
```

---

## 🚀 From Local to YouTube

Once you've perfected your settings:

### Step 1: Get YouTube Stream Key

1. Go to https://studio.youtube.com
2. Click **Go Live**
3. Select **Stream**
4. Copy **Stream URL** and **Stream Key**

### Step 2: Update OBS

1. **Settings** → **Stream**
2. **Service**: `YouTube - RTMPS`
3. **Server**: Select closest server
4. **Stream Key**: Paste YouTube key
5. Click **OK**

**Keep all other settings EXACTLY the same!**

### Step 3: Go Live

1. Click **Start Streaming** in OBS
2. Check YouTube Studio dashboard
3. Verify stats match your local tests
4. Click **Go Live** when ready

### Step 4: Monitor

Watch YouTube Studio dashboard:
- Should show same health as local tests
- Bitrate should be stable
- Frame drops should be minimal
- If issues appear, you know it's YouTube's side

---

## 💡 Pro Tips

### Tip 1: Test at Different Times
Network performance varies:
- Test during peak hours (evening)
- Test during off-peak (morning)
- Use worst-case scenario for settings

### Tip 2: Have Multiple Presets
Create OBS profiles for:
- Best quality (when connection perfect)
- Backup quality (if issues appear)
- Emergency quality (last resort)

### Tip 3: Monitor System Resources
Use second monitor or phone:
- Task Manager (CPU/GPU usage)
- Network monitor (upload speed)
- Health dashboard (stream quality)

### Tip 4: Record Everything
Record tests locally:
- Review quality later
- Spot issues you missed live
- Compare different settings

### Tip 5: Document Everything
Keep notes on:
- What settings worked
- What failed and why
- System resource usage
- Network performance

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

**Ready to go live? You've got this! 🎥🚀**
