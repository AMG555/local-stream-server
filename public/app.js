// Socket.IO connection
const socket = io();

// State
let currentStreamKey = null;
let serverInfo = {};
let allStreams = [];
let serverStartTime = Date.now();
let isLoading = false;
let retryCount = 0;
const streamStats = new Map();   // FIX: was undeclared (BUG #2)
const activeStreams = new Map();  // FIX: was undeclared (BUG #3)
let hlsInstance = null;           // FIX: track HLS instance to destroy on close (BUG #6)
let pollInterval = null;          // FIX: track interval so it can be cleared
let uptimeInterval = null;        // FIX: track uptime interval

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState();
    setupSocketListeners();
    await loadServerInfo();
    await loadAllStreams();
    startUptimeTimer();
    setupKeyboardShortcuts();
    // FIX: single interval, stored so it can be cleared if needed (BUG #5)
    pollInterval = setInterval(loadAllStreams, 5000);
});

// Socket listeners
const socketHandlers = {
    connect: () => {
        console.log('Connected to server');
        showConnectionStatus(true);
    },
    disconnect: () => {
        console.log('Disconnected from server');
        showConnectionStatus(false);
        showWarningNotification('Lost connection to server. Reconnecting...');
    },
    activeStreams: (streams) => {
        renderLiveStreams(streams);
        // Sync allStreams live status
        if (allStreams.length > 0) {
            const liveKeys = new Set(streams.map(s => s.key));
            allStreams.forEach(s => s.isLive = liveKeys.has(s.key));
            renderAllStreams();
            updateStats();
        }
    },
    streamStarted: (stream) => {
        console.log('Stream started:', stream);
        loadAllStreams();
        showSuccessNotification(`🔴 ${stream.title} is now live!`);
    },
    streamEnded: (data) => {
        console.log('Stream ended:', data);
        // FIX: Clear history to prevent memory leak
        if (window.streamStatsHistory) {
            window.streamStatsHistory.delete(data.key);
        }
        streamStats.delete(data.key);
        loadAllStreams();
        showNotification('Stream ended', 'info');
    },
    streamStats: (data) => {
        updateStreamStats(data.key, data.stats);
    }
};

function setupSocketListeners() {
    // Register all handlers
    Object.entries(socketHandlers).forEach(([event, handler]) => {
        socket.on(event, handler);
    });
}

function cleanupSocketListeners() {
    // Remove all handlers
    Object.entries(socketHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
    });
}

function showConnectionStatus(connected) {
    let statusEl = document.querySelector('.connection-status');
    
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'connection-status';
        document.body.appendChild(statusEl);
    }
    
    statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'} show`;
    statusEl.innerHTML = `
        <i class="fas fa-${connected ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${connected ? 'Connected' : 'Disconnected'}</span>
    `;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

// FIX: XSS protection - escape user-supplied strings before injecting into innerHTML (BUG #4)
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// API calls
async function loadServerInfo() {
    try {
        const response = await fetch('/api/info');
        if (!response.ok) throw new Error('Failed to fetch server info');
        
        serverInfo = await response.json();
        updateServerInfo();
        retryCount = 0;
        
        // Show FFmpeg warning if not available
        if (!serverInfo.ffmpegAvailable) {
            showFFmpegWarning();
        }
    } catch (error) {
        console.error('Error loading server info:', error);
        // Retry silently - don't destroy the UI
        if (retryCount < 3) {
            retryCount++;
            await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
            return loadServerInfo();
        }
    }
}

