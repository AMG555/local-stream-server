# OBS Studio Setup Guide for Local Stream Server

**Universal encoder testing for YouTube, Facebook, Twitch, Instagram, TikTok, LinkedIn, and any RTMP platform.** 🎬

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

### 🚀 ULTRA-LOW LATENCY (1.5-2.5 seconds)

**Best for encoder testing and near-real-time streaming**

#### Software Encoder (x264) - Best Quality

**Settings → Output**
```
Output Mode: Advanced → Streaming Tab
Encoder: x264
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
CPU Usage Preset: ultrafast (low CPU) or veryfast (better quality)
Profile: baseline (fastest decode) or main (better quality)
Tune: zerolatency
x264 Options: bframes=0 rc-lookahead=0 nal-hrd=cbr
```

**Why these settings:**
- `Keyframe Interval: 1` - Matches 1s HLS segments for instant seeking
- `tune=zerolatency` - Disables frame buffering and look-ahead
- `bframes=0` - No bidirectional frames (instant encoding)
- `rc-lookahead=0` - No lookahead delay
- `nal-hrd=cbr` - Strict bitrate control
- `ultrafast` - 5-10% CPU, `veryfast` - 15-25% CPU

**Expected: 1.5-2.5 seconds latency**

---

#### NVIDIA NVENC - Best Performance

**Settings → Output**
```
Output Mode: Advanced → Streaming Tab
Encoder: NVENC H.264 (new)
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Preset: P1: Fastest (Low-Latency) or P3: Fast
Tuning: Ultra Low Latency
Multipass Mode: Single Pass
Profile: high
Look-ahead: OFF (critical!)
Psycho Visual Tuning: OFF (reduces latency)
GPU: 0
Max B-frames: 0
```

**Why these settings:**
- `Preset P1` - Fastest encoding (<2% CPU usage)
- `Tuning: Ultra Low Latency` - Optimizes for speed
- `Look-ahead: OFF` - Disables prediction buffer (saves ~100ms)
- `Max B-frames: 0` - Instant encoding
- `Psycho Visual Tuning: OFF` - Faster encoding

**Expected: 1.5-2.0 seconds latency, <3% CPU**

---

#### AMD AMF - AMD GPU

**Settings → Output**
```
Output Mode: Advanced → Streaming Tab
Encoder: AMD HW H.264 (AVC)
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Preset: Speed
Profile: High
Quality Preset: Speed
View Mode: Basic
```

**Why these settings:**
- `Preset: Speed` - Fastest encoding
- `Quality Preset: Speed` - Prioritizes latency over quality

**Expected: 1.5-2.5 seconds latency, <5% CPU**

---

#### Intel QuickSync - Integrated GPU

**Settings → Output**
```
Output Mode: Advanced → Streaming Tab
Encoder: QuickSync H.264
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Target Usage: speed
Profile: high
Async Depth: 1
```

**Why these settings:**
- `Target Usage: speed` - Low latency mode
- `Async Depth: 1` - Minimal buffering

**Expected: 1.8-2.5 seconds latency, <5% CPU**

---

### 📹 VIDEO SETTINGS (All Encoders)

**Settings → Video**
```
Base (Canvas) Resolution: 1920x1080
Output (Scaled) Resolution: 1920x1080
Downscale Filter: Bilinear (fastest) or Lanczos (best quality)
Common FPS Values: 60 (smooth) or 30 (lower bitrate)
```

**For lower CPU/bandwidth:**
```
Output Resolution: 1280x720
FPS: 30
Downscale Filter: Bilinear
```

---

### 🎵 AUDIO SETTINGS (All Encoders)

**Settings → Audio**
```
Sample Rate: 48 kHz
Channels: Stereo
```

**Settings → Output → Audio Track**
```
Audio Bitrate: 160 (recommended) or 128 (lower bandwidth)
```

---

### ⚡ ADVANCED SETTINGS (Critical for Low Latency)

**Settings → Advanced**
```
Process Priority: High
Renderer: Direct3D 11 (Windows) or OpenGL (Mac/Linux)

Color Format: NV12
Color Space: 709
Color Range: Limited

Network Buffering: Low latency mode (if available)
```

