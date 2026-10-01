# Screenshot Guide for README

Take these 4 screenshots to showcase the project:

## 1. Main Dashboard (Empty State)
**What to capture:** Homepage with no active streams
**Browser:** Open http://localhost:8000
**Window size:** 1920x1080 or larger
**Steps:**
1. Open browser
2. Navigate to http://localhost:8000
3. Make sure sidebar is visible
4. Capture full window showing:
   - Local Stream Server logo/title
   - "New Stream Key" button
   - Empty state message
   - Clean sidebar navigation
**Save as:** `screenshots/1-dashboard-empty.png`

## 2. Stream Key Generation Modal
**What to capture:** Modal dialog for creating new stream key
**Steps:**
1. Click "New Stream Key" button
2. Type a stream name (e.g., "My Test Stream")
3. Capture the modal showing:
   - Stream name input
   - Generated stream key
   - Copy button
   - RTMP URL
   - Clear instructions
**Save as:** `screenshots/2-stream-key-modal.png`

## 3. Active Stream with Health Dashboard
**What to capture:** Live stream with excellent health indicators
**Steps:**
1. Create a stream key
2. Open OBS Studio
3. Configure Settings → Stream:
   - Service: Custom
   - Server: rtmp://localhost:1935/live
   - Stream Key: [paste your key]
4. Start streaming from OBS
5. Wait 10-15 seconds for metrics to appear
6. Capture dashboard showing:
   - Active stream card with "LIVE" badge
   - Green "Excellent" health status
   - Real-time metrics (bitrate, FPS, resolution)
   - Health indicators graph
   - Stream duration
**Save as:** `screenshots/3-active-stream-dashboard.png`

## 4. YouTube Preset Settings Panel
**What to capture:** Stream details showing YouTube presets
**Steps:**
1. With stream still active, scroll down
2. Capture section showing:
   - YouTube recommended presets buttons (1080p60, 720p30, etc.)
   - Current encoder settings
   - Bitrate recommendations
   - Connection quality indicators
**Save as:** `screenshots/4-youtube-presets.png`

## Alternative Screenshot 4: Mobile Responsive View
**If you want to show mobile responsiveness instead:**
**Steps:**
1. Press F12 to open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android device
4. Capture showing:
   - Responsive sidebar (hamburger menu)
   - Stacked layout
   - Touch-friendly buttons
**Save as:** `screenshots/4-mobile-responsive.png`

---

## After Taking Screenshots

1. Create `screenshots` folder in project root
2. Save all images as PNG (not JPG)
3. Optimize images (use TinyPNG.com or similar)
4. Update README.md with image links:

```markdown
## Screenshots

### Dashboard
![Main Dashboard](screenshots/1-dashboard-empty.png)

### Stream Key Generation
![Create Stream Key](screenshots/2-stream-key-modal.png)

### Live Streaming with Health Monitoring
![Active Stream](screenshots/3-active-stream-dashboard.png)

### YouTube Presets
![YouTube Presets](screenshots/4-youtube-presets.png)
```

5. Commit screenshots:
```powershell
git add screenshots/
git commit -m "Add screenshots to README"
```

---

## Tips for Great Screenshots

- Use default browser zoom (100%)
- Hide bookmarks bar for clean look
- Use incognito/private mode to avoid extensions
- Capture during daytime (better lighting for screen recording later)
- Use Windows Snipping Tool (Win+Shift+S) or ShareX
- Keep consistent window size across all screenshots
- Remove any personal information from screenshots
- Consider adding subtle drop shadow in image editor for polish

---

## Quick Windows Screenshot Commands

**Snipping Tool:**
```
Win + Shift + S
```

**Full Window Capture:**
```
Alt + PrtScn (captures active window)
```

**Save to Screenshots folder:**
```powershell
mkdir screenshots
# Then paste screenshots and save as PNG
```