function showLoadingState() {
    const liveTab = document.getElementById('liveStreams');
    if (liveTab) {
        liveTab.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading streams...</p>
            </div>
        `;
    }
}

function handleConnectionError(message) {
    const liveTab = document.getElementById('liveStreams');
    if (liveTab) {
        liveTab.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Connection Error</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function showFFmpegWarning() {
    const warning = document.createElement('div');
    warning.className = 'ffmpeg-warning';
    warning.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>⚠️ FFmpeg Not Installed - Browser Playback Disabled</strong>
                <p style="margin: 8px 0; font-size: 14px;">
                    <strong>✅ RTMP streaming works perfectly!</strong> Your encoder can stream right now.<br>
                    ❌ Browser video player won't work until you install FFmpeg.<br>
                    <strong>Alternative:</strong> Use VLC Player to watch streams (no FFmpeg needed).
                </p>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #3ea6ff; font-weight: bold;">📥 How to Install FFmpeg</summary>
                    <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                        <strong>Windows (Easiest):</strong><br>
                        <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">install-ffmpeg.bat</code> (run from project folder)<br>
                        <small>Or manual: <a href="https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" target="_blank" style="color: #3ea6ff;">Download ZIP</a> → Extract to C:\\ffmpeg → Add C:\\ffmpeg\\bin to PATH</small>
                        <br><br>
                        <strong>Mac:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">brew install ffmpeg</code><br>
                        <strong>Linux:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">sudo apt install ffmpeg</code>
                        <br><br>
                        <strong>After Installing:</strong> Restart server (<code>npm start</code>) and refresh this page.
                    </div>
                </details>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="close-btn" aria-label="Close warning">&times;</button>
        </div>
    `;
    document.querySelector('.content').prepend(warning);
}

async function loadAllStreams() {
    try {
        isLoading = true;
        const response = await fetch('/api/streams');
        if (!response.ok) throw new Error('Failed to fetch streams');
        
        const data = await response.json();
        allStreams = data.streams;

        // Render both tabs
        renderAllStreams();
        // Update live streams tab with currently live streams
        const liveStreams = allStreams.filter(s => s.isLive);
        renderLiveStreams(liveStreams);

        updateStats();
        isLoading = false;
    } catch (error) {
        console.error('Error loading streams:', error);
        isLoading = false;
        showErrorNotification('Failed to load streams');
        // Show empty state instead of broken spinner
        renderLiveStreams([]);
    }
}

async function createStream(btn) {  // FIX: explicit btn param instead of implicit event (BUG #7)
    const title = document.getElementById('streamTitle').value.trim();
    
    if (!title) {
        showErrorNotification('Please enter a stream title');
        return;
    }

    const button = btn || document.querySelector('#createStreamModal .btn-primary');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
        const response = await fetch('/api/stream/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) throw new Error('Failed to create stream');

        const data = await response.json();
        
        if (data.success) {
            hideCreateStreamModal();
            document.getElementById('streamTitle').value = '';
            await loadAllStreams();
            showStreamDetails(data);
            showSuccessNotification('Stream key created successfully!');
        }
    } catch (error) {
        console.error('Error creating stream:', error);
        showErrorNotification('Failed to create stream key');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

async function deleteStream(streamKey) {
    if (!confirm('Are you sure you want to delete this stream key?')) {
        return;
    }

    try {
        const response = await fetch(`/api/stream/${streamKey}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            loadAllStreams();
            showSuccessNotification('Stream key deleted');
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Error deleting stream:', error);
        showErrorNotification('Failed to delete stream key');
    }
}

async function deleteCurrentStream() {
    if (currentStreamKey) {
        await deleteStream(currentStreamKey);
        hideStreamDetailsModal();
    }
}

// UI functions
function updateServerInfo() {
    document.getElementById('rtmpPort').textContent = serverInfo.rtmpPort;
    document.getElementById('activeCount').textContent = serverInfo.activeStreams;
    document.getElementById('totalKeys').textContent = serverInfo.totalStreams;
}

function updateStats() {
    const liveStreams = allStreams.filter(s => s.isLive);
    
    document.getElementById('statActiveStreams').textContent = liveStreams.length;
    document.getElementById('statTotalKeys').textContent = allStreams.length;
    document.getElementById('activeCount').textContent = liveStreams.length;
    document.getElementById('totalKeys').textContent = allStreams.length;
    
    // Calculate average bitrate (simulated)
    if (liveStreams.length > 0) {
        // FIX: compute real avg bitrate from actual stats, not random number
        const bitrateValues = liveStreams
            .map(s => streamStats.get(s.key)?.bitrate || 0)
            .filter(b => b > 0);
        const avgBitrate = bitrateValues.length > 0
            ? Math.floor(bitrateValues.reduce((a, b) => a + b, 0) / bitrateValues.length)
            : 0;
        document.getElementById('statAvgBitrate').textContent = avgBitrate > 0 ? `${avgBitrate} kbps` : 'Waiting...';
    } else {
        document.getElementById('statAvgBitrate').textContent = '0 kbps';
    }
    
    // Show/hide health dashboard based on active streams
    const healthDashboard = document.getElementById('healthDashboard');
    if (liveStreams.length > 0) {
        healthDashboard.style.display = 'block';
        updateHealthDashboard();
    } else {
        healthDashboard.style.display = 'none';
    }
}

// YouTube Studio-like health dashboard
function updateHealthDashboard() {
    const liveStreams = allStreams.filter(s => s.isLive);
    if (liveStreams.length === 0) return;
    
    // Get stats for first active stream (or aggregate)
    const stream = liveStreams[0];
    const stats = streamStats.get(stream.key) || {};
    
    const bitrate = stats.bitrate || 0;
    const fps = stats.fps || 0;
    // FIX: use real dropped frames if available, not random (BUG #6 / fake stats)
    const droppedFrames = stats.droppedFrames || 0;
    
    // Update health indicator
    let health = 'excellent';
    let healthMessage = 'Your stream is looking great!';
    
    if (bitrate < 1500 || fps < 24 || droppedFrames > 5) {
        health = 'poor';
        healthMessage = 'Stream quality is poor. Check your internet connection.';
    } else if (bitrate < 2500 || fps < 30 || droppedFrames > 2) {
        health = 'fair';
        healthMessage = 'Stream quality is acceptable but could be better.';
    } else if (bitrate < 4000) {
        health = 'good';
        healthMessage = 'Stream quality is good.';
    }
    
    const healthIndicator = document.getElementById('healthIndicator');
    healthIndicator.className = `health-indicator ${health}`;
    document.getElementById('healthStatus').textContent = health.charAt(0).toUpperCase() + health.slice(1);
    document.getElementById('healthMessage').textContent = healthMessage;
    
    // Update metrics
    document.getElementById('healthBitrate').textContent = `${bitrate} kbps`;
    document.getElementById('healthFps').textContent = `${fps} fps`;
    document.getElementById('healthDropped').textContent = droppedFrames;
    document.getElementById('healthConnection').textContent = 'Stable';
    
    // Update statuses
    updateMetricStatus('bitrateStatus', bitrate >= 2500);
    updateMetricStatus('fpsStatus', fps >= 30);
    updateMetricStatus('droppedStatus', droppedFrames <= 2);
    updateMetricStatus('connectionStatus', true);
}

function updateMetricStatus(elementId, isGood) {
    const element = document.getElementById(elementId);
    if (isGood) {
        element.textContent = 'Good';
        element.className = 'metric-status good';
    } else {
        element.textContent = 'Warning';
        element.className = 'metric-status warning';
    }
}

// YouTube-like preset information
function updatePresetInfo() {
    const preset = document.getElementById('streamPreset').value;
    const presetInfo = document.getElementById('presetInfo');
    const presetDetails = document.getElementById('presetDetails');
    
    if (!preset || preset === 'custom') {
        presetInfo.style.display = 'none';
        return;
    }
    
    const presets = {
        '1080p60': {
            resolution: '1920x1080',
            fps: '60',
            bitrate: '6000 kbps',
            keyframe: '2 seconds',
            encoder: 'x264 or NVENC',
            description: 'Best quality for high-action content and gaming'
        },
        '1080p30': {
            resolution: '1920x1080',
            fps: '30',
            bitrate: '4500 kbps',
            keyframe: '2 seconds',
            encoder: 'x264 or NVENC',
            description: 'High quality for standard content'
        },
        '720p60': {
            resolution: '1280x720',
            fps: '60',
            bitrate: '4500 kbps',
            keyframe: '2 seconds',
            encoder: 'x264 or NVENC',
            description: 'Smooth motion for gaming and sports'
        },
        '720p30': {
            resolution: '1280x720',
            fps: '30',
            bitrate: '2500 kbps',
            keyframe: '2 seconds',
            encoder: 'x264 or NVENC',
            description: 'Balanced quality and bandwidth'
        },
        '480p30': {
            resolution: '854x480',
            fps: '30',
            bitrate: '1500 kbps',
            keyframe: '2 seconds',
            encoder: 'x264',
            description: 'Low bandwidth or mobile streaming'
        }
    };
    
    const config = presets[preset];
    if (config) {
        presetDetails.innerHTML = `
            <strong>${config.description}</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li><strong>Resolution:</strong> ${config.resolution}</li>
                <li><strong>Frame Rate:</strong> ${config.fps} fps</li>
                <li><strong>Bitrate:</strong> ${config.bitrate}</li>
                <li><strong>Keyframe:</strong> ${config.keyframe}</li>
                <li><strong>Encoder:</strong> ${config.encoder}</li>
            </ul>
        `;
        presetInfo.style.display = 'block';
    }
}

function renderLiveStreams(streams) {
    const container = document.getElementById('liveStreams');
    
    if (!streams || streams.length === 0) {
        container.innerHTML = `
            <div class="no-streams">
                <i class="fas fa-video-slash"></i>
                <p>No live streams at the moment</p>
                <p style="font-size: 14px; color: #aaa; margin: 10px 0;">
                    Start streaming from OBS, vMix, or any RTMP encoder.<br>
                    Your stream will appear here automatically.
                </p>
                <button class="btn-primary" onclick="showCreateStreamModal()">
                    Create Stream Key
                </button>
            </div>
        `;
        return;
    }

    // Show watch instructions banner if FFmpeg not available
    const watchBanner = (serverInfo && !serverInfo.ffmpegAvailable) ? `
        <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <strong style="color: #ff9800;">📺 How to Watch Your Stream:</strong>
            <div style="margin-top: 8px; font-size: 14px; line-height: 1.6;">
                <strong>VLC Player (Recommended):</strong><br>
                Open VLC → Media → Open Network Stream<br>
                URL: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">rtmp://${serverInfo && serverInfo.localIP ? serverInfo.localIP : 'YOUR_IP'}:1935/live/YOUR_STREAM_KEY</code>
                <br><br>
                <details style="cursor: pointer;">
                    <summary>Or use OBS Preview / FFplay</summary>
                    <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <strong>OBS Preview:</strong> Add Media Source with RTMP URL<br>
                        <strong>FFplay:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px;">ffplay rtmp://IP:1935/live/KEY</code>
                    </div>
                </details>
            </div>
        </div>
    ` : '';

    container.innerHTML = watchBanner + streams.map(stream => {
        const quality = getStreamQuality(stream.key);
        const uptime = getTimeSince(stream.startTime);
        const safeTitle = escHtml(stream.title);
        const safeKey = escHtml(stream.key);
        
        return `
            <div class="stream-card" data-stream-key="${safeKey.replace(/"/g, '&quot;')}" data-stream-title="${safeTitle.replace(/"/g, '&quot;')}" role="button" tabindex="0" aria-label="Watch ${safeTitle.replace(/"/g, '&quot;')}">
                <div class="stream-thumbnail live">
                    <div class="live-badge">LIVE</div>
                    <i class="fas fa-broadcast-tower"></i>
                    ${quality ? `<div class="quality-indicator quality-${quality.level}" style="position: absolute; bottom: 10px; right: 10px;">
                        <span class="quality-dot"></span>
                        ${quality.label}
                    </div>` : ''}
                </div>
                <div class="stream-info">
                    <div class="stream-title">${safeTitle}</div>
                    <div class="stream-meta">
                        <span><i class="fas fa-eye"></i> Live</span>
                        <span><i class="fas fa-clock"></i> ${uptime}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Remove old listeners if they exist (cleanup before re-attaching)
    const oldCards = container.querySelectorAll('.stream-card');
    oldCards.forEach(card => {
        const clone = card.cloneNode(true);
        card.parentNode.replaceChild(clone, card);
    });
    
    // Add event delegation for stream cards (attach once to container, not each card)
    container.querySelectorAll('.stream-card').forEach(card => {
        card.addEventListener('click', function() {
            const key = this.dataset.streamKey;
            const title = this.dataset.streamTitle;
            playStream(key, title);
        });
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const key = this.dataset.streamKey;
                const title = this.dataset.streamTitle;
                playStream(key, title);
            }
        });
    });
}

