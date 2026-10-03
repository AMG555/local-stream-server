const NodeMediaServer = require('node-media-server');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { requireAPIKey, generateAPIKey, revokeAPIKey, revokeAPIKeyById, listAPIKeys } = require('./auth');
const { isValidUUID, sanitizeTitle, redactStreamKey, safeArgs } = require('./helpers');

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Limit request body to 64 KB — prevent large-payload DoS on JSON routes
app.use(bodyParser.json({ limit: '64kb' }));
app.use(express.static('public'));

// Security headers
app.use((req, res, next) => {
  // socket.io needs 'unsafe-eval' in script-src and explicit ws:// origins.
  // We allow ws: broadly because local IP can vary; production users should
  // tighten this to their specific origin.
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' ws: wss: http: https:; " +
    "media-src 'self' blob:; " +
    "frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// General API limiter — protects all /api/* routes from enumeration/abuse.
// When mounted at /api/, req.path is the suffix (e.g. '/info', not '/api/info').
const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 2 req/sec burst per IP
  message: { error: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/info', // /api/info is public, no limit needed
});
app.use('/api/', generalApiLimiter);

const createStreamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many stream keys created. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteStreamLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: 'Too many deletion requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const downloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 downloads per minute per IP
  message: { error: 'Too many download requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Store active streams and their keys
const STORAGE_FILE = path.join(__dirname, 'stream-keys.json');
const streamKeys = new Map();
const activeStreams = new Map();
const streamStats = new Map();
const streamRecordings = new Map(); // key -> { process, filePath, startTime }

// FFmpeg detection
function detectFFmpeg() {
  const possiblePaths = [
    'C:/ffmpeg/bin/ffmpeg.exe', // Our install location (check first)
    'ffmpeg', // In PATH
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe')
  ];

  for (const ffmpegPath of possiblePaths) {
    try {
      const result = execSync(`"${ffmpegPath}" -version`, { stdio: 'pipe', timeout: 1000 }); // Reduced from 3000ms
      if (result.toString().includes('ffmpeg version')) {
        console.log(`✓ FFmpeg found: ${ffmpegPath}`);
        return ffmpegPath;
      }
    } catch (e) {
      continue;
    }
  }

  console.warn('\n⚠️  WARNING: FFmpeg not found!');
  console.warn('HLS transcoding will NOT work without FFmpeg.');
  console.warn('\nTo install FFmpeg:');
  console.warn('  Windows: Download from https://ffmpeg.org/download.html');
  console.warn('           Extract to C:\\ffmpeg and add C:\\ffmpeg\\bin to PATH');
  console.warn('  Mac:     brew install ffmpeg');
  console.warn('  Linux:   sudo apt install ffmpeg\n');
  
  return null;
}

// Load saved stream keys
function loadStreamKeys() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      
      // Validate data is an array
      if (!Array.isArray(data)) {
        console.error('Invalid stream-keys.json format: expected array, got', typeof data);
        return;
      }
      
      data.forEach(stream => {
        streamKeys.set(stream.key, { ...stream, isLive: false });
      });
      console.log(`Loaded ${streamKeys.size} saved stream keys`);
    }
  } catch (error) {
    console.error('Error loading stream keys:', error);
  }
}

// Save stream keys
function saveStreamKeys() {
  try {
    const data = Array.from(streamKeys.values()).map(({ key, title, createdAt }) => ({
      key,
      title,
      createdAt
    }));
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving stream keys:', error);
  }
}

const FFMPEG_PATH = detectFFmpeg();
loadStreamKeys();