---

### 🧪 For Testing (Low CPU Usage)

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
Output Resolution: 1280x720
Downscale Filter: Bilinear (Fastest)
FPS: 30
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

### Scenario 1: ABSOLUTE LOWEST LATENCY (1.5-2s)

**Use this for near-real-time testing**

```
Encoder: NVENC H.264 (new) - FASTEST
Rate Control: CBR
Bitrate: 4500 Kbps
Keyframe Interval: 1
Preset: P1 (Fastest)
Tuning: Ultra Low Latency
Look-ahead: OFF
Psycho Visual Tuning: OFF
Max B-frames: 0
Profile: high

Resolution: 1920x1080
FPS: 60
Downscale Filter: Bilinear
```

**Advanced Settings:**
```
Process Priority: High
Network Buffering: Low latency mode
```

**Why NVENC for lowest latency:**
- Hardware encoding = instant
- No CPU bottleneck
- P1 preset = fastest possible
- No look-ahead = no buffer delay
- B-frames=0 = no frame reordering

---

### Scenario 2: BEST QUALITY WITH LOW LATENCY (2-2.5s)

**Use this when quality matters but still need low latency**

```
Encoder: x264
Rate Control: CBR
Bitrate: 6000 Kbps
Keyframe Interval: 1
CPU Usage Preset: veryfast (or fast if CPU allows)
Profile: main
Tune: zerolatency
x264 Options: bframes=0 rc-lookahead=0 nal-hrd=cbr

Resolution: 1920x1080
FPS: 60
Downscale Filter: Lanczos (better quality)
```

**Trade-off:**
- Better quality than NVENC
- Uses 15-25% CPU (veryfast) or 30-40% (fast)
- +0.5s latency vs NVENC

---

### Scenario 3: Testing Network Bandwidth

**Progressive bitrate testing**

```
Base Config (all tests):
Encoder: NVENC or QuickSync (low CPU)
Keyframe Interval: 1
Resolution: 1920x1080
FPS: 30

Test 1 - Low:
Bitrate: 1000 Kbps

Test 2 - Medium:
Bitrate: 2500 Kbps

Test 3 - High:
Bitrate: 5000 Kbps

Test 4 - Ultra:
Bitrate: 8000 Kbps
```

Monitor web UI for stable bitrate and connection quality.

---

### Scenario 4: Testing Quality vs Performance

**Test A (PERFORMANCE - <5% CPU):**
```
Encoder: NVENC H.264
Preset: P1 (Fastest)
Tuning: Ultra Low Latency
Bitrate: 4500 Kbps
Resolution: 1920x1080
FPS: 60
Keyframe: 1
Look-ahead: OFF
Max B-frames: 0
```

**Test B (QUALITY - 20-30% CPU):**
```
Encoder: x264
Preset: veryfast
Tune: zerolatency
Bitrate: 6000 Kbps
Resolution: 1920x1080
FPS: 60
Keyframe: 1
x264 Options: bframes=0 rc-lookahead=0
```

**Test C (BALANCED - 10-15% CPU):**
```
Encoder: NVENC H.264
Preset: P5 (Slow)
Tuning: High Quality
Bitrate: 5000 Kbps
Resolution: 1920x1080
FPS: 60
Keyframe: 1
Look-ahead: OFF
Psycho Visual Tuning: ON
Max B-frames: 2
```

Compare CPU usage, quality, and latency in recordings.

---

### Scenario 5: Simulating Bad Network (Mobile Fallback)

**Worst-case mobile connection**