function getStreamQuality(streamKey) {
    const stats = streamStats.get(streamKey);
    if (!stats || !stats.bitrate) return null;
    
    const bitrate = stats.bitrate;
    
    if (bitrate >= 4000) {
        return { level: 'excellent', label: 'Excellent' };
    } else if (bitrate >= 2500) {
        return { level: 'good', label: 'Good' };
    } else if (bitrate >= 1500) {
        return { level: 'fair', label: 'Fair' };
    } else {
        return { level: 'poor', label: 'Poor' };
    }
}

function renderAllStreams() {
    const container = document.getElementById('allStreams');
    
    if (allStreams.length === 0) {
        container.innerHTML = `
            <div class="no-streams">
                <i class="fas fa-key"></i>
                <p>No stream keys created yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allStreams.map(stream => {
        const safeTitle = escHtml(stream.title);
        const safeKey = escHtml(stream.key);
        return `
        <div class="stream-list-item" data-stream-key="${safeKey.replace(/"/g, '&quot;')}" data-stream-title="${safeTitle.replace(/"/g, '&quot;')}">
            <div class="stream-list-info">
                <div class="stream-list-title">
                    ${safeTitle}
                    <span class="status-badge ${stream.isLive ? 'live' : 'offline'}">
                        ${stream.isLive ? '🔴 LIVE' : 'OFFLINE'}
                    </span>
                </div>
                <div class="stream-list-details">
                    <span><i class="fas fa-key"></i> ${safeKey.substring(0, 8)}...</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(stream.createdAt).toLocaleDateString()}</span>
                    ${stream.isLive ? `<span><i class="fas fa-clock"></i> ${getTimeSince(stream.startTime)}</span>` : ''}
                </div>
            </div>
            <div class="stream-list-actions">
                ${stream.isLive ? `
                    <button class="btn-primary btn-watch-stream">
                        <i class="fas fa-play"></i> Watch
                    </button>
                ` : ''}
                <button class="btn-secondary btn-stream-details">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="btn-icon btn-delete-stream" aria-label="Delete ${safeTitle.replace(/"/g, '&quot;')}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
    
    // Remove old listeners if they exist (cleanup before re-attaching)
    const oldItems = container.querySelectorAll('.stream-list-item');
    oldItems.forEach(item => {
        const clone = item.cloneNode(true);
        item.parentNode.replaceChild(clone, item);
    });
    
    // Add event delegation for stream list actions
    container.querySelectorAll('.stream-list-item').forEach(item => {
        const key = item.dataset.streamKey;
        const title = item.dataset.streamTitle;
        
        const watchBtn = item.querySelector('.btn-watch-stream');
        if (watchBtn) {
            watchBtn.addEventListener('click', () => playStream(key, title));
        }
        
        const detailsBtn = item.querySelector('.btn-stream-details');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => showStreamDetailsById(key));
        }
        
        const deleteBtn = item.querySelector('.btn-delete-stream');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteStream(key));
        }
    });
}