// Auto-generate first API key if none exist (first-run UX)
if (listAPIKeys().length === 0) {
  const { key: firstKey } = generateAPIKey('Dashboard (auto-generated)');
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  🔑 First-run: API key auto-generated               ║');
  console.log('║                                                      ║');
  console.log(`║  ${firstKey}  ║`);
  console.log('║                                                      ║');
  console.log('║  Save this key — it will not be shown again.        ║');
  console.log('║  Paste it in the browser prompt when asked.         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

// isValidUUID, sanitizeTitle, redactStreamKey, safeArgs imported from helpers.js

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const HTTP_PORT = 8000;
const RTMP_PORT = 1935;
const MEDIA_PORT = 8081; // Changed from 8080 to avoid conflict

// Node-Media-Server configuration
const config = {
  rtmp: {
    port: RTMP_PORT,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: MEDIA_PORT, // Use 8081 instead of 8080
    mediaroot: './media',
    allow_origin: `http://${LOCAL_IP}:${HTTP_PORT}`
  },
  trans: FFMPEG_PATH ? {
    ffmpeg: FFMPEG_PATH,
    tasks: [
      {
        app: 'live',
        hls: true,
        // EXTREME low latency HLS settings (near-zero)
        hlsFlags: '[hls_time=1:hls_list_size=2:hls_flags=delete_segments+independent_segments+omit_endlist]',
        // hls_time=1: 1-second segments (matches OBS keyframe=1)
        // hls_list_size=2: Keep only 2 segments (minimum)
        // delete_segments: Remove old segments
        // independent_segments: Every segment is independent
        // omit_endlist: Signals live stream for immediate playback
        hlsKeep: false, // Auto-cleanup segments when stream ends
        dash: false
      }
    ]
  } : undefined
};

const nms = new NodeMediaServer(config);

// RTMP Events — safeArgs() is imported from helpers.js

nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id}`, safeArgs(args));
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id}`, safeArgs(args));
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id}`, safeArgs(args));
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)}`, safeArgs(args));
  
  // Extract stream key from path (format: /live/STREAM_KEY)
  const streamKey = StreamPath.split('/')[2];
  
  // Validate stream key format and existence — UUID format blocks path traversal
  if (!streamKey || !isValidUUID(streamKey) || !streamKeys.has(streamKey)) {
    console.log('[Reject] Invalid stream key');
    const session = nms.getSession(id);
    if (session) {
      session.reject();
    }
    return;
  }
  
  const streamInfo = streamKeys.get(streamKey);
  
  // Prevent race condition: reject if stream is already live (atomic check)
  if (activeStreams.has(streamKey)) {
    console.log('[Reject] Stream already active');
    const session = nms.getSession(id);
    if (session) {
      session.reject();
    }
    return;
  }
  
  // ATOMIC: set activeStreams BEFORE setting streamInfo.isLive
  const startTime = Date.now();
  activeStreams.set(streamKey, {
    key: streamKey,
    title: streamInfo.title,
    startTime: startTime,
    sessionId: id
  });
  
  // Set flags after activeStreams is set
  streamInfo.isLive = true;
  streamInfo.startTime = startTime;
  streamInfo.sessionId = id;
  
  // Notify all connected clients
  io.emit('streamStarted', {
    key: streamKey,
    title: streamInfo.title,
    startTime: startTime
  });
  
  console.log('[Accept] Stream started');
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)}`, safeArgs(args));
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)}`, safeArgs(args));
  
  const streamKey = StreamPath.split('/')[2];
  
  if (streamKey && isValidUUID(streamKey) && streamKeys.has(streamKey)) {
    const streamInfo = streamKeys.get(streamKey);
    streamInfo.isLive = false;
    streamInfo.endTime = Date.now();
  }

  // Stop any active recording for this stream
  const recording = streamRecordings.get(streamKey);
  if (recording) {
    recording.process.kill('SIGINT');
    streamRecordings.delete(streamKey);
  }

  activeStreams.delete(streamKey);
  streamStats.delete(streamKey);
  
  // Notify all connected clients
  io.emit('streamEnded', { key: streamKey });
  
  console.log('[Stream Ended]');
});

// API Routes

