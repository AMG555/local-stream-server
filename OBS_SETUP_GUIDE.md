# OBS Studio Setup Guide for Local Stream Server 🎬

Complete guide to configure OBS Studio with your Local Stream Server.

## 📋 Table of Contents

1. [Basic Setup](#basic-setup)
2. [Optimal Settings](#optimal-settings)
3. [Encoder Comparison](#encoder-comparison)
4. [Troubleshooting](#troubleshooting)
5. [Advanced Configuration](#advanced-configuration)

## 🚀 Basic Setup

### Step 1: Get Your Stream Credentials

1. Open the Local Stream Server web interface: `http://localhost:8000`
2. Click **"Create Stream"**
3. Enter a stream title (e.g., "Test Stream 1")
4. Click **"Generate Stream Key"**
5. You'll see:
   - **RTMP Server URL**: `rtmp://192.168.X.X:1935/live`
   - **Stream Key**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 2: Configure OBS

1. Open **OBS Studio**
2. Click **Settings** (bottom right)
3. Select **Stream** in the left menu
4. Configure:
   ```
   Service: Custom...
   Server: rtmp://YOUR_LOCAL_IP:1935/live
   Stream Key: [paste your generated key]
   ```
5. Click **OK**

### Step 3: Start Streaming

1. Click **Start Streaming** in OBS
2. Check the web interface - your stream should show as 🔴 LIVE
3. Click the stream card to watch
4. Monitor stats: bitrate, FPS, resolution

## ⚙️ Optimal Settings

### For Testing (Low CPU Usage)

**Settings → Output**
```
Output Mode: Simple
Video Bitrate: 2500 Kbps
Encoder: Hardware (NVENC, QuickSync, or AMD)
Audio Bitrate: 160
Recording Quality: Same as stream
```

**Settings → Video**
```
Base Resolution: 1920x1080
Output Resolution: 1920x1080
Downscale Filter: Bilinear (Fastest)
FPS: 30
```

### For Quality Testing (High Quality)

**Settings → Output**
```
Output Mode: Advanced
Encoder: x264
Rate Control: CBR
Bitrate: 6000 Kbps
Keyframe Interval: 2
CPU Usage Preset: veryfast
Profile: high
Tune: zerolatency
```

**Settings → Video**
```
Base Resolution: 1920x1080
Output Resolution: 1920x1080
Downscale Filter: Lanczos (Sharpest)
FPS: 60
```

### For Low Latency Testing

**Settings → Output**
```
Encoder: Hardware (NVENC recommended)
Rate Control: CBR
Bitrate: 3500 Kbps
Keyframe Interval: 1
Preset: Low-Latency / ll
Tune: zerolatency (if x264)
Look-ahead: OFF
Psycho Visual Tuning: OFF
```

**Settings → Advanced**
```
Process Priority: High
```

## 🎯 Encoder Comparison

### Software Encoder (x264)

**Pros:**
- Best quality at given bitrate
- Fine-grained control
- Works on all systems

**Cons:**
- High CPU usage (20-40%)
- May cause frame drops on weak CPUs
- Heat generation

**Best For:**
- Quality testing
- Systems with powerful CPUs (i7, Ryzen 7+)
- When GPU is busy (gaming)

**OBS Settings:**
```
Encoder: x264
CPU Usage Preset: veryfast to medium
Profile: high
Tune: zerolatency
```

### NVIDIA NVENC (GPU)

**Pros:**
- Minimal CPU usage (~2%)
- Hardware accelerated
- Excellent quality (newer GPUs)
- Very fast encoding

**Cons:**
- Requires NVIDIA GPU (GTX 1050+)
- Slightly lower quality than x264 at same bitrate
- GPU memory usage

**Best For:**
- Gaming streams
- Systems with NVIDIA GPU
- Minimal performance impact testing

**OBS Settings:**
```
Encoder: NVENC H.264
Rate Control: CBR
Preset: Quality or Max Quality
Profile: high
Look-ahead: OFF (for low latency)
Psycho Visual Tuning: ON
```

### AMD AMF (GPU)

**Pros:**
- Hardware accelerated (AMD GPUs)
- Low CPU usage
- Good performance

**Cons:**
- Quality varies by GPU generation
- Fewer tuning options than NVENC
- Requires AMD GPU (RX 400+)

**Best For:**
- AMD GPU systems
- Low CPU usage streaming

**OBS Settings:**
```
Encoder: AMD Advanced Media Framework
Rate Control: CBR
Quality Preset: Quality
Profile: high
```

### Intel QuickSync (iGPU)

**Pros:**
- Uses Intel integrated graphics
- Very low CPU usage
- Available on most Intel CPUs
- Good quality (7th gen+)

**Cons:**
- Requires enabled iGPU in BIOS
- Quality lower than NVENC on newer cards
- Limited to Intel CPUs

**Best For:**
- Systems with Intel iGPU
- Backup encoder when dGPU busy
- Power-efficient encoding

**OBS Settings:**
```
Encoder: QuickSync H.264
Target Usage: quality
Profile: high
```

## 🔧 Settings for Different Scenarios

### Scenario 1: Testing Encoder Latency

```
Encoder: [Your choice]
Keyframe Interval: 1 second
Bitrate: 3500 Kbps
Preset: Low-Latency (if available)
Tune: zerolatency (x264)
Look-ahead: OFF
B-frames: 0
```

### Scenario 2: Testing Network Bandwidth

```
Start with:
Bitrate: 1000 Kbps → Gradually increase
Resolution: 1280x720
FPS: 30

Test increments: 1000 → 2500 → 5000 → 8000 Kbps
```

### Scenario 3: Testing Quality vs Performance

**Test A (Performance):**
```
Encoder: NVENC/QuickSync
Preset: Performance
Bitrate: 2500 Kbps
Resolution: 1280x720
FPS: 30
```

**Test B (Quality):**
```
Encoder: x264
Preset: slow
Bitrate: 6000 Kbps
Resolution: 1920x1080
FPS: 60
```

Compare CPU usage, quality, and latency.

### Scenario 4: Simulating Bad Network

```
Bitrate: 1500 Kbps
Buffer Size: 1500 Kbps
Keyframe Interval: 4 seconds
Resolution: 854x480
FPS: 30
```

## 📊 Reading OBS Stats

### OBS Status Bar (Bottom)

```
CPU: 15.2%           → Lower is better (<40% for smooth)
FPS: 60.00           → Should match your setting
Dropped: 0.0% (0)    → Should be 0% or <0.5%
Bitrate: 2507 kb/s   → Should be stable near target
```

### Understanding Dropped Frames

**Rendering Lag:**
- CPU/GPU can't keep up with encoding
- **Fix:** Lower resolution, FPS, or use hardware encoder

**Encoding Lag:**
- Encoder is overloaded
- **Fix:** Use faster preset or switch to hardware encoder

**Network Lag:**
- Network can't handle bitrate
- **Fix:** Lower bitrate (not an issue on local network)

## 🐛 Troubleshooting

### Problem: Can't Connect to Server

**Check:**
1. Server is running (terminal should show server info)
2. Stream key exists (create new one in web interface)
3. Correct RTMP URL: `rtmp://IP:1935/live`
4. Firewall allows port 1935

**Test Connection:**
```bash
# Windows PowerShell
Test-NetConnection -ComputerName YOUR_IP -Port 1935

# If blocked, allow in firewall:
New-NetFirewallRule -DisplayName "RTMP Server" -Direction Inbound -LocalPort 1935 -Protocol TCP -Action Allow
```

### Problem: High CPU Usage

**Solutions:**
1. Switch to hardware encoder (NVENC, QuickSync, AMF)
2. Change x264 preset from "slow" → "veryfast"
3. Lower resolution from 1080p → 720p
4. Lower FPS from 60 → 30
5. Close other applications

### Problem: Dropped Frames

**Encoding Lag:**
- Use hardware encoder
- Lower x264 preset
- Reduce resolution/FPS

**Rendering Lag:**
- Close other programs
- Lower game graphics settings
- Use Game Mode (Windows)
- Update GPU drivers

### Problem: Poor Quality

**Solutions:**
1. Increase bitrate (2500 → 4500 → 6000 Kbps)
2. Change encoder preset to slower setting
3. Use "high" profile instead of "main"
4. Increase resolution
5. Enable Psycho Visual Tuning (NVENC)
6. Use Lanczos downscale filter

### Problem: High Latency

**Solutions:**
1. Set Keyframe Interval to 1-2 seconds
2. Use "zerolatency" tune (x264)
3. Disable Look-ahead (NVENC)
4. Set B-frames to 0-2
5. Use hardware encoder with low-latency preset
6. Reduce bitrate

### Problem: Blocky/Pixelated Video

**Causes:**
- Bitrate too low for resolution
- Fast motion with low keyframe interval

**Solutions:**
1. Increase bitrate
2. Lower resolution
3. Set Keyframe Interval to 2 seconds
4. Use slower encoder preset
5. Reduce source motion complexity

## 🎓 Advanced Configuration

### Custom x264 Parameters

**Settings → Output → Recording → Custom Encoder Settings:**

```
# Ultra low latency
tune=zerolatency bframes=0 rc-lookahead=0

# High quality
preset=slow profile=high crf=18

# Balanced
preset=veryfast tune=zerolatency bframes=2

# Film content
preset=medium tune=film
```

### NVENC Advanced Settings

Enable **Psycho Visual Tuning**: Better quality for complex scenes
Set **GPU**: 0 (use specific GPU in multi-GPU systems)
**Max B-frames**: 2 (balance between quality and latency)

### Multiple Bitrate Testing

Create multiple profiles in OBS:
1. Profile → New → "Test 2500kbps"
2. Configure settings
3. Profile → New → "Test 5000kbps"
4. Switch between profiles to test

### Recording While Streaming

**Settings → Output → Recording:**
```
Type: Standard
Recording Format: mp4
Encoder: Use stream encoder or x264
Quality: Same as stream
```

Allows you to review quality later.

## 📈 Benchmarking Your Settings

### Test Checklist

- [ ] Stream connects successfully
- [ ] CPU usage acceptable (<40%)
- [ ] No dropped frames
- [ ] Quality acceptable in playback
- [ ] Latency acceptable (<3 seconds)
- [ ] Stable bitrate
- [ ] No encoding lag
- [ ] No rendering lag

### Document Your Results

Create a spreadsheet:

| Encoder | Preset | Bitrate | Resolution | FPS | CPU % | Quality | Latency |
|---------|--------|---------|------------|-----|-------|---------|---------|
| x264    | fast   | 2500    | 1080p      | 30  | 25%   | Good    | 2s      |
| NVENC   | Quality| 2500    | 1080p      | 60  | 5%    | Good    | 1.5s    |

## 🎥 Example Configurations

### Configuration 1: Maximum Quality
```
Encoder: x264
Preset: slow
Bitrate: 8000 Kbps
Resolution: 1920x1080
FPS: 60
Keyframe: 2s
Profile: high
Tune: film
```

### Configuration 2: Low Latency Gaming
```
Encoder: NVENC
Preset: Low-Latency
Bitrate: 4500 Kbps
Resolution: 1920x1080
FPS: 60
Keyframe: 1s
Look-ahead: OFF
B-frames: 0
```

### Configuration 3: Low CPU Usage
```
Encoder: QuickSync
Preset: balanced
Bitrate: 3500 Kbps
Resolution: 1280x720
FPS: 30
Keyframe: 2s
```

### Configuration 4: Poor Network Simulation
```
Encoder: x264
Preset: veryfast
Bitrate: 800 Kbps
Resolution: 640x360
FPS: 24
Keyframe: 4s
```

---

## 🎯 Quick Reference Card

**Print and keep handy:**

```
┌─────────────────────────────────────────┐
│  LOCAL STREAM SERVER - OBS QUICK REF    │
├─────────────────────────────────────────┤
│  Server:     rtmp://YOUR_IP:1935/live   │
│  Stream Key: [Generate in web UI]       │
│                                          │
│  ENCODER PRESETS:                       │
│  • x264: veryfast to medium             │
│  • NVENC: Quality or Max Quality        │
│  • QuickSync: balanced                  │
│                                          │
│  LOW LATENCY:                           │
│  • Keyframe: 1-2 seconds                │
│  • Tune: zerolatency (x264)             │
│  • Look-ahead: OFF (NVENC)              │
│                                          │
│  QUALITY TIERS:                         │
│  • Good: 2500 kbps @ 720p30             │
│  • Better: 4500 kbps @ 1080p30          │
│  • Best: 6000 kbps @ 1080p60            │
└─────────────────────────────────────────┘
```

---

**Happy Testing! 🚀**