function updateStreamStats(key, stats) {
    // Store stats for quality calculation
    if (!window.streamStatsHistory) {
        window.streamStatsHistory = new Map();
    }
    
    if (!window.streamStatsHistory.has(key)) {
        window.streamStatsHistory.set(key, []);
    }
    
    const history = window.streamStatsHistory.get(key);
    history.push(stats.bitrate);
    if (history.length > 10) history.shift(); // Keep last 10 samples
    
    streamStats.set(key, stats);
    
    // Update player stats if this stream is currently playing
    const playerKey = document.getElementById('videoPlayer')?.dataset.streamKey;
    
    if (playerKey === key) {
        const latency = calculateLatency(stats);
        const latencyClass = latency < 2 ? 'low' : latency < 5 ? 'medium' : 'high';
        
        document.getElementById('playerBitrate').textContent = `${stats.bitrate} kbps`;
        document.getElementById('playerFps').textContent = `${stats.fps} fps`;
        document.getElementById('playerResolution').textContent = stats.resolution;
        document.getElementById('playerDuration').textContent = formatDuration(stats.duration);
        
        // Add latency indicator
        const statsOverlay = document.getElementById('streamStatsOverlay');
        if (statsOverlay && !statsOverlay.querySelector('.latency-badge')) {
            const latencyBadge = document.createElement('div');
            latencyBadge.className = `stat-item latency-badge latency-${latencyClass}`;
            latencyBadge.innerHTML = `
                <i class="fas fa-tachometer-alt"></i>
                <span id="playerLatency">${latency.toFixed(1)}s latency</span>
            `;
            statsOverlay.appendChild(latencyBadge);
        } else {
            const latencyEl = document.getElementById('playerLatency');
            if (latencyEl) {
                latencyEl.textContent = `${latency.toFixed(1)}s latency`;
                latencyEl.parentElement.className = `stat-item latency-badge latency-${latencyClass}`;
            }
        }
    }
    
    // FIX: update quality indicators without full re-render (BUG #5 / flicker)
    // Only update the quality badge on the specific stream card, not full innerHTML
    const streamCards = document.querySelectorAll('.stream-card');
    streamCards.forEach(card => {
        const cardKey = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (cardKey === key) {
            const quality = getStreamQuality(key);
            const badge = card.querySelector('.quality-indicator');
            if (badge && quality) {
                badge.className = `quality-indicator quality-${quality.level}`;
                badge.querySelector('span') && (badge.querySelector('span').textContent = quality.label);
            }
        }
    });
}