// Generate new stream key
app.post('/api/stream/create', requireAPIKey, createStreamLimiter, (req, res) => {
  const { title } = req.body;
  
  // Validate and sanitize title
  const sanitized = sanitizeTitle(title);
  if (!sanitized) {
    return res.status(400).json({ 
      error: 'Title must be 1-100 characters and contain valid text' 
    });
  }
  
  const streamKey = uuidv4();
  
  streamKeys.set(streamKey, {
    key: streamKey,
    title: sanitized,
    createdAt: Date.now(),
    isLive: false
  });
  
  saveStreamKeys();
  
  res.json({
    success: true,
    streamKey,
    rtmpUrl: `rtmp://${LOCAL_IP}:${RTMP_PORT}/live`,
    streamUrl: `http://${LOCAL_IP}:${MEDIA_PORT}/live/${streamKey}/index.m3u8`,
    title: sanitized,
    ffmpegAvailable: FFMPEG_PATH !== null
  });
});

// Get all stream keys — paginated (page=1, limit=50 default, max 200)
app.get('/api/streams', requireAPIKey, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset = (page - 1) * limit;

  const allValues = Array.from(streamKeys.values());
  const total = allValues.length;
  const streams = allValues.slice(offset, offset + limit).map(s => ({
    key: s.key,
    title: s.title,
    createdAt: s.createdAt,
    isLive: s.isLive,
    startTime: s.startTime,
    endTime: s.endTime
  }));

  res.json({ streams, total, page, limit, pages: Math.ceil(total / limit) });
});

// Get active streams
app.get('/api/streams/active', requireAPIKey, (req, res) => {
  const streams = Array.from(activeStreams.values());
  res.json({ streams });
});

// Get stream info
app.get('/api/stream/:key', requireAPIKey, (req, res) => {
  const { key } = req.params;
  
  if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
    return res.status(404).json({ error: 'Stream key not found' });
  }
  
  const stream = streamKeys.get(key);
  const stats = streamStats.get(key);
  
  res.json({
    stream,
    stats,
    playbackUrl: `http://${LOCAL_IP}:${MEDIA_PORT}/live/${key}/index.m3u8`
  });
});

// Delete stream key
app.delete('/api/stream/:key', requireAPIKey, deleteStreamLimiter, (req, res) => {
  const { key } = req.params;
  
  if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
    return res.status(404).json({ error: 'Stream key not found' });
  }
  
  // If stream is live, end it (with additional activeStreams check)
  if (activeStreams.has(key) && streamKeys.has(key)) {
    const streamInfo = streamKeys.get(key);
    if (streamInfo.sessionId) {
      const session = nms.getSession(streamInfo.sessionId);
      if (session) {
        session.reject();
      }
    }
  }
  
  streamKeys.delete(key);
  activeStreams.delete(key);
  streamStats.delete(key);
  
  saveStreamKeys();
  
  res.json({ success: true });
});

// Get server info (public — does NOT expose ffmpegPath to avoid leaking disk layout)
const SRT_PORT = 8554; // must match go-media-server/config.yml srt.port

app.get('/api/info', (req, res) => {
  res.json({
    localIP: LOCAL_IP,
    rtmpPort: RTMP_PORT,
    srtPort: SRT_PORT,
    httpPort: HTTP_PORT,
    mediaPort: MEDIA_PORT,
    rtmpUrl: `rtmp://${LOCAL_IP}:${RTMP_PORT}/live`,
    srtUrl: `srt://${LOCAL_IP}:${SRT_PORT}`,
    totalStreams: streamKeys.size,
    activeStreams: activeStreams.size,
    ffmpegAvailable: FFMPEG_PATH !== null
    // ffmpegPath intentionally omitted — it would expose the server disk layout
  });
});

// Shallow health check (public — for uptime monitors / load balancers)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeStreams: activeStreams.size,
    totalKeys: streamKeys.size,
    ffmpeg: FFMPEG_PATH !== null,
    timestamp: new Date().toISOString()
  });
});

