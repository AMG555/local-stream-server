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

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(bodyParser.json());
app.use(express.static('public'));

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
    port: 8080,
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
        hlsKeep: true,
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
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  // Extract stream key from path (format: /live/STREAM_KEY)
  const streamKey = StreamPath.split('/')[2];
  
  // Validate stream key
  if (!streamKeys.has(streamKey)) {
    console.log('[Reject] Invalid stream key:', streamKey);
    const session = nms.getSession(id);
    session.reject();
    return;
  }
  
  const streamInfo = streamKeys.get(streamKey);
  streamInfo.isLive = true;
  streamInfo.startTime = Date.now();
  streamInfo.sessionId = id;
  
  activeStreams.set(streamKey, {
    key: streamKey,
    title: streamInfo.title,
    startTime: streamInfo.startTime,
    sessionId: id
  });
  
  // Notify all connected clients
  io.emit('streamStarted', {
    key: streamKey,
    title: streamInfo.title,
    startTime: streamInfo.startTime
  });
  
  console.log('[Accept] Stream started:', streamKey);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  const streamKey = StreamPath.split('/')[2];
  
  if (streamKeys.has(streamKey)) {
    const streamInfo = streamKeys.get(streamKey);
    streamInfo.isLive = false;
    streamInfo.endTime = Date.now();
  }
  
  activeStreams.delete(streamKey);
  streamStats.delete(streamKey);
  
  // Notify all connected clients
  io.emit('streamEnded', { key: streamKey });
  
  console.log('[Stream Ended]', streamKey);
});

// API Routes

// Generate new stream key
app.post('/api/stream/create', (req, res) => {
  const { title } = req.body;
  const streamKey = uuidv4();
  
  streamKeys.set(streamKey, {
    key: streamKey,
    title: title || 'Untitled Stream',
    createdAt: Date.now(),
    isLive: false
  });
  
  saveStreamKeys();
  
  res.json({
    success: true,
    streamKey,
    rtmpUrl: `rtmp://${LOCAL_IP}:${RTMP_PORT}/live`,
    streamUrl: `http://${LOCAL_IP}:8080/live/${streamKey}/index.m3u8`,
    title: title || 'Untitled Stream',
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
  
  if (!streamKeys.has(key)) {
    return res.status(404).json({ error: 'Stream key not found' });
  }
  
  const stream = streamKeys.get(key);
  const stats = streamStats.get(key);
  
  res.json({
    stream,
    stats,
    playbackUrl: `http://${LOCAL_IP}:8080/live/${key}/index.m3u8`
  });
});

// Delete stream key
app.delete('/api/stream/:key', (req, res) => {
  const { key } = req.params;
  
  if (!streamKeys.has(key)) {
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
    mediaPort: 8080,
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
setInterval(() => {
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
  console.log(`📺 Media Server: http://${LOCAL_IP}:8080`);
  console.log('===========================================\n');
  console.log('📝 To stream with OBS:');
  console.log('   1. Create a stream key at the web interface');
  console.log('   2. In OBS Settings > Stream:');
  console.log(`      Server: rtmp://${LOCAL_IP}:${RTMP_PORT}/live`);
  console.log('      Stream Key: [your generated key]');
  console.log('===========================================\n');
});
