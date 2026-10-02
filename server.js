const NodeMediaServer = require('node-media-server');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(bodyParser.json());
app.use(express.static('public'));

// Security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline'; " +
    "style-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rate limiters
const createStreamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 streams per 15min per IP
  message: { error: 'Too many stream keys created. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteStreamLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 deletions per 5min per IP
  message: { error: 'Too many deletion requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Store active streams and their keys
const STORAGE_FILE = path.join(__dirname, 'stream-keys.json');
const streamKeys = new Map();
const activeStreams = new Map();
const streamStats = new Map();

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
      const result = execSync(`"${ffmpegPath}" -version`, { stdio: 'pipe', timeout: 3000 });
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

// UUID validation helper
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Title sanitization helper
function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') {
    return null;
  }
  
  // Remove control characters, zero-width chars, and trim
  const cleaned = title
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '')         // Zero-width
    .trim();
  
  // Enforce length limits
  if (cleaned.length === 0 || cleaned.length > 100) {
    return null;
  }
  
  return cleaned;
}

// Redact stream key for logging
function redactStreamKey(streamPath) {
  return streamPath.replace(/\/([^\/]+)$/, '/***REDACTED***');
}

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
    allow_origin: '*'
  },
  trans: FFMPEG_PATH ? {
    ffmpeg: FFMPEG_PATH,
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false, // Auto-cleanup segments when stream ends
        dash: false
      }
    ]
  } : undefined
};

const nms = new NodeMediaServer(config);

// RTMP Events
nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)} args=${JSON.stringify(args)}`);
  
  // Extract stream key from path (format: /live/STREAM_KEY)
  const streamKey = StreamPath.split('/')[2];
  
  // Validate stream key format and existence
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
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${redactStreamKey(StreamPath)} args=${JSON.stringify(args)}`);
  
  const streamKey = StreamPath.split('/')[2];
  
  if (streamKey && isValidUUID(streamKey) && streamKeys.has(streamKey)) {
    const streamInfo = streamKeys.get(streamKey);
    streamInfo.isLive = false;
    streamInfo.endTime = Date.now();
  }
  
  activeStreams.delete(streamKey);
  streamStats.delete(streamKey);
  
  // Notify all connected clients
  io.emit('streamEnded', { key: streamKey });
  
  console.log('[Stream Ended]');
});

// API Routes

// Generate new stream key
app.post('/api/stream/create', createStreamLimiter, (req, res) => {
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

// Get all stream keys
app.get('/api/streams', (req, res) => {
  const streams = Array.from(streamKeys.values()).map(stream => ({
    key: stream.key,
    title: stream.title,
    createdAt: stream.createdAt,
    isLive: stream.isLive,
    startTime: stream.startTime,
    endTime: stream.endTime
  }));
  
  res.json({ streams });
});

// Get active streams
app.get('/api/streams/active', (req, res) => {
  const streams = Array.from(activeStreams.values());
  res.json({ streams });
});

// Get stream info
app.get('/api/stream/:key', (req, res) => {
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
app.delete('/api/stream/:key', deleteStreamLimiter, (req, res) => {
  const { key } = req.params;
  
  if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
    return res.status(404).json({ error: 'Stream key not found' });
  }
  
  // If stream is live, end it
  if (activeStreams.has(key)) {
    const streamInfo = streamKeys.get(key);
    const session = nms.getSession(streamInfo.sessionId);
    if (session) {
      session.reject();
    }
  }
  
  streamKeys.delete(key);
  activeStreams.delete(key);
  streamStats.delete(key);
  
  saveStreamKeys();
  
  res.json({ success: true });
});

// Get server info
app.get('/api/info', (req, res) => {
  res.json({
    localIP: LOCAL_IP,
    rtmpPort: RTMP_PORT,
    httpPort: HTTP_PORT,
    mediaPort: MEDIA_PORT,
    rtmpUrl: `rtmp://${LOCAL_IP}:${RTMP_PORT}/live`,
    totalStreams: streamKeys.size,
    activeStreams: activeStreams.size,
    ffmpegAvailable: FFMPEG_PATH !== null,
    ffmpegPath: FFMPEG_PATH
  });
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

// Periodic stats update
// NOTE: bitrate/fps/resolution are simulated since node-media-server doesn't expose
// real-time encoder stats without FFmpeg. When FFmpeg is available these would come
// from parsing FFmpeg stderr. For encoder testing purposes, the connection stability
// and stream health (connected/disconnected, duration) ARE real.
const statsInterval = setInterval(() => {
  activeStreams.forEach((stream, key) => {
    const duration = Date.now() - stream.startTime;
    
    const stats = {
      duration: Math.floor(duration / 1000),
      bitrate: Math.floor(2500 + Math.random() * 500), // kbps - simulated
      fps: 30,                                          // simulated
      resolution: '1920x1080',                          // simulated
      droppedFrames: 0,                                 // real: node-media-server doesn't expose this without FFmpeg
      viewers: Math.floor(Math.random() * 10)           // simulated
    };
    
    streamStats.set(key, stats);
    
    io.emit('streamStats', {
      key,
      stats
    });
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
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Stop node-media-server (this will kill all FFmpeg child processes)
  try {
    if (nms && nms.stop) {
      nms.stop();
      console.log('RTMP server stopped');
    }
  } catch (err) {
    console.error('Error stopping RTMP server:', err);
  }
  
  // Save stream keys before exit
  saveStreamKeys();
  console.log('Stream keys saved');
  
  // Clear all intervals
  if (statsInterval) clearInterval(statsInterval);
  
  // Disconnect all socket clients
  io.close(() => {
    console.log('Socket.IO closed');
  });
  
  console.log('Graceful shutdown complete');
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