// Deep health check (authenticated — for ops dashboards)
app.get('/health/deep', requireAPIKey, (req, res) => {
  const checks = {};

  // FFmpeg availability
  checks.ffmpeg = { ok: FFMPEG_PATH !== null, detail: FFMPEG_PATH ? 'found' : 'not found' };

  // Disk space in recordings dir
  try {
    const recordingsDir = path.join(__dirname, 'recordings');
    fs.mkdirSync(recordingsDir, { recursive: true });
    const stats = fs.statfsSync ? fs.statfsSync(recordingsDir) : null;
    if (stats) {
      const freeMB = Math.floor((stats.bfree * stats.bsize) / (1024 * 1024));
      checks.disk = { ok: freeMB > 500, freeMB, detail: `${freeMB} MB free` };
    } else {
      checks.disk = { ok: true, detail: 'statfs not available on this platform' };
    }
  } catch (e) {
    checks.disk = { ok: false, detail: e.message };
  }

  // RTMP port responsive (check if listener is bound)
  checks.rtmp = { ok: true, port: RTMP_PORT, detail: 'node-media-server managing port' };

  // Active recordings
  checks.recordings = { active: streamRecordings.size, ok: true };

  const allOk = Object.values(checks).every(c => c.ok !== false);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    activeStreams: activeStreams.size,
    totalKeys: streamKeys.size,
    checks,
    timestamp: new Date().toISOString()
  });
});

// ----- API Key management (protected) -----

// List all API keys (redacted)
app.get('/api/keys', requireAPIKey, (req, res) => {
  res.json({ keys: listAPIKeys() });
});

// Create a new API key
app.post('/api/keys', requireAPIKey, (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 80) {
    return res.status(400).json({ error: 'Name must be 1-80 characters' });
  }
  const { key, id } = generateAPIKey(name.trim());
  res.status(201).json({ success: true, key, id, name: name.trim() });
});

// Revoke an API key by its UUID id — safe to call from the browser
app.delete('/api/keys/id/:id', requireAPIKey, (req, res) => {
  const { id } = req.params;
  // Prevent revoking self: look up the key for this id and compare to caller
  const authHeader = req.headers.authorization || '';
  const callerKey = (authHeader.match(/^Bearer\s+(.+)$/i) || [])[1];
  // listAPIKeys gives us previews; we use revokeAPIKeyById which internally calls revokeAPIKey
  // but first check it's not the caller's own key
  const keys = listAPIKeys();
  const target = keys.find(k => k.id === id);
  if (!target) return res.status(404).json({ error: 'Key not found' });
  if (callerKey && callerKey.startsWith(target.keyPreview.replace('...', ''))) {
    return res.status(400).json({ error: 'Cannot revoke the key you are using' });
  }
  const ok = revokeAPIKeyById(id);
  if (!ok) return res.status(404).json({ error: 'Key not found' });
  res.json({ success: true });
});

// Revoke an API key by full key value (legacy / CLI use)
app.delete('/api/keys/:key', requireAPIKey, (req, res) => {
  const { key } = req.params;
  // Prevent revoking self (would lock out)
  const authHeader = req.headers.authorization || '';
  const callerKey = (authHeader.match(/^Bearer\s+(.+)$/i) || [])[1];
  if (key === callerKey) {
    return res.status(400).json({ error: 'Cannot revoke the key you are using' });
  }
  const ok = revokeAPIKey(key);
  if (!ok) return res.status(404).json({ error: 'Key not found' });
  res.json({ success: true });
});

// ─── Stream Recording ─────────────────────────────────────────────────────────