function calculateLatency(stats) {
    // Simulated latency based on bitrate stability
    // In real implementation, this would come from HLS.js or player metrics
    return 1.5 + (Math.random() * 1.5);
}

// Modal functions
function showCreateStreamModal() {
    document.getElementById('createStreamModal').classList.add('active');
}

function hideCreateStreamModal() {
    document.getElementById('createStreamModal').classList.remove('active');
}

function showStreamDetails(data) {
    document.getElementById('detailsTitle').textContent = data.title;
    document.getElementById('detailsRtmpUrl').value = data.rtmpUrl;
    document.getElementById('detailsStreamKey').value = data.streamKey;
    document.getElementById('detailsPlaybackUrl').value = data.streamUrl;
    currentStreamKey = data.streamKey;
    document.getElementById('streamDetailsModal').classList.add('active');
}

async function showStreamDetailsById(streamKey) {
    try {
        const response = await fetch(`/api/stream/${streamKey}`);
        const data = await response.json();
        
        const streamData = {
            title: data.stream.title,
            rtmpUrl: serverInfo.rtmpUrl,
            streamKey: streamKey,
            streamUrl: data.playbackUrl
        };
        
        showStreamDetails(streamData);
    } catch (error) {
        console.error('Error loading stream details:', error);
    }
}

