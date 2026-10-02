# Complete Encoder Comparison for Ultra-Low Latency Streaming

**Local Stream Server - Comprehensive Encoder Guide**

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Encoder Overview](#encoder-overview)
3. [NVIDIA NVENC](#nvidia-nvenc)
4. [x264 (Software)](#x264-software)
5. [Intel QuickSync](#intel-quicksync)
6. [AMD AMF](#amd-amf)
7. [Apple VideoToolbox](#apple-videotoolbox)
8. [Comparison Tables](#comparison-tables)
9. [Decision Matrix](#decision-matrix)

---

## Executive Summary

### Quick Recommendations

**For ABSOLUTE LOWEST LATENCY (1.5-2.0s):**
- **Use:** NVIDIA NVENC P1
- **Why:** Hardware encoding, zero CPU load, instant processing
- **Requires:** NVIDIA GPU (GTX 1050+ or RTX series)

**For BEST QUALITY with Low Latency (2.0-2.5s):**
- **Use:** x264 veryfast/fast
- **Why:** Superior compression, better quality at same bitrate
- **Requires:** Strong CPU (i7/Ryzen 7+), 20-30% CPU usage acceptable

**For LOW CPU SYSTEMS:**
- **Use:** Intel QuickSync or AMD AMF
- **Why:** Hardware encoding, minimal CPU load
- **Requires:** Intel iGPU enabled or AMD GPU

---

## Encoder Overview

### What is a Video Encoder?

An encoder compresses raw video into a streamable format (H.264/AVC). Two types exist:

**Software Encoders (x264):**
- CPU processes every frame
- Flexible settings
- Best quality per bitrate
- High CPU usage

**Hardware Encoders (NVENC/QuickSync/AMF):**
- Dedicated silicon chip encodes
- Fixed algorithms
- Lower CPU usage
- Slightly lower quality

---

## NVIDIA NVENC

### Overview

NVIDIA's hardware encoder built into GeForce and Quadro GPUs since GTX 600 series (2012). Newer generations have significantly better quality.

### Generations

| Generation | GPUs | Quality | Features |
|------------|------|---------|----------|
| **1st Gen** | GTX 600-900 | Fair | Basic H.264 |
| **2nd Gen** | GTX 1050-1080 Ti | Good | Better rate control |
| **3rd Gen** | GTX 1650-1660, RTX 20 | Great | B-frames, lookahead |
| **4th Gen** | RTX 30/40 series | Excellent | AV1, improved quality |

### Ultra-Low Latency Settings

```
Output Mode: Advanced → Streaming Tab
Encoder: NVENC H.264 (new)
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Preset: P1 (Fastest) - ULTRA LOW LATENCY
Tuning: Ultra Low Latency
Multipass Mode: Single Pass (fastest)
Profile: high
Look-ahead: OFF (critical - saves 100ms+)
Psycho Visual Tuning: OFF (saves 20-50ms)
GPU: 0
Max B-frames: 0 (instant encoding)
```

### Preset Comparison (NVENC)

| Preset | Encoding Speed | Quality | Latency | Use Case |
|--------|---------------|---------|---------|----------|
| **P1** | Fastest | Good | Lowest | Ultra-low latency |
| **P2** | Faster | Good+ | Low | Low latency |
| **P3** | Fast | Better | Low | Balanced |
| **P4** | Medium | Better | Medium | Quality focus |
| **P5** | Slow | Great | Medium | Quality priority |
| **P6** | Slower | Great+ | Higher | Max quality |
| **P7** | Slowest | Best | Highest | Offline encoding |

**For local server: Use P1 or P2**

### Pros & Cons

**Pros:**
- ✅ <3% CPU usage (frees CPU for other tasks)
- ✅ Consistent performance (not affected by CPU load)
- ✅ Lowest latency possible (1.5-2.0s)
- ✅ No thermal throttling concerns
- ✅ Multiple streams possible (2+ simultaneous)
- ✅ Excellent quality on RTX 20+ series

**Cons:**
- ❌ Requires NVIDIA GPU (not available on AMD/Intel-only)
- ❌ Slightly lower quality than x264 at same bitrate (GTX 16 series)
- ❌ GPU memory usage (~100-200MB)
- ❌ Older GPUs (GTX 900) have noticeably worse quality

### Performance Metrics

| Resolution | FPS | Bitrate | GPU | CPU Usage | Latency | Quality |
|------------|-----|---------|-----|-----------|---------|---------|
| 1080p | 60 | 4500 | RTX 3060 | 2-3% | 1.6s | Great |
| 1080p | 60 | 6000 | RTX 3060 | 2-3% | 1.6s | Excellent |
| 1080p | 30 | 3500 | GTX 1660 | 2-4% | 1.7s | Good |
| 720p | 60 | 3500 | GTX 1050 | 3-5% | 1.8s | Good |

---

## x264 (Software)

### Overview

Open-source H.264 encoder. Industry standard for quality. Used by Netflix, YouTube transcoding, and professional broadcasting.

### Ultra-Low Latency Settings

```
Output Mode: Advanced → Streaming Tab
Encoder: x264
Rate Control: CBR
Bitrate: 5000-7000 Kbps (higher for software quality)
Keyframe Interval: 1
CPU Usage Preset: ultrafast (lowest CPU) or veryfast (better quality)
Profile: baseline (fastest decode) or main (balance) or high (best quality)
Tune: zerolatency (critical!)
x264 Options: bframes=0 rc-lookahead=0 nal-hrd=cbr
```

### Preset Comparison (x264)

| Preset | CPU Usage | Quality | Latency | Bitrate Efficiency | Use Case |
|--------|-----------|---------|---------|-------------------|----------|
| **ultrafast** | 5-10% | Fair | Lowest | 70% | Very weak CPUs |
| **superfast** | 10-15% | Fair+ | Very Low | 75% | Weak CPUs |
| **veryfast** | 15-25% | Good | Low | 85% | **Recommended** |
| **faster** | 25-35% | Better | Low | 90% | Strong CPUs |
| **fast** | 35-45% | Great | Medium | 95% | Very strong CPUs |
| **medium** | 50-70% | Excellent | Medium | 100% | Offline only |
| **slow** | 80-100% | Best | High | 105% | Offline only |

**For local server: Use veryfast or faster**

### Pros & Cons

**Pros:**
- ✅ Best quality per bitrate (10-20% better than NVENC)
- ✅ No GPU required
- ✅ Fine-grained control (100+ tunable parameters)
- ✅ Works on any system
- ✅ Mature, battle-tested
- ✅ Better text readability and detail preservation

**Cons:**
- ❌ High CPU usage (15-40% typical)
- ❌ Performance affected by CPU load
- ❌ Heat generation
- ❌ Slower encoding (adds ~0.3-0.5s latency vs NVENC)
- ❌ May drop frames on weak CPUs
- ❌ Single stream only (CPU can't handle multiple)

### Performance Metrics

| Resolution | FPS | Bitrate | Preset | CPU | CPU Usage | Latency | Quality |
|------------|-----|---------|--------|-----|-----------|---------|---------|
| 1080p | 60 | 6000 | veryfast | i7-10700 | 22% | 2.1s | Excellent |
| 1080p | 60 | 5000 | veryfast | Ryzen 5600 | 18% | 2.2s | Great |
| 1080p | 30 | 4000 | faster | i5-11400 | 28% | 2.3s | Excellent |
| 720p | 60 | 3500 | veryfast | i5-9400 | 15% | 2.1s | Good |
| 1080p | 60 | 4500 | ultrafast | i3-10100 | 8% | 1.9s | Fair |

### Advanced x264 Parameters

**For ultra-low latency:**
```
tune=zerolatency bframes=0 rc-lookahead=0 nal-hrd=cbr force-cfr=1
```

**For best quality (still low latency):**
```
tune=zerolatency bframes=0 rc-lookahead=0 aq-mode=3 aq-strength=0.8
```

**For weak CPUs:**
```
tune=zerolatency bframes=0 rc-lookahead=0 subme=0 me=dia ref=1
```

---

## Intel QuickSync

### Overview

Intel's hardware encoder integrated into CPUs with iGPU (since 2nd gen Sandy Bridge, 2011). Quality improved significantly with 7th gen (Kaby Lake) and newer.

### Ultra-Low Latency Settings

```
Output Mode: Advanced → Streaming Tab
Encoder: QuickSync H.264
Rate Control: CBR
Bitrate: 4000-5000 Kbps
Keyframe Interval: 1
Target Usage: speed (low latency) or balanced
Profile: high
Async Depth: 1 (minimal buffering)
Low Power: OFF (better quality)
```

### Generations

| Intel Gen | Architecture | Year | Quality | Notes |
|-----------|-------------|------|---------|-------|
| **2nd-6th** | Sandy-Skylake | 2011-2015 | Fair | Basic quality |
| **7th-9th** | Kaby-Coffee | 2017-2019 | Good | Major improvement |
| **10th-11th** | Comet-Rocket | 2020-2021 | Great | Near NVENC quality |
| **12th-14th** | Alder-Raptor | 2021-2024 | Excellent | Competitive quality |

### Pros & Cons

**Pros:**
- ✅ Built into most Intel CPUs (free encoder)
- ✅ <5% CPU usage
- ✅ Good quality on 7th gen+
- ✅ Low latency (1.8-2.5s)
- ✅ Works even with dedicated GPU active
- ✅ Power efficient (good for laptops)

**Cons:**
- ❌ Requires enabled iGPU in BIOS (often disabled with dGPU)
- ❌ Quality lower than NVENC on older generations
- ❌ Limited to Intel CPUs
- ❌ May conflict with other hardware encoders
- ❌ Fewer tuning options than x264

### Performance Metrics

| Resolution | FPS | Bitrate | CPU Gen | CPU Usage | Latency | Quality |
|------------|-----|---------|---------|-----------|---------|---------|
| 1080p | 60 | 4500 | 12th (Alder) | 3-4% | 2.0s | Great |
| 1080p | 60 | 4000 | 10th (Comet) | 4-5% | 2.2s | Good |
| 1080p | 30 | 3500 | 8th (Coffee) | 3-4% | 2.3s | Good |
| 720p | 60 | 3000 | 7th (Kaby) | 4-5% | 2.4s | Fair+ |

### Enabling QuickSync

**1. Check if iGPU exists:**
```
- Desktop: Most Intel CPUs have iGPU (except F-series: 10400F, 12600KF)
- Laptop: Always has iGPU
```

**2. Enable in BIOS:**
```
1. Reboot → Press DEL/F2 during boot
2. Find "Internal Graphics" or "iGPU Multi-Monitor"
3. Set to "Enabled" or "Auto"
4. Save and exit
```

**3. Verify in OBS:**
```
Settings → Output → Encoder dropdown should show "QuickSync H.264"
```

---

## AMD AMF

### Overview

AMD Advanced Media Framework - hardware encoder in Radeon GPUs since RX 400 series (2016). Quality improved significantly with RX 6000+ series.

### Ultra-Low Latency Settings

```
Output Mode: Advanced → Streaming Tab
Encoder: AMD HW H.264 (AVC)
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Preset: Speed (fastest)
Profile: High
Quality Preset: Speed
View Mode: Basic
```

### GPU Generations

| AMD Series | Year | Quality | Notes |
|------------|------|---------|-------|
| **RX 400/500** | 2016-2017 | Fair | First gen AMF |
| **RX 5000** | 2019 | Good | Improved algorithms |
| **RX 6000** | 2020 | Great | Competitive with NVENC |
| **RX 7000** | 2022 | Great+ | Further refinements |

### Pros & Cons

**Pros:**
- ✅ <5% CPU usage
- ✅ Good quality on RX 6000+ series
- ✅ Low latency (1.5-2.5s)
- ✅ Free with AMD GPU
- ✅ Supports AV1 on RX 7000

**Cons:**
- ❌ Quality varies by GPU generation
- ❌ Fewer tuning options than NVENC
- ❌ Less documentation than NVENC
- ❌ Older GPUs (RX 500) have poor quality
- ❌ Limited to AMD GPUs

### Performance Metrics

| Resolution | FPS | Bitrate | GPU | CPU Usage | Latency | Quality |
|------------|-----|---------|-----|-----------|---------|---------|
| 1080p | 60 | 5000 | RX 6700 XT | 3-4% | 1.8s | Great |
| 1080p | 60 | 4500 | RX 5700 XT | 4-5% | 2.0s | Good |
| 1080p | 30 | 3500 | RX 580 | 4-6% | 2.2s | Fair |
| 720p | 60 | 3500 | RX 6600 | 3-4% | 1.9s | Good |

---

## Apple VideoToolbox

### Overview

Apple's hardware encoder for macOS. Available on Macs with Intel or Apple Silicon (M1/M2/M3).

### Ultra-Low Latency Settings

```
Output Mode: Advanced → Streaming Tab
Encoder: Apple VT H264 Hardware Encoder
Rate Control: CBR
Bitrate: 4500-6000 Kbps
Keyframe Interval: 1
Profile: high
```

### Pros & Cons

**Pros:**
- ✅ Built into all Macs
- ✅ <5% CPU usage
- ✅ Excellent quality on Apple Silicon (M1+)
- ✅ Power efficient
- ✅ Low latency

**Cons:**
- ❌ macOS only
- ❌ Limited tuning options
- ❌ Quality varies (Intel vs Apple Silicon)

---

## Comparison Tables

### Latency Comparison

| Encoder | Preset | Expected Latency | Best For |
|---------|--------|------------------|----------|
| **NVENC** | P1 | **1.5-2.0s** | Absolute lowest |
| **NVENC** | P5 | 1.8-2.2s | Balanced |
| **AMF** | Speed | 1.5-2.5s | AMD users |
| **QuickSync** | Speed | 1.8-2.5s | Intel iGPU |
| **x264** | ultrafast | 1.9-2.2s | Weak CPUs |
| **x264** | veryfast | 2.0-2.5s | Quality + low latency |
| **x264** | fast | 2.3-2.8s | Best quality |

### Quality Comparison (same bitrate)

| Encoder | Quality Score | Notes |
|---------|--------------|-------|
| **x264 fast** | 10/10 | Reference quality |
| **x264 veryfast** | 9/10 | Excellent |
| **NVENC P5 (RTX 30)** | 8.5/10 | Very good |
| **NVENC P1 (RTX 30)** | 7.5/10 | Good |
| **QuickSync (12th gen)** | 7.5/10 | Good |
| **AMF (RX 6000)** | 7/10 | Good |
| **x264 ultrafast** | 6.5/10 | Acceptable |
| **NVENC (GTX 1050)** | 6/10 | Fair |
| **QuickSync (7th gen)** | 5.5/10 | Fair |

### CPU Usage Comparison

| Encoder | Preset | 1080p60 CPU Usage | Notes |
|---------|--------|-------------------|-------|
| **NVENC** | Any | 2-3% | GPU does work |
| **QuickSync** | Any | 3-5% | iGPU does work |
| **AMF** | Any | 3-5% | GPU does work |
| **x264** | ultrafast | 8-12% | Minimal processing |
| **x264** | veryfast | 18-25% | Recommended |
| **x264** | faster | 28-35% | Strong CPUs only |
| **x264** | fast | 40-50% | Very strong CPUs |

---

## Decision Matrix

### Choose Your Encoder

**START HERE:**

```
Do you have an NVIDIA GPU (GTX 1050+)?
├─ YES → Go to NVIDIA path
└─ NO → Go to NO NVIDIA path

NVIDIA path:
├─ Do you want LOWEST latency (<2s)?
│  ├─ YES → Use NVENC P1
│  └─ NO → Do you want best quality?
│     ├─ YES → Use x264 veryfast (if strong CPU)
│     └─ NO → Use NVENC P5 (balanced)
│
└─ Is your GPU RTX 20 series or newer?
   ├─ YES → NVENC P1 or P2 (excellent quality + low latency)
   └─ NO (GTX 16/10 series) → x264 veryfast for better quality

NO NVIDIA path:
├─ Do you have Intel iGPU enabled?
│  ├─ YES → Use QuickSync (7th gen+)
│  └─ NO → Go to AMD check
│
├─ Do you have AMD GPU (RX 5000+)?
│  ├─ YES → Use AMF Speed preset
│  └─ NO → Must use x264
│
└─ CPU only path:
   ├─ Strong CPU (i7/Ryzen 7+)? → x264 veryfast
   ├─ Medium CPU (i5/Ryzen 5)? → x264 ultrafast or superfast
   └─ Weak CPU? → Lower resolution to 720p + x264 ultrafast
```

### By Use Case

**Real-time encoder testing:**
→ **NVENC P1** (1.5-2.0s latency, instant response)

**Quality comparison testing:**
→ **x264 veryfast vs NVENC P5** (compare CPU vs GPU quality)

**Low-end system:**
→ **QuickSync or x264 ultrafast @ 720p30** (minimal resources)

**Laptop/power efficiency:**
→ **QuickSync or Apple VideoToolbox** (low power, no heat)

**Multi-stream testing:**
→ **NVENC** (can handle 2-3 streams simultaneously)

**Professional quality:**
→ **x264 fast** (accept 30% CPU for best quality)

---

## Recommended Combinations

### Configuration 1: FASTEST (Gaming PC with RTX)

```
System: Desktop, RTX 3060+, i5/Ryzen 5+
Encoder: NVENC P1
Bitrate: 4500 Kbps
Resolution: 1080p60
CPU Usage: <3%
Latency: 1.5-1.8s
Quality: Good
```

### Configuration 2: QUALITY (Streaming PC)

```
System: Desktop, i7-12700/Ryzen 7 5800X
Encoder: x264 veryfast
Bitrate: 6000 Kbps
Resolution: 1080p60
CPU Usage: 20-25%
Latency: 2.0-2.3s
Quality: Excellent
```

### Configuration 3: BALANCED (Modern Desktop)

```
System: Desktop, RTX 3070/RX 6700 XT
Encoder: NVENC P5
Bitrate: 5000 Kbps
Resolution: 1080p60
CPU Usage: ~5%
Latency: 1.8-2.0s
Quality: Great
```

### Configuration 4: LOW-END (Office PC)

```
System: i5-10400 with iGPU, no dGPU
Encoder: QuickSync Speed
Bitrate: 3500 Kbps
Resolution: 1080p30 or 720p60
CPU Usage: 4-6%
Latency: 2.2-2.5s
Quality: Good
```

### Configuration 5: LAPTOP (Power Efficiency)

```
System: Laptop, i7-1165G7
Encoder: QuickSync
Bitrate: 3500 Kbps
Resolution: 1080p30
CPU Usage: 3-5%
Latency: 2.0-2.5s
Quality: Good
Power: Low
```

---

## Performance Tuning Tips

### Maximizing NVENC Quality

1. **Use newer GPU** (RTX 20+ much better than GTX)
2. **Increase bitrate** (5000-7000 Kbps instead of 3500)
3. **Enable Psycho Visual Tuning** (if latency allows)
4. **Use P5 preset** instead of P1 (if +0.3s latency acceptable)
5. **Max B-frames: 2** (if latency allows)

### Optimizing x264 Performance

1. **Start with veryfast** then test faster/fast if CPU allows
2. **Use tune=zerolatency** always for live streaming
3. **Set threads=auto** or threads=6 for balance
4. **Disable B-frames** (bframes=0) for lowest latency
5. **Monitor CPU usage** - if >40%, drop to faster preset

### Reducing QuickSync Latency

1. **Async Depth: 1** (minimum buffering)
2. **Target Usage: speed** (low latency mode)
3. **Low Power: OFF** (better quality, not slower)
4. **Update Intel drivers** regularly

### Improving AMF Quality

1. **Use newer GPU** (RX 6000+ significantly better)
2. **Quality Preset: Balanced** (if latency allows)
3. **Increase bitrate** (AMD needs 10-15% more than NVENC)
4. **Update AMD drivers** regularly

---

**Happy Encoding! 🎬**

For server setup and OBS configuration, see [OBS_SETUP_GUIDE.md](OBS_SETUP_GUIDE.md)
