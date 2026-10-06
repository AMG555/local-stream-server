# Port Configuration Changes

**⚠️ IMPORTANT: This server uses non-standard ports to avoid conflicts with other Cloudflare tunnels**

## New Port Configuration

### Node.js Server
- **HTTP (Web Interface)**: `9000` _(was 8000)_
- **RTMP (Stream Ingest)**: `2935` _(was 1935)_
- **HLS (Media Server)**: `9081` _(was 8081)_

### Go Media Server
- **RTMP (Relay)**: `2936` _(was 1936)_
- **SRT (Ultra-low latency)**: `9554` _(was 8554)_
- **API/WebSocket/WebRTC**: `9084` _(was 8084)_

## Quick Reference

### For OBS/Encoders
```
Server: rtmp://YOUR_IP:2935/live
Stream Key: [from web interface]
```

### For Web Interface
```
http://YOUR_IP:9000
```

### For HLS Playback
```
http://YOUR_IP:9081/live/STREAM_KEY/index.m3u8
```

### For SRT Ingest (Go server)
```
srt://YOUR_IP:9554?streamid=key=STREAM_KEY&latency=120000
```

## Firewall Rules

### Windows PowerShell
```powershell
New-NetFirewallRule -DisplayName "Stream RTMP" -Direction Inbound -LocalPort 2935 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Stream HTTP" -Direction Inbound -LocalPort 9000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Stream HLS" -Direction Inbound -LocalPort 9081 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Stream SRT" -Direction Inbound -LocalPort 9554 -Protocol UDP -Action Allow
```

### Linux (UFW)
```bash
sudo ufw allow 2935/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 9081/tcp
sudo ufw allow 9554/udp
```

## Cloudflare Tunnel Configuration

Update `cloudflare-tunnel-config.yml`:
```yaml
ingress:
  - hostname: stream.your-domain.com
    service: http://localhost:9000
  
  - hostname: rtmp.your-domain.com
    service: tcp://localhost:2935
  
  - hostname: media.your-domain.com
    service: http://localhost:9081
  
  - service: http_status:404
```

## Why These Ports?

Standard RTMP (1935) and HTTP (8000/8081) ports are commonly used by other streaming services and Cloudflare tunnels. Using different ports prevents conflicts when running multiple streaming servers or tunnels on the same machine.

## Reverting to Standard Ports

To use standard ports, edit `server.js`:
```javascript
const HTTP_PORT = 8000;   // or 9000
const RTMP_PORT = 1935;   // or 2935
const MEDIA_PORT = 8081;  // or 9081
```

And `go-media-server/config.yml`:
```yaml
rtmp:
  port: 1936  # or 2936
srt:
  port: 8554  # or 9554
api:
  port: 8084  # or 9084
```

Then restart both servers.