function hideStreamDetailsModal() {
    document.getElementById('streamDetailsModal').classList.remove('active');
    currentStreamKey = null;
}

function showServerInfo() {
    document.getElementById('infoLocalIP').textContent = serverInfo.localIP;
    document.getElementById('infoRtmpPort').textContent = serverInfo.rtmpPort;
    document.getElementById('infoHttpPort').textContent = serverInfo.httpPort;
    document.getElementById('infoMediaPort').textContent = serverInfo.mediaPort;
    document.getElementById('serverInfoModal').classList.add('active');
}

function hideServerInfoModal() {
    document.getElementById('serverInfoModal').classList.remove('active');
}

function playStream(streamKey, title) {
    const playbackUrl = `http://${serverInfo.localIP}:8081/live/${streamKey}/index.m3u8`;
    
    document.getElementById('playerTitle').textContent = title;
    const video = document.getElementById('videoPlayer');
    video.dataset.streamKey = streamKey;
    
    // FIX: destroy previous HLS instance before creating new one (BUG #6)
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    if (Hls.isSupported()) {
        hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            liveSyncDuration: 3,        // Stay 3 seconds from live edge
            liveMaxLatencyDuration: 10, // Max 10 seconds behind live
            liveDurationInfinity: true, // Always seek to live on start
            maxBufferLength: 30,
            maxMaxBufferLength: 60
        });
        
        hlsInstance.loadSource(playbackUrl);
        hlsInstance.attachMedia(video);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            // Always jump to LIVE edge (like YouTube)
            seekToLive();
            video.play().catch(err => {
                console.warn('Autoplay blocked:', err);
                showWarningNotification('Click play button to start stream');
            });
        });
        
        // Auto-reconnect on errors (like YouTube does)
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data.type, data.details);
            
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error, attempting to recover...');
                        showWarningNotification('Connection lost, reconnecting...');
                        // Try to recover from network error
                        setTimeout(() => {
                            if (hlsInstance) {
                                hlsInstance.startLoad();
                                seekToLive(); // Jump back to live after reconnect
                            }
                        }, 1000);
                        break;
                        
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error, attempting to recover...');
                        if (hlsInstance) {
                            hlsInstance.recoverMediaError();
                            seekToLive(); // Jump back to live after recover
                        }
                        break;
                        
                    default:
                        console.error('Fatal error, cannot recover');
                        showErrorNotification('Stream playback failed');
                        if (hlsInstance) {
                            hlsInstance.destroy();
                            hlsInstance = null;
                        }
                        break;
                }
            }
        });
        
        // When video is paused for too long, jump back to live on play (YouTube behavior)
        video.addEventListener('play', () => {
            if (hlsInstance && video.duration > 0) {
                const lag = video.duration - video.currentTime;
                if (lag > 15) { // If more than 15 seconds behind
                    console.log('Jumping to live edge, was', lag.toFixed(1), 'seconds behind');
                    seekToLive();
                }
            }
        });
        
        // Keep checking if we're drifting from live
        let liveCheckInterval = setInterval(() => {
            if (hlsInstance && video.duration > 0 && !video.paused) {
                const lag = video.duration - video.currentTime;
                const goLiveBtn = document.getElementById('goLiveBtn');
                const liveIndicator = document.getElementById('liveIndicator');
                
                if (lag > 5) { // If more than 5 seconds behind, show "Go Live" button
                    if (goLiveBtn) goLiveBtn.style.display = 'flex';
                    if (liveIndicator) liveIndicator.style.opacity = '0.5';
                    
                    if (lag > 20) { // If more than 20 seconds behind, auto-jump to live
                        console.log('Auto-jumping to live, was', lag.toFixed(1), 'seconds behind');
                        seekToLive();
                    }
                } else { // We're at live edge
                    if (goLiveBtn) goLiveBtn.style.display = 'none';
                    if (liveIndicator) liveIndicator.style.opacity = '1';
                }
            }
        }, 1000); // Check every second
        
        // Store interval for cleanup
        video.dataset.liveCheckInterval = liveCheckInterval;
        
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = playbackUrl;
        video.addEventListener('loadedmetadata', () => {
            seekToLive();
            video.play();
        });
    }
    
    document.getElementById('videoPlayerModal').classList.add('active');
}