// Start recording a live stream to disk
app.post('/api/stream/:key/record/start', requireAPIKey, (req, res) => {
  const { key } = req.params;

  if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
    return res.status(404).json({ error: 'Stream key not found' });
  }
  if (!activeStreams.has(key)) {
    return res.status(409).json({ error: 'Stream is not live' });
  }
  if (streamRecordings.has(key)) {
    return res.status(409).json({ error: 'Recording already in progress' });
  }
  if (!FFMPEG_PATH) {
    return res.status(503).json({ error: 'FFmpeg is required for recording' });
  }

  const recordingsDir = path.join(__dirname, 'recordings');
  fs.mkdirSync(recordingsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = streamKeys.get(key).title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const fileName = `${title}_${timestamp}.mp4`;
  const filePath = path.join(recordingsDir, fileName);

  const rtmpInput = `rtmp://${LOCAL_IP}:${RTMP_PORT}/live/${key}`;

  const ffmpegProc = spawn(FFMPEG_PATH, [
    '-i', rtmpInput,
    '-c', 'copy',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    filePath
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ffmpegProc.stderr.on('data', (data) => {
    // Silent — not needed for recording confirmation
  });

  ffmpegProc.on('close', (code) => {
    streamRecordings.delete(key);
    console.log(`[Recording] Ended for ${redactStreamKey('/live/' + key)}, exit ${code}`);
    io.emit('recordingEnded', { key, file: fileName });
  });

  ffmpegProc.on('error', (err) => {
    streamRecordings.delete(key);
    console.error('[Recording] FFmpeg error:', err.message);
    io.emit('recordingError', { key, error: err.message });
  });

  streamRecordings.set(key, {
    process: ffmpegProc,
    filePath,
    startTime: Date.now()
  });

  console.log(`[Recording] Started: ${fileName}`);
  res.json({ success: true, file: fileName });
});

// Stop an in-progress recording
app.post('/api/stream/:key/record/stop', requireAPIKey, (req, res) => {
  const { key } = req.params;

  if (!key || !isValidUUID(key)) {
    return res.status(400).json({ error: 'Invalid stream key' });
  }

  const recording = streamRecordings.get(key);
  if (!recording) {
    return res.status(404).json({ error: 'No active recording for this stream' });
  }

  recording.process.kill('SIGINT'); // Graceful stop — writes MP4 moov atom
  res.json({ success: true, file: path.basename(recording.filePath) });
});

// Get recording status
app.get('/api/stream/:key/record', requireAPIKey, (req, res) => {
  const { key } = req.params;

  if (!key || !isValidUUID(key)) {
    return res.status(400).json({ error: 'Invalid stream key' });
  }

  const recording = streamRecordings.get(key);
  if (!recording) {
    return res.json({ recording: false });
  }

  res.json({
    recording: true,
    file: path.basename(recording.filePath),
    since: recording.startTime,
    duration: Math.floor((Date.now() - recording.startTime) / 1000)
  });
});

// List saved recordings
app.get('/api/recordings', requireAPIKey, (req, res) => {
  const recordingsDir = path.join(__dirname, 'recordings');
  try {
    fs.mkdirSync(recordingsDir, { recursive: true });
    const files = fs.readdirSync(recordingsDir)
      .filter(f => f.endsWith('.mp4'))
      .map(f => {
        const stat = fs.statSync(path.join(recordingsDir, f));
        return { file: f, size: stat.size, createdAt: stat.birthtimeMs || stat.ctimeMs };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ recordings: files });
  } catch (err) {
    res.status(500).json({ error: 'Could not read recordings directory' });
  }
});

// Serve recording files for download
app.get('/api/recordings/:file', requireAPIKey, downloadLimiter, (req, res) => {
  const file = path.basename(req.params.file); // strip any path traversal
  if (!file.endsWith('.mp4')) return res.status(400).json({ error: 'Invalid file' });
  const filePath = path.join(__dirname, 'recordings', file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// Delete a saved recording
app.delete('/api/recordings/:file', requireAPIKey, (req, res) => {
  const file = path.basename(req.params.file);
  if (!file.endsWith('.mp4')) return res.status(400).json({ error: 'Invalid file' });
  const filePath = path.join(__dirname, 'recordings', file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete file' });
  }
});

// ─── Analytics Export ─────────────────────────────────────────────────────────

// Export stream history as JSON or CSV
app.get('/api/streams/export', requireAPIKey, (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  const streams = Array.from(streamKeys.values()).map(s => ({
    key: s.key,
    title: s.title,
    createdAt: s.createdAt,
    isLive: s.isLive,
    startTime: s.startTime || null,
    endTime: s.endTime || null,
    durationSeconds: s.startTime && s.endTime ? Math.floor((s.endTime - s.startTime) / 1000) : null
  }));

  if (format === 'csv') {
    const header = 'key,title,createdAt,isLive,startTime,endTime,durationSeconds\n';
    const rows = streams.map(s =>
      [s.key, `"${s.title.replace(/"/g, '""')}"`, s.createdAt, s.isLive, s.startTime || '', s.endTime || '', s.durationSeconds || ''].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="streams-export.csv"');
    return res.send(header + rows);
  }

  res.setHeader('Content-Disposition', 'attachment; filename="streams-export.json"');
  res.json({ exportedAt: new Date().toISOString(), streams });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current active streams
  socket.emit('activeStreams', Array.from(activeStreams.values()));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Periodic stats update — reads real data from NMS session objects
const statsInterval = setInterval(() => {
  activeStreams.forEach((stream, key) => {
    const duration = Date.now() - stream.startTime;

    // Pull real stats from NMS session (bitrate, fps, resolution, codec)
    let bitrate = 0;
    let fps = 0;
    let resolution = 'Unknown';
    let videoCodec = '';
    let audioCodec = '';

    if (stream.sessionId) {
      const session = nms.getSession(stream.sessionId);
      if (session) {
        bitrate = session.bitrate || 0;
        fps = session.videoFps || 0;
        const w = session.videoWidth || 0;
        const h = session.videoHeight || 0;
        resolution = (w && h) ? `${w}x${h}` : 'Unknown';
        videoCodec = session.videoCodecName || '';
        audioCodec = session.audioCodecName || '';
      }
    }

    const recording = streamRecordings.get(key);

    const stats = {
      duration: Math.floor(duration / 1000),
      bitrate,
      fps,
      resolution,
      videoCodec,
      audioCodec,
      droppedFrames: 0,
      recording: recording ? { active: true, file: path.basename(recording.filePath), since: recording.startTime } : null
    };

    streamStats.set(key, stats);

    io.emit('streamStats', { key, stats });
  });
}, 2000);

// Start servers
nms.run();

server.listen(HTTP_PORT, () => {
  console.log('\n===========================================');
  console.log('🎥 Local Streaming Server Started!');
  console.log('===========================================');
  console.log(`📡 RTMP Server: rtmp://${LOCAL_IP}:${RTMP_PORT}/live`);
  console.log(`🌐 Web Interface: http://${LOCAL_IP}:${HTTP_PORT}`);
  console.log(`📺 Media Server: http://${LOCAL_IP}:${MEDIA_PORT}`);
  console.log('===========================================\n');
  console.log('📝 To stream with OBS:');
  console.log('   1. Create a stream key at the web interface');
  console.log('   2. In OBS Settings > Stream:');
  console.log(`      Server: rtmp://${LOCAL_IP}:${RTMP_PORT}/live`);
  console.log('      Stream Key: [your generated key]');
  console.log('===========================================\n');
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Create promises for all async operations
  const closePromises = [];
  
  // Stop accepting new connections
  closePromises.push(new Promise((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  }));
  
  // Stop node-media-server (this will kill all FFmpeg child processes)
  try {
    if (nms && nms.stop) {
      nms.stop();
      console.log('RTMP server stopped');
    }
  } catch (err) {
    console.error('Error stopping RTMP server:', err);
  }
  
  // Stop all active recordings
  streamRecordings.forEach((rec, key) => {
    try { rec.process.kill('SIGINT'); } catch (_) {}
  });
  streamRecordings.clear();

  // Save stream keys before exit (synchronous, no promise needed)
  saveStreamKeys();
  console.log('Stream keys saved');
  
  // Clear all intervals
  if (statsInterval) clearInterval(statsInterval);
  
  // Disconnect all socket clients
  closePromises.push(new Promise((resolve) => {
    io.close(() => {
      console.log('Socket.IO closed');
      resolve();
    });
  }));
  
  // Wait for all async operations to complete with timeout
  try {
    await Promise.race([
      Promise.all(closePromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 5000))
    ]);
    console.log('Graceful shutdown complete');
  } catch (err) {
    console.error('Shutdown timeout or error:', err);
  }
  
  process.exit(0);
}

// Capture termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections, just log them
});