```
Encoder: x264
Preset: ultrafast
Bitrate: 800 Kbps
Buffer Size: 1600 Kbps (2x bitrate)
Keyframe Interval: 2
Resolution: 854x480
FPS: 24
Profile: baseline
Tune: zerolatency
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

### Low Latency Test Checklist

Test your configuration against these criteria:

- [ ] Stream connects successfully within 2 seconds
- [ ] CPU usage acceptable (<40%, <5% for NVENC)
- [ ] No dropped frames (0.0%)
- [ ] No encoding lag warnings
- [ ] No rendering lag warnings
- [ ] Quality acceptable in playback (subjective)
- [ ] **Latency 1.5-2.5 seconds** (measure with stopwatch)
- [ ] Stable bitrate (±10% of target)
- [ ] Video plays smoothly without buffering
- [ ] "GO LIVE" button rarely appears (<2s drift)
- [ ] Auto-jump to live works when >4s behind

### Measuring Actual Latency

**Method 1: Stopwatch**
1. Display a stopwatch/timer on screen
2. Start streaming
3. Open web UI player
4. Compare stopwatch times
5. Difference = your latency

**Example:**
- OBS shows: 10.5 seconds
- Web player shows: 8.7 seconds
- Latency: 1.8 seconds ✓

**Method 2: Audio Clap**
1. Clap loudly near microphone
2. Watch for visual waveform in OBS
3. Count seconds until you hear it in web player
4. That's your end-to-end latency

### Document Your Results

Create a spreadsheet to track encoder performance:

| Encoder | Preset | Bitrate | Res | FPS | CPU % | Latency | Quality | Notes |
|---------|--------|---------|-----|-----|-------|---------|---------|-------|
| NVENC   | P1     | 4500    | 1080p | 60 | 3%   | 1.6s    | Good    | Fastest |
| NVENC   | P5     | 5000    | 1080p | 60 | 5%   | 1.8s    | Great   | Balanced |
| x264    | veryfast | 6000  | 1080p | 60 | 22%  | 2.1s    | Best    | High CPU |
| QuickSync | speed | 4000   | 1080p | 60 | 4%   | 2.3s    | Good    | Intel iGPU |
| x264    | ultrafast | 4500 | 720p | 30 | 8%   | 1.9s    | OK      | Low end |

### Quality Assessment Scale

**Excellent (9-10/10):**
- No visible compression artifacts
- Smooth motion in fast scenes
- Text is sharp and readable
- Colors accurate

**Good (7-8/10):**
- Minor artifacts in very fast motion
- Text mostly readable
- Acceptable for most use cases

**Acceptable (5-6/10):**
- Visible compression in fast motion
- Some blockiness in dark scenes
- Usable for testing

**Poor (<5/10):**
- Heavy blockiness
- Blurry text
- Significant artifacts
- Increase bitrate or change settings

## 🎥 Example Configurations

### Configuration 1: ABSOLUTE FASTEST (NVENC Ultra-Low Latency)

**Best for: Real-time encoder testing, minimal latency**

```
╔═══════════════════════════════════════════╗
║  ULTRA-LOW LATENCY - NVENC (1.5-2.0s)    ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: NVENC H.264 (new)              ║
║  Rate Control: CBR                        ║
║  Bitrate: 4500 Kbps                      ║
║  Keyframe Interval: 1                    ║
║  Preset: P1 (Fastest)                    ║
║  Tuning: Ultra Low Latency               ║
║  Profile: high                           ║
║  Look-ahead: OFF                         ║
║  Psycho Visual Tuning: OFF               ║
║  GPU: 0                                  ║
║  Max B-frames: 0                         ║
║                                          ║
║  Resolution: 1920x1080                   ║
║  FPS: 60                                 ║
║  Downscale: Bilinear                     ║
║                                          ║
║  Expected CPU: <3%                       ║
║  Expected Latency: 1.5-2.0 seconds       ║
║  Quality: Good                           ║
╚═══════════════════════════════════════════╝
```

---

### Configuration 2: BEST QUALITY LOW LATENCY (x264 Fast)

**Best for: Quality testing with acceptable latency**

```
╔═══════════════════════════════════════════╗
║  QUALITY + LOW LATENCY - x264 (2-2.5s)   ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: x264                           ║
║  Rate Control: CBR                        ║
║  Bitrate: 6000 Kbps                      ║
║  Keyframe Interval: 1                    ║
║  CPU Usage Preset: veryfast              ║
║  Profile: main                           ║
║  Tune: zerolatency                       ║
║  x264 Options:                           ║
║    bframes=0 rc-lookahead=0 nal-hrd=cbr ║
║                                          ║
║  Resolution: 1920x1080                   ║
║  FPS: 60                                 ║
║  Downscale: Lanczos                      ║
║                                          ║
║  Expected CPU: 20-30%                    ║
║  Expected Latency: 2.0-2.5 seconds       ║
║  Quality: Excellent                      ║
╚═══════════════════════════════════════════╝
```

---

### Configuration 3: LOW CPU USAGE (QuickSync/Intel)

**Best for: Integrated GPU systems, power efficiency**

```
╔═══════════════════════════════════════════╗
║  LOW CPU - QUICKSYNC (1.8-2.5s)          ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: QuickSync H.264                ║
║  Rate Control: CBR                        ║
║  Bitrate: 4000 Kbps                      ║
║  Keyframe Interval: 1                    ║
║  Target Usage: speed                     ║
║  Profile: high                           ║
║  Async Depth: 1                          ║
║                                          ║
║  Resolution: 1920x1080                   ║
║  FPS: 60                                 ║
║  Downscale: Bilinear                     ║
║                                          ║
║  Expected CPU: <5%                       ║
║  Expected Latency: 1.8-2.5 seconds       ║
║  Quality: Good                           ║
╚═══════════════════════════════════════════╝
```

---

### Configuration 4: AMD GPU (AMF)

**Best for: AMD Radeon GPU systems**

```
╔═══════════════════════════════════════════╗
║  AMD GPU - AMF (1.5-2.5s)                ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: AMD HW H.264 (AVC)             ║
║  Rate Control: CBR                        ║
║  Bitrate: 4500 Kbps                      ║
║  Keyframe Interval: 1                    ║
║  Preset: Speed                           ║
║  Profile: High                           ║
║  Quality Preset: Speed                   ║
║  View Mode: Basic                        ║
║                                          ║
║  Resolution: 1920x1080                   ║
║  FPS: 60                                 ║
║  Downscale: Bilinear                     ║
║                                          ║
║  Expected CPU: <5%                       ║
║  Expected Latency: 1.5-2.5 seconds       ║
║  Quality: Good                           ║
╚═══════════════════════════════════════════╝
```

---

### Configuration 5: POOR NETWORK SIMULATION

**Best for: Testing fallback quality**

```
╔═══════════════════════════════════════════╗
║  MOBILE / LOW BANDWIDTH (3-4s)           ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: x264                           ║
║  Rate Control: CBR                        ║
║  Bitrate: 800 Kbps                       ║
║  Buffer Size: 1600 Kbps                  ║
║  Keyframe Interval: 2                    ║
║  CPU Usage Preset: ultrafast             ║
║  Profile: baseline                       ║
║  Tune: zerolatency                       ║
║                                          ║
║  Resolution: 854x480                     ║
║  FPS: 24                                 ║
║  Downscale: Bilinear                     ║
║                                          ║
║  Expected CPU: 5-8%                      ║
║  Expected Latency: 3-4 seconds           ║
║  Quality: Acceptable                     ║
╚═══════════════════════════════════════════╝
```

---

### Configuration 6: BALANCED QUALITY & PERFORMANCE

**Best for: Most users, good balance**

```
╔═══════════════════════════════════════════╗
║  BALANCED - NVENC P5 (1.8-2.2s)          ║
╠═══════════════════════════════════════════╣
║  Output Mode: Advanced                    ║
║  Encoder: NVENC H.264 (new)              ║
║  Rate Control: CBR                        ║
║  Bitrate: 5000 Kbps                      ║
║  Keyframe Interval: 1                    ║
║  Preset: P5 (Slow)                       ║
║  Tuning: High Quality                    ║
║  Profile: high                           ║
║  Look-ahead: OFF                         ║
║  Psycho Visual Tuning: ON                ║
║  GPU: 0                                  ║
║  Max B-frames: 2                         ║
║                                          ║
║  Resolution: 1920x1080                   ║
║  FPS: 60                                 ║
║  Downscale: Lanczos                      ║
║                                          ║
║  Expected CPU: ~5%                       ║
║  Expected Latency: 1.8-2.2 seconds       ║
║  Quality: Great                          ║
╚═══════════════════════════════════════════╝
```

---

## 🎯 Quick Reference Card

**Print and keep handy:**

```
╔═══════════════════════════════════════════════════════════════╗
║        LOCAL STREAM SERVER - OBS ULTRA-LOW LATENCY           ║
╠═══════════════════════════════════════════════════════════════╣
║  SERVER SETTINGS:                                            ║
║  ├─ Server: rtmp://YOUR_LOCAL_IP:1935/live                   ║
║  ├─ Stream Key: [Generate at http://YOUR_IP:8000]            ║
║  └─ Expected Latency: 1.5-2.5 seconds                        ║
║                                                              ║
║  CRITICAL LOW-LATENCY SETTINGS:                              ║
║  ├─ Keyframe Interval: 1 (matches 1s HLS segments)           ║
║  ├─ Rate Control: CBR                                        ║
║  ├─ Process Priority: High (Advanced settings)               ║
║  └─ Network Buffering: Low latency mode                      ║
║                                                              ║
║  ENCODER QUICK CONFIGS:                                      ║
║                                                              ║
║  ┌─ FASTEST (NVENC P1) ────────────────────────────────┐    ║
║  │ Preset: P1 (Fastest) | Tuning: Ultra Low Latency    │    ║
║  │ Look-ahead: OFF | B-frames: 0 | PV Tuning: OFF      │    ║
║  │ Bitrate: 4500 Kbps | CPU: <3% | Latency: 1.5-2.0s   │    ║
║  └───────────────────────────────────────────────────────┘    ║
║                                                              ║
║  ┌─ QUALITY (x264 veryfast) ────────────────────────────┐    ║
║  │ Preset: veryfast | Tune: zerolatency                 │    ║
║  │ x264: bframes=0 rc-lookahead=0 nal-hrd=cbr          │    ║
║  │ Bitrate: 6000 Kbps | CPU: 20-30% | Latency: 2-2.5s  │    ║
║  └───────────────────────────────────────────────────────┘    ║
║                                                              ║
║  ┌─ BALANCED (NVENC P5) ────────────────────────────────┐    ║
║  │ Preset: P5 (Slow) | Tuning: High Quality            │    ║
║  │ Look-ahead: OFF | B-frames: 2 | PV Tuning: ON       │    ║
║  │ Bitrate: 5000 Kbps | CPU: ~5% | Latency: 1.8-2.2s   │    ║
║  └───────────────────────────────────────────────────────┘    ║
║                                                              ║
║  RESOLUTION & FPS PRESETS:                                   ║
║  ├─ Best Quality: 1920x1080 @ 60fps (6000 Kbps)             ║
║  ├─ Balanced: 1920x1080 @ 30fps (4500 Kbps)                 ║
║  ├─ Performance: 1280x720 @ 30fps (2500 Kbps)               ║
║  └─ Low Bandwidth: 854x480 @ 24fps (800 Kbps)               ║
║                                                              ║
║  QUALITY TIERS BY BITRATE:                                   ║
║  ├─ 1080p60: 5000-8000 Kbps (Excellent)                     ║
║  ├─ 1080p30: 3500-5000 Kbps (Great)                         ║
║  ├─ 720p60:  3500-5000 Kbps (Good)                          ║
║  ├─ 720p30:  2000-3500 Kbps (Acceptable)                    ║
║  └─ 480p30:  800-1500 Kbps (Mobile)                         ║
║                                                              ║
║  TROUBLESHOOTING:                                            ║
║  ├─ High CPU: Use NVENC/QuickSync/AMF (hardware)            ║
║  ├─ Dropped Frames: Lower preset/resolution/FPS             ║
║  ├─ Poor Quality: Increase bitrate, slower preset           ║
║  ├─ High Latency: Keyframe=1, Look-ahead OFF, B-frames=0    ║
║  └─ Can't Connect: Check firewall port 1935, stream key     ║
║                                                              ║
║  MONITORING IN WEB UI:                                       ║
║  ├─ Watch at: http://YOUR_IP:8000                           ║
║  ├─ "LIVE" badge: You're at live edge                       ║
║  ├─ "GO LIVE" button: >2s behind (click to jump)            ║
║  └─ Auto-jump: Triggers at >4s behind                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Happy Testing! 🚀**