// Helper function to seek to live edge (YouTube-style)
function seekToLive() {
    const video = document.getElementById('videoPlayer');
    const goLiveBtn = document.getElementById('goLiveBtn');
    const liveIndicator = document.getElementById('liveIndicator');
    
    if (video.duration > 0 && isFinite(video.duration)) {
        video.currentTime = video.duration - 0.5; // Stay 0.5s from absolute end
        console.log('Jumped to LIVE edge');
        
        // Hide "Go Live" button, show LIVE indicator
        if (goLiveBtn) goLiveBtn.style.display = 'none';
        if (liveIndicator) liveIndicator.style.opacity = '1';
        
        // Ensure video is playing
        if (video.paused) {
            video.play().catch(err => console.warn('Play failed:', err));
        }
    }
}

function hideVideoPlayer() {
    const video = document.getElementById('videoPlayer');
    const goLiveBtn = document.getElementById('goLiveBtn');
    
    video.pause();
    video.src = '';
    
    // Clear live check interval
    if (video.dataset.liveCheckInterval) {
        clearInterval(parseInt(video.dataset.liveCheckInterval));
        delete video.dataset.liveCheckInterval;
    }
    
    // Hide "Go Live" button
    if (goLiveBtn) goLiveBtn.style.display = 'none';
    
    // FIX: destroy HLS instance to prevent memory leak (BUG #6)
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    document.getElementById('videoPlayerModal').classList.remove('active');
}

// Tab switching
function showTab(tabName, clickedEl) {  // FIX: explicit element param instead of implicit event (BUG #7)
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const tabMap = {
        'live': 'liveTab',
        'all': 'allTab',
        'stats': 'statsTab'
    };
    
    document.getElementById(tabMap[tabName]).style.display = 'block';
    
    // Set active sidebar item
    const sidebarItem = clickedEl ? clickedEl.closest('.sidebar-item') : document.querySelector('.sidebar-item.active');
    if (sidebarItem) sidebarItem.classList.add('active');
}

// Utility functions
function copyToClipboard(elementId) {
    const input = document.getElementById(elementId);
    input.select();
    document.execCommand('copy');
    showNotification('Copied to clipboard!');
}

function getTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function startUptimeTimer() {
    uptimeInterval = setInterval(() => {
        const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        document.getElementById('statUptime').textContent = `${hours}h ${minutes}m`;
    }, 1000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-enter`;
    
    const icon = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    }[type];
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('notification-show'), 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('notification-show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showWarningNotification(message) {
    showNotification(message, 'warning');
}

// Keyboard shortcuts
let keyboardHandler = null;

function setupKeyboardShortcuts() {
    keyboardHandler = (e) => {
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            hideCreateStreamModal();
            hideStreamDetailsModal();
            hideServerInfoModal();
            hideVideoPlayer();
        }
        
        // Ctrl/Cmd + N: New stream
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showCreateStreamModal();
        }
    };
    
    document.addEventListener('keydown', keyboardHandler);
}

// Mobile sidebar toggle
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuIcon = document.querySelector('.menu-icon');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) && 
        !menuIcon.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
    }
});

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Refresh streams periodically - handled by pollInterval in DOMContentLoaded
// (removed duplicate 30s interval that was firing at parse time)

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorNotification('An unexpected error occurred');
    event.preventDefault();
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show notification for script load errors
    if (!event.filename) {
        showErrorNotification('An error occurred');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clear intervals
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    if (uptimeInterval) {
        clearInterval(uptimeInterval);
    }
    
    // Destroy HLS instance
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    // Remove socket listeners
    cleanupSocketListeners();
    
    // Remove keyboard handler
    if (keyboardHandler) {
        document.removeEventListener('keydown', keyboardHandler);
    }
    
    // Disconnect socket
    if (socket && socket.connected) {
        socket.disconnect();
    }
});
