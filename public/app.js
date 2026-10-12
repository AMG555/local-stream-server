// ─── API Key Auth ────────────────────────────────────────────────────────────
const API_KEY_STORAGE = 'stream_server_api_key';

function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key);
}

function clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE);
}

// ── Login overlay ─────────────────────────────────────────────────────────────

let _loginResolve = null; // resolves when the user submits a valid key

/** Show the login overlay and wait for the user to enter a valid key. */
function showLoginOverlay() {
    return new Promise(resolve => {
        _loginResolve = resolve;
        const overlay = document.getElementById('loginOverlay');
        overlay.style.display = 'flex';
        const input = document.getElementById('loginKeyInput');
        input.value = '';
        document.getElementById('loginError').style.display = 'none';
        setTimeout(() => input.focus(), 80);

        // Enter key submits
        input.onkeydown = (e) => { if (e.key === 'Enter') submitLogin(); };
    });
}

function hideLoginOverlay() {
    document.getElementById('loginOverlay').style.display = 'none';
    _loginResolve = null;
}

async function submitLogin() {
    const input = document.getElementById('loginKeyInput');
    const key = input.value.trim();
    if (!key) return;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking…';

    // Validate against the server
    try {
        const resp = await fetch('/api/streams', {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        if (resp.ok) {
            setApiKey(key);
            hideLoginOverlay();
            if (_loginResolve) _loginResolve(key);
        } else {
            document.getElementById('loginError').style.display = 'flex';
            input.value = '';
            input.focus();
        }
    } catch (_) {
        document.getElementById('loginError').style.display = 'flex';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
}

function toggleLoginKeyVisibility() {
    const input = document.getElementById('loginKeyInput');
    const icon  = document.getElementById('loginToggleIcon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

/**
 * Wrapper around fetch that injects Authorization header.
 * Shows the login overlay (not a browser prompt) on 401/403.
 */
async function apiFetch(url, options = {}) {
    const key = getApiKey();
    const headers = { ...(options.headers || {}) };

    if (key) headers['Authorization'] = `Bearer ${key}`;

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        // Key missing or invalid — show login overlay, wait for valid key
        clearApiKey();
        const newKey = await showLoginOverlay();
        headers['Authorization'] = `Bearer ${newKey}`;
        return fetch(url, { ...options, headers });
    }

    return response;
}

// ─────────────────────────────────────────────────────────────────────────────

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

    // If no key is stored yet, show the login overlay before doing anything else.
    if (!getApiKey()) {
        await showLoginOverlay();
    }

    await loadServerInfo();
    await loadAllStreams();
    startUptimeTimer();
    setupKeyboardShortcuts();
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
    },
    recordingEnded: (data) => {
        showSuccessNotification(`✅ Recording saved: ${data.file}`);
        updateRecordBtn(false);
        loadRecordings();
    },
    recordingError: (data) => {
        showErrorNotification(`Recording error: ${data.error}`);
        updateRecordBtn(false);
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
        const response = await apiFetch('/api/streams');
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
        const response = await apiFetch('/api/stream/create', {
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
        const response = await apiFetch(`/api/stream/${streamKey}`, {
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
    document.getElementById('rtmpPort').textContent = serverInfo.rtmpPort || 2935;
    if (document.getElementById('srtPort')) {
        document.getElementById('srtPort').textContent = serverInfo.srtPort || 9554;
    }
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
                URL: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">rtmp://${serverInfo && serverInfo.localIP ? serverInfo.localIP : 'YOUR_IP'}:2935/live/YOUR_STREAM_KEY</code>
                <br><br>
                <details style="cursor: pointer;">
                    <summary>Or use OBS Preview / FFplay</summary>
                    <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <strong>OBS Preview:</strong> Add Media Source with RTMP URL<br>
                        <strong>FFplay:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px;">ffplay rtmp://IP:2935/live/KEY</code>
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
                        <span class="quality-label">${escHtml(quality.label)}</span>
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
        document.getElementById('playerBitrate').textContent = `${stats.bitrate} kbps`;
        document.getElementById('playerFps').textContent = `${stats.fps} fps`;
        document.getElementById('playerResolution').textContent = stats.resolution;
        document.getElementById('playerDuration').textContent = formatDuration(stats.duration);

        // Ensure latency badge exists (created once, updated by _setLatencyBadge)
        const statsOverlay = document.getElementById('streamStatsOverlay');
        if (statsOverlay && !statsOverlay.querySelector('.latency-badge')) {
            const latencyBadge = document.createElement('div');
            latencyBadge.className = 'stat-item latency-badge latency-low';
            latencyBadge.innerHTML = `
                <i class="fas fa-tachometer-alt"></i>
                <span id="playerLatency">-- latency</span>
            `;
            statsOverlay.appendChild(latencyBadge);
        }
        // For HLS mode: update latency from HLS.js API (in ms)
        if (currentPlayerMode === 'hls' && hlsInstance) {
            const lat = hlsInstance.latency;
            _setLatencyBadge(lat !== undefined && isFinite(lat) ? lat * 1000 : null);
        }
    }
    
    // FIX: update quality indicators without full re-render (BUG #5 / flicker)
    // Only update the quality badge on the specific stream card, not full innerHTML
    const streamCards = document.querySelectorAll('.stream-card');
    streamCards.forEach(card => {
        const cardKey = card.dataset.streamKey;
        if (cardKey === key) {
            const quality = getStreamQuality(key);
            let badge = card.querySelector('.quality-indicator');
            if (quality) {
                if (!badge) {
                    const thumb = card.querySelector('.stream-thumbnail');
                    if (thumb) {
                        badge = document.createElement('div');
                        badge.className = `quality-indicator quality-${quality.level}`;
                        badge.style.cssText = 'position: absolute; bottom: 10px; right: 10px;';
                        badge.innerHTML = `<span class="quality-dot"></span><span class="quality-label">${escHtml(quality.label)}</span>`;
                        thumb.appendChild(badge);
                    }
                } else {
                    badge.className = `quality-indicator quality-${quality.level}`;
                    const labelEl = badge.querySelector('.quality-label');
                    if (labelEl) {
                        labelEl.textContent = quality.label;
                    } else {
                        badge.innerHTML = `<span class="quality-dot"></span><span class="quality-label">${escHtml(quality.label)}</span>`;
                    }
                }
            }
        }
    });
}

function calculateLatency() {
    // Use HLS.js built-in latency for live streams (video.duration is Infinity for live HLS)
    if (hlsInstance) {
        const lat = hlsInstance.latency;           // seconds behind live edge (HLS.js API)
        if (lat !== undefined && isFinite(lat) && lat >= 0) return lat;
        // Fallback: use liveSyncPosition if latency not yet available
        const video = document.getElementById('videoPlayer');
        if (video && hlsInstance.liveSyncPosition && video.currentTime > 0) {
            return Math.max(0, hlsInstance.liveSyncPosition - video.currentTime);
        }
    }
    return null; // No data yet
}

/**
 * Update the latency badge element with a real measured value.
 * Pass latencyMs in milliseconds for WS/WebRTC, or seconds for HLS.
 */
function _setLatencyBadge(valueMs) {
    const latencyEl = document.getElementById('playerLatency');
    if (!latencyEl) return;
    if (valueMs === null || !isFinite(valueMs)) {
        latencyEl.textContent = '-- latency';
        latencyEl.parentElement.className = 'stat-item latency-badge latency-low';
        return;
    }
    const ms = Math.round(valueMs);
    const label = ms < 1000 ? `${ms}ms latency` : `${(ms / 1000).toFixed(1)}s latency`;
    const cls   = ms < 500 ? 'low' : ms < 2000 ? 'medium' : 'high';
    latencyEl.textContent = label;
    latencyEl.parentElement.className = `stat-item latency-badge latency-${cls}`;
}

/** Show the "Go server offline" overlay inside the player area. */
function _showGoServerOffline() {
    const el = document.getElementById('goServerOffline');
    if (el) el.style.display = 'flex';
}

/** Hide the "Go server offline" overlay. */
function _hideGoServerOffline() {
    const el = document.getElementById('goServerOffline');
    if (el) el.style.display = 'none';
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

    // RTMP fields
    document.getElementById('detailsRtmpUrl').value = data.rtmpUrl;
    document.getElementById('detailsStreamKey').value = data.streamKey;
    document.getElementById('detailsPlaybackUrl').value = data.streamUrl;

    // SRT fields — build the full srt:// URL with streamid in OBS format
    const srtBase = serverInfo.srtUrl || `srt://${serverInfo.localIP || 'localhost'}:9554`;
    const srtUrl = `${srtBase}?streamid=key=${data.streamKey}&latency=120000`;
    document.getElementById('detailsSrtUrl').value = srtUrl;
    document.getElementById('detailsStreamKeySrt').value = data.streamKey;
    // WS playback URL for SRT ingest (Go server port 9084)
    const goApiBase = `ws://${serverInfo.localIP || 'localhost'}:9084`;
    document.getElementById('detailsPlaybackUrlSrt').value = `${goApiBase}/ws?key=${data.streamKey}`;

    // Update FFmpeg command in SRT panel
    const ffmpegEl = document.getElementById('srtFfmpegCmd');
    if (ffmpegEl) {
        ffmpegEl.textContent = `ffmpeg -re -i input.mp4 -c copy -f mpegts "${srtUrl}"`;
    }

    // Reset protocol tab to RTMP on open
    switchIngestProtocol('rtmp', document.getElementById('protocolBtnRtmp'));

    currentStreamKey = data.streamKey;
    document.getElementById('streamDetailsModal').classList.add('active');
}

/**
 * Switch between RTMP and SRT ingest protocol tabs in the stream details modal.
 */
function switchIngestProtocol(protocol, btn) {
    const rtmpPanel = document.getElementById('ingestPanelRtmp');
    const srtPanel  = document.getElementById('ingestPanelSrt');
    const rtmpBtn   = document.getElementById('protocolBtnRtmp');
    const srtBtn    = document.getElementById('protocolBtnSrt');

    if (protocol === 'rtmp') {
        rtmpPanel.style.display = '';
        srtPanel.style.display  = 'none';
        rtmpBtn.classList.add('active');
        srtBtn.classList.remove('active');
    } else {
        rtmpPanel.style.display = 'none';
        srtPanel.style.display  = '';
        srtBtn.classList.add('active');
        rtmpBtn.classList.remove('active');
    }
}

async function showStreamDetailsById(streamKey) {
    try {
        const response = await apiFetch(`/api/stream/${streamKey}`);
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
    document.getElementById('infoSrtPort').textContent = serverInfo.srtPort || 9554;
    document.getElementById('infoHttpPort').textContent = serverInfo.httpPort;
    document.getElementById('infoMediaPort').textContent = serverInfo.mediaPort;
    document.getElementById('serverInfoModal').classList.add('active');
}

function hideServerInfoModal() {
    document.getElementById('serverInfoModal').classList.remove('active');
}

function playStream(streamKey, title) {
    const playbackUrl = `http://${serverInfo.localIP}:${serverInfo.mediaPort}/live/${streamKey}/index.m3u8`;
    
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
            // Ultra-low latency configuration
            enableWorker: true,
            lowLatencyMode: true,
            
            // EXTREME buffering for near-zero latency
            backBufferLength: 0,           // No back buffer
            maxBufferLength: 2,            // 2 second buffer (matches 2 segments)
            maxMaxBufferLength: 3,         // Max 3 seconds
            maxBufferSize: 3 * 1000 * 1000, // 3MB buffer
            maxBufferHole: 0.1,            // Small gaps
            
            // Live edge sync - GLUED to live
            liveSyncDuration: 0.5,         // 0.5 seconds from live
            liveMaxLatencyDuration: 2,     // Max 2 seconds behind
            liveDurationInfinity: true,
            
            // Faster segment loading (EXTREME)
            manifestLoadingTimeOut: 1000,  // 1s timeout
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 200,
            
            // Level/fragment loading optimization (EXTREME)
            levelLoadingTimeOut: 1000,
            levelLoadingMaxRetry: 2,
            levelLoadingRetryDelay: 200,
            
            fragLoadingTimeOut: 1000,
            fragLoadingMaxRetry: 3,
            fragLoadingRetryDelay: 200,
            
            // Start playback faster
            startPosition: -1,             // Start at live edge
            startFragPrefetch: true,       // Prefetch first fragment
            
            // ABR (Adaptive Bitrate) for low latency
            abrEwmaDefaultEstimate: 500000, // 500kbps initial estimate
            abrBandWidthFactor: 0.8,       // Conservative bandwidth usage
            abrBandWidthUpFactor: 0.5,     // Slower quality increase
            
            // Playback optimization
            nudgeMaxRetry: 5,
            maxFragLookUpTolerance: 0.1,
            
            // Error handling
            capLevelToPlayerSize: true,
            testBandwidth: true
        });
        
        hlsInstance.loadSource(playbackUrl);
        hlsInstance.attachMedia(video);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            // Always jump to LIVE edge (like YouTube)
            seekToLive();
            // Try to play with audio first. If Chrome blocks it (autoplay policy),
            // fall back to muted autoplay and then immediately unmute — the user
            // opening the modal counts as a gesture so unmuting works right away.
            video.muted = false;
            video.play().catch(() => {
                // Autoplay blocked without gesture — mute and retry
                video.muted = true;
                video.play().then(() => {
                    // Unmute immediately: modal click = user gesture
                    video.muted = false;
                }).catch(err => {
                    console.warn('Autoplay blocked even muted:', err);
                    showWarningNotification('Click the play button to start stream');
                });
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
                if (lag > 5) { // If more than 5 seconds behind (was 15)
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
                
                // Update real-time latency display — use HLS.js latency API (not video.duration)
                const hlsLat = hlsInstance ? hlsInstance.latency : null;
                const latMs  = (hlsLat !== undefined && isFinite(hlsLat) && hlsLat >= 0)
                    ? hlsLat * 1000
                    : Math.max(0, lag) * 1000;
                _setLatencyBadge(latMs);
                
                if (lag > 2) { // If more than 2 seconds behind, show button
                    if (goLiveBtn) goLiveBtn.style.display = 'flex';
                    if (liveIndicator) liveIndicator.style.opacity = '0.5';
                    
                    if (lag > 4) { // If more than 4 seconds behind, auto-jump
                        console.log('Auto-jumping to live, was', lag.toFixed(1), 'seconds behind');
                        seekToLive();
                    }
                } else { // We're at live edge
                    if (goLiveBtn) goLiveBtn.style.display = 'none';
                    if (liveIndicator) liveIndicator.style.opacity = '1';
                }
            }
        }, 200); // Check every 0.2 seconds
        
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
        video.currentTime = video.duration - 0.1; // Stay 0.1s from end
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
    // Tear down whichever player mode is active (HLS, flv.js WS, or WebRTC)
    _teardownCurrentPlayer();

    // Reset state
    currentPlayingKey = null;
    isRecording = false;

    _hideGoServerOffline();
    const goLiveBtn = document.getElementById('goLiveBtn');
    if (goLiveBtn) goLiveBtn.style.display = 'none';

    // Reset mode buttons to HLS default for next open
    currentPlayerMode = 'hls';
    document.querySelectorAll('.player-mode-btn[id^="modeBtn"]').forEach(b => b.classList.remove('active'));
    const hlsBtn = document.getElementById('modeBtnHls');
    if (hlsBtn) hlsBtn.classList.add('active');

    // Restore element visibility to HLS defaults
    const hlsVideo = document.getElementById('videoPlayer');
    const webrtcVid = document.getElementById('webrtcPlayer');
    if (hlsVideo)  { hlsVideo.style.display  = 'block'; }
    if (webrtcVid) { webrtcVid.style.display = 'none';  }

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
        'stats': 'statsTab',
        'recordings': 'recordingsTab',
        'apikeys': 'apikeysTab'
    };
    
    document.getElementById(tabMap[tabName]).style.display = 'block';
    
    // Set active sidebar item
    const sidebarItem = clickedEl ? clickedEl.closest('.sidebar-item') : document.querySelector('.sidebar-item.active');
    if (sidebarItem) sidebarItem.classList.add('active');

    // Lazy-load data when switching to these tabs
    if (tabName === 'recordings') loadRecordings();
    if (tabName === 'apikeys') loadAPIKeys();
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
    }[type] || 'info-circle';
    
    const iconEl = document.createElement('i');
    iconEl.className = `fas fa-${icon}`;
    
    const spanEl = document.createElement('span');
    spanEl.textContent = message;
    
    notification.appendChild(iconEl);
    notification.appendChild(spanEl);
    
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

// ─── Player Mode (HLS / WebSocket / WebRTC) ──────────────────────────────────

let currentPlayerMode = 'hls'; // 'hls' | 'ws' | 'webrtc'
let wsPlayerConn = null;        // active WebSocket connection
let webrtcPeerConn = null;      // active RTCPeerConnection
let currentPlayingKey = null;   // stream key currently in player

/**
 * Switch between HLS, WebSocket MSE, and WebRTC playback modes.
 */
function switchPlayerMode(mode, btn) {
    if (mode === currentPlayerMode) return;

    // Stop current mode
    _teardownCurrentPlayer();

    // Update button states
    document.querySelectorAll('.player-mode-btn[id^="modeBtn"]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    currentPlayerMode = mode;

    // Reset latency badge — new mode will populate it once connected
    _setLatencyBadge(null);

    // Hide the offline overlay — the new player will show it again if needed
    _hideGoServerOffline();

    // Show/hide the correct player element.
    // Note: WS mode reuses hlsVideo (flv.js attaches to it) — wsCanvas is unused.
    const hlsVideo   = document.getElementById('videoPlayer');
    const webrtcVid  = document.getElementById('webrtcPlayer');
    const wsCanvas   = document.getElementById('wsCanvas');
    const goLiveBtn  = document.getElementById('goLiveBtn');

    hlsVideo.style.display  = (mode === 'hls' || mode === 'ws') ? 'block' : 'none';
    webrtcVid.style.display = (mode === 'webrtc') ? 'block' : 'none';
    wsCanvas.style.display  = 'none'; // flv.js uses the <video> element, not canvas
    if (goLiveBtn) goLiveBtn.style.display = 'none';

    // Re-start player in new mode if we were already playing something
    if (currentPlayingKey) {
        const title = document.getElementById('playerTitle').textContent;
        _startPlayer(currentPlayingKey, title, mode);
    }
}

function _teardownCurrentPlayer() {
    // HLS
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    const hlsVideo = document.getElementById('videoPlayer');
    if (hlsVideo) { hlsVideo.pause(); hlsVideo.src = ''; }
    const liveCheckInterval = parseInt(hlsVideo?.dataset.liveCheckInterval);
    if (!isNaN(liveCheckInterval)) { clearInterval(liveCheckInterval); delete hlsVideo.dataset.liveCheckInterval; }

    // WebSocket / flv.js — wsPlayerConn.close() destroys the flv.js instance
    if (wsPlayerConn) { wsPlayerConn.close(); wsPlayerConn = null; }
    // Belt-and-suspenders: destroy flvPlayerInstance directly if wsPlayerConn was already null
    if (flvPlayerInstance) {
        try { flvPlayerInstance.pause(); flvPlayerInstance.unload();
              flvPlayerInstance.detachMediaElement(); flvPlayerInstance.destroy(); } catch (_) {}
        flvPlayerInstance = null;
    }

    // WebRTC
    if (webrtcPeerConn) { webrtcPeerConn.close(); webrtcPeerConn = null; }
    const webrtcVid = document.getElementById('webrtcPlayer');
    if (webrtcVid) { webrtcVid.pause(); webrtcVid.srcObject = null; }
}

/**
 * Internal: start playback in the requested mode.
 * Called by playStream() and switchPlayerMode().
 */
function _startPlayer(streamKey, title, mode) {
    if (mode === 'hls' || !mode) {
        // ---- existing HLS path (playStream already sets this up) ----
        playStream(streamKey, title);
        return;
    }

    if (mode === 'ws') {
        _startWebSocketPlayer(streamKey);
        return;
    }

    if (mode === 'webrtc') {
        _startWebRTCPlayer(streamKey);
        return;
    }
}

// ─── WebSocket MSE Player ────────────────────────────────────────────────────

let flvPlayerInstance = null; // flv.js player instance

/**
 * Connect to the Go media server WebSocket endpoint and play via flv.js MSE.
 * flv.js speaks FLV-over-WebSocket natively — same as the Bilibili/Alibaba CDN stack.
 * Falls back gracefully with a clear message if the Go server is not running.
 */
async function _startWebSocketPlayer(streamKey) {
    const goPort = 9084;
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.hostname}:${goPort}/ws?key=${encodeURIComponent(streamKey)}`;

    // Reuse the HLS <video> element — hide canvas (not needed with flv.js)
    const wsCanvas = document.getElementById('wsCanvas');
    const hlsVideo = document.getElementById('videoPlayer');
    wsCanvas.style.display = 'none';
    hlsVideo.style.display = 'block';

    if (!window.flvjs || !flvjs.isSupported()) {
        showWarningNotification('WebSocket MSE not supported in this browser — use HLS mode');
        return;
    }

    if (flvPlayerInstance) {
        flvPlayerInstance.destroy();
        flvPlayerInstance = null;
    }

    flvPlayerInstance = flvjs.createPlayer({
        type: 'flv',
        isLive: true,
        url: wsUrl,
    }, {
        enableWorker: false,        // worker breaks in some CSP setups
        lazyLoadMaxDuration: 3 * 60,
        seekType: 'range',
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.5,   // chase to within 1.5s
        liveBufferLatencyMinRemain: 0.2,
    });

    flvPlayerInstance.attachMediaElement(hlsVideo);

    // Real-time latency for WS/FLV: track wall-clock offset on first media chunk
    let _wsStreamStartWall = null;  // Date.now() when first frame received
    let _wsStreamStartPts  = null;  // PTS (ms) of first frame
    let _wsLatencyInterval = null;

    flvPlayerInstance.on(flvjs.Events.STATISTICS_INFO, (info) => {
        // flv.js exposes decodedFrames, currentTime, etc.
        // Use video element's buffered end vs currentTime as WS latency proxy
        const vid = document.getElementById('videoPlayer');
        if (vid && vid.buffered.length > 0) {
            const bufferEnd = vid.buffered.end(vid.buffered.length - 1);
            const latencyMs = Math.max(0, (bufferEnd - vid.currentTime) * 1000);
            _setLatencyBadge(latencyMs);
        }
    });

    flvPlayerInstance.on(flvjs.Events.ERROR, (errType, errDetail) => {
        console.error('flv.js error:', errType, errDetail);
        if (errType === flvjs.ErrorTypes.NETWORK_ERROR) {
            _showGoServerOffline();
        } else {
            showErrorNotification(`WebSocket player error: ${errType}`);
        }
        if (_wsLatencyInterval) { clearInterval(_wsLatencyInterval); _wsLatencyInterval = null; }
    });

    // Poll latency every 500ms using buffer lead as a proxy for end-to-end delay
    _wsLatencyInterval = setInterval(() => {
        const vid = document.getElementById('videoPlayer');
        if (vid && vid.buffered.length > 0 && currentPlayerMode === 'ws') {
            const bufEnd = vid.buffered.end(vid.buffered.length - 1);
            _setLatencyBadge(Math.max(0, (bufEnd - vid.currentTime) * 1000));
        }
    }, 500);

    flvPlayerInstance.load();
    hlsVideo.play().catch(e => console.warn('flv autoplay blocked:', e));

    // Store the connection reference so _teardownCurrentPlayer can clean up
    wsPlayerConn = { close: () => {
        if (_wsLatencyInterval) { clearInterval(_wsLatencyInterval); _wsLatencyInterval = null; }
        if (flvPlayerInstance) {
            flvPlayerInstance.pause();
            flvPlayerInstance.unload();
            flvPlayerInstance.detachMediaElement();
            flvPlayerInstance.destroy();
            flvPlayerInstance = null;
        }
    }};

    showSuccessNotification('WebSocket stream connected via flv.js MSE');
}

// ─── WebRTC Player ───────────────────────────────────────────────────────────

/**
 * Start WebRTC playback via the Go media server signaling endpoint.
 */
async function _startWebRTCPlayer(streamKey) {
    const goPort = 9084;
    const webrtcVid = document.getElementById('webrtcPlayer');
    webrtcVid.style.display = 'block';

    // Real-time latency poll interval (cleared on teardown)
    let _webrtcLatencyInterval = null;

    try {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        webrtcPeerConn = pc;

        // peerId is returned by the server — used for ICE so multiple viewers work
        let peerId = null;

        // ontrack fires once per track (video + audio separately).
        // We wait until we have at least a video track before calling play().
        let _tracksReceived = 0;
        const _expectedTracks = 2; // video + audio

        pc.ontrack = (evt) => {
            _tracksReceived++;
            if (evt.streams && evt.streams[0]) {
                // Always update srcObject so the stream has all tracks
                webrtcVid.srcObject = evt.streams[0];
            }

            // Only start playback once we have video (don't play on audio-only first fire)
            const hasVideo = webrtcVid.srcObject &&
                [...webrtcVid.srcObject.getVideoTracks()].length > 0;

            if (hasVideo && webrtcVid.paused) {
                // Try unmuted first (user opened modal = gesture), fall back to muted
                webrtcVid.muted = false;
                webrtcVid.play().catch(() => {
                    webrtcVid.muted = true;
                    webrtcVid.play().then(() => {
                        webrtcVid.muted = false;
                    }).catch(e => console.warn('WebRTC autoplay blocked:', e));
                });

                if (_tracksReceived >= _expectedTracks) {
                    showSuccessNotification('WebRTC stream connected');
                } else {
                    showSuccessNotification('WebRTC video connected');
                }

                // Start real-time latency measurement via RTCPeerConnection.getStats().
                // Use jitterBufferDelay/jitterBufferEmittedCount (W3C spec) which gives
                // the actual decoded-frame delay in the jitter buffer — a real latency
                // proxy. jitter alone (in seconds, usually <0.01) is not a latency metric.
                if (!_webrtcLatencyInterval) {
                    let _prevDelay = 0, _prevEmitted = 0;
                    _webrtcLatencyInterval = setInterval(async () => {
                        if (!webrtcPeerConn || currentPlayerMode !== 'webrtc') {
                            clearInterval(_webrtcLatencyInterval);
                            return;
                        }
                        try {
                            const stats = await webrtcPeerConn.getStats();
                            stats.forEach(report => {
                                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                                    const delay   = report.jitterBufferDelay   || 0;
                                    const emitted = report.jitterBufferEmittedCount || 0;
                                    const dDelay   = delay   - _prevDelay;
                                    const dEmitted = emitted - _prevEmitted;
                                    _prevDelay   = delay;
                                    _prevEmitted = emitted;
                                    if (dEmitted > 0) {
                                        // Average jitter buffer delay per frame this interval (seconds → ms)
                                        const avgDelayMs = (dDelay / dEmitted) * 1000;
                                        // Add ~20 ms for network/encode overhead estimate
                                        _setLatencyBadge(Math.round(avgDelayMs + 20));
                                    }
                                }
                            });
                        } catch (_) {}
                    }, 1000);

                    // Hook close to clear the interval
                    const origClose = webrtcPeerConn.close.bind(webrtcPeerConn);
                    webrtcPeerConn.close = () => {
                        if (_webrtcLatencyInterval) { clearInterval(_webrtcLatencyInterval); _webrtcLatencyInterval = null; }
                        origClose();
                    };
                }
            }
        };

        pc.onicecandidate = async (evt) => {
            if (evt.candidate && peerId) {
                try {
                    await fetch(
                        `http://${window.location.hostname}:${goPort}/webrtc/candidate?peerId=${encodeURIComponent(peerId)}`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evt.candidate) }
                    );
                } catch (_) {} // non-fatal — ICE can continue
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                showWarningNotification('WebRTC connection lost');
                if (_webrtcLatencyInterval) { clearInterval(_webrtcLatencyInterval); _webrtcLatencyInterval = null; }
            }
        };

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const resp = await fetch(
            `http://${window.location.hostname}:${goPort}/webrtc/offer?key=${encodeURIComponent(streamKey)}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offer) }
        );

        if (!resp.ok) throw new Error(`Signaling failed: ${resp.status} — Go media server not running`);

        const body = await resp.json();
        // Server returns { answer: SDP, peerId: string }
        peerId = body.peerId || resp.headers.get('X-Peer-ID') || null;
        await pc.setRemoteDescription(body.answer || body);

    } catch (err) {
        if (_webrtcLatencyInterval) { clearInterval(_webrtcLatencyInterval); _webrtcLatencyInterval = null; }
        const isServerDown = err.message.includes('Failed to fetch') || err.message.includes('Go media server');
        if (isServerDown) {
            _showGoServerOffline();
        } else {
            showErrorNotification(`WebRTC error: ${err.message}`);
        }
        webrtcVid.style.display = 'none';
    }
}

// ─── Recording Controls ───────────────────────────────────────────────────────

let isRecording = false;

function updateRecordBtn(active) {
    isRecording = active;
    const btn = document.getElementById('recordBtn');
    if (!btn) return;
    if (active) {
        btn.style.borderColor = 'rgba(255,60,60,0.8)';
        btn.style.background = 'rgba(255,60,60,0.15)';
        btn.innerHTML = '<i class="fas fa-stop" style="color:#f44;"></i> Stop';
    } else {
        btn.style.borderColor = 'rgba(255,60,60,0.4)';
        btn.style.background = 'transparent';
        btn.innerHTML = '<i class="fas fa-circle" style="color:#f44;"></i> Record';
    }
}

async function toggleRecording() {
    const key = document.getElementById('videoPlayer').dataset.streamKey
             || document.getElementById('webrtcPlayer').dataset.streamKey;
    if (!key) { showWarningNotification('No stream open in player'); return; }

    if (!isRecording) {
        try {
            const resp = await apiFetch(`/api/stream/${key}/record/start`, { method: 'POST' });
            const data = await resp.json();
            if (resp.ok) {
                updateRecordBtn(true);
                showSuccessNotification(`🔴 Recording started: ${data.file}`);
            } else {
                showErrorNotification(data.error || 'Could not start recording');
            }
        } catch (err) {
            showErrorNotification('Recording failed: ' + err.message);
        }
    } else {
        try {
            const resp = await apiFetch(`/api/stream/${key}/record/stop`, { method: 'POST' });
            const data = await resp.json();
            if (resp.ok) {
                updateRecordBtn(false);
                showSuccessNotification(`⏹ Recording stopped: ${data.file}`);
            } else {
                showErrorNotification(data.error || 'Could not stop recording');
            }
        } catch (err) {
            showErrorNotification('Stop recording failed: ' + err.message);
        }
    }
}

// ─── Recordings Panel ─────────────────────────────────────────────────────────

async function loadRecordings() {
    const container = document.getElementById('recordingsList');
    if (!container) return;

    try {
        const resp = await apiFetch('/api/recordings');
        const data = await resp.json();

        if (!data.recordings || data.recordings.length === 0) {
            container.innerHTML = '<div class="no-streams"><i class="fas fa-film"></i><p>No recordings yet</p></div>';
            return;
        }

        container.innerHTML = data.recordings.map(rec => {
            const mb = (rec.size / 1048576).toFixed(1);
            const date = new Date(rec.createdAt).toLocaleString();
            const safeFile = escHtml(rec.file);
            return `
            <div class="stream-list-item" data-rec-file="${safeFile}">
                <div class="stream-list-info">
                    <div class="stream-list-title"><i class="fas fa-film"></i> ${safeFile}</div>
                    <div class="stream-list-details">
                        <span><i class="fas fa-hdd"></i> ${mb} MB</span>
                        <span><i class="fas fa-calendar"></i> ${date}</span>
                    </div>
                </div>
                <div class="stream-list-actions">
                    <a href="/api/recordings/${encodeURIComponent(rec.file)}" class="btn-secondary btn-rec-download" download="${safeFile}">
                        <i class="fas fa-download"></i> Download
                    </a>
                    <button class="btn-icon btn-rec-delete" data-file="${safeFile}" aria-label="Delete recording" style="margin-left:6px">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        // Inject API key into download links (required auth header)
        container.querySelectorAll('a.btn-rec-download').forEach(link => {
            const url = new URL(link.href);
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const resp = await apiFetch(url.pathname);
                    const blob = await resp.blob();
                    const objUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objUrl;
                    a.download = link.getAttribute('download');
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
                } catch (err) {
                    showErrorNotification('Download failed: ' + err.message);
                }
            });
        });

        // Delete recording buttons
        container.querySelectorAll('button.btn-rec-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const file = btn.dataset.file;
                if (!confirm(`Delete recording "${file}"? This cannot be undone.`)) return;
                try {
                    const resp = await apiFetch(`/api/recordings/${encodeURIComponent(file)}`, { method: 'DELETE' });
                    if (resp.ok) {
                        showSuccessNotification('Recording deleted');
                        loadRecordings();
                    } else {
                        const data = await resp.json().catch(() => ({}));
                        showErrorNotification(data.error || 'Failed to delete recording');
                    }
                } catch (err) {
                    showErrorNotification('Delete failed: ' + err.message);
                }
            });
        });

    } catch (err) {
        container.innerHTML = '<div class="no-streams"><i class="fas fa-exclamation-triangle"></i><p>Failed to load recordings</p></div>';
    }
}

// ─── API Key Management ───────────────────────────────────────────────────────

async function loadAPIKeys() {
    const container = document.getElementById('apiKeysList');
    if (!container) return;

    try {
        const resp = await apiFetch('/api/keys');
        const data = await resp.json();

        if (!data.keys || data.keys.length === 0) {
            container.innerHTML = '<div class="no-streams"><i class="fas fa-key"></i><p>No API keys found</p></div>';
            return;
        }

        const currentKey = getApiKey();

        container.innerHTML = data.keys.map(k => {
            const safeName = escHtml(k.name);
            const safePreview = escHtml(k.keyPreview);
            const safeId = escHtml(k.id || '');
            const lastUsed = k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Never';
            const isActive = currentKey.startsWith(k.keyPreview.replace('...', ''));
            return `
            <div class="stream-list-item">
                <div class="stream-list-info">
                    <div class="stream-list-title">
                        ${safeName}
                        ${isActive ? '<span class="status-badge live">Active Session</span>' : ''}
                    </div>
                    <div class="stream-list-details">
                        <span><i class="fas fa-key"></i> ${safePreview}</span>
                        <span><i class="fas fa-clock"></i> Last used: ${lastUsed}</span>
                        <span><i class="fas fa-calendar"></i> Created: ${new Date(k.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="stream-list-actions">
                    ${isActive ? '' : `<button class="btn-icon btn-delete-key" data-key-id="${safeId}" aria-label="Revoke key">
                        <i class="fas fa-trash"></i>
                    </button>`}
                </div>
            </div>`;
        }).join('');

        // Bind revoke buttons — uses ID-based endpoint so we never expose the full key
        container.querySelectorAll('.btn-delete-key').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Revoke this API key? This cannot be undone.')) return;
                const keyId = btn.dataset.keyId;
                if (!keyId) { showErrorNotification('Key ID missing — cannot revoke'); return; }
                try {
                    const resp = await apiFetch(`/api/keys/id/${encodeURIComponent(keyId)}`, { method: 'DELETE' });
                    if (resp.ok) {
                        showSuccessNotification('API key revoked');
                        loadAPIKeys();
                    } else {
                        const data = await resp.json().catch(() => ({}));
                        showErrorNotification(data.error || 'Failed to revoke key');
                    }
                } catch (err) {
                    showErrorNotification('Revoke failed: ' + err.message);
                }
            });
        });

        // Update export links with Authorization token via anchor interception
        ['exportJsonLink', 'exportCsvLink'].forEach(id => {
            const link = document.getElementById(id);
            if (link) {
                const cloned = link.cloneNode(true);
                link.parentNode.replaceChild(cloned, link);
                cloned.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const format = id.includes('Json') ? 'json' : 'csv';
                    try {
                        const resp = await apiFetch(`/api/streams/export?format=${format}`);
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `streams-export.${format}`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                    } catch (err) {
                        showErrorNotification('Export failed');
                    }
                });
            }
        });

    } catch (err) {
        container.innerHTML = '<div class="no-streams"><i class="fas fa-exclamation-triangle"></i><p>Failed to load API keys</p></div>';
    }
}

function showCreateKeyModal() {
    document.getElementById('newKeyName').value = '';
    document.getElementById('newKeyResult').style.display = 'none';
    document.getElementById('createKeyBtn').disabled = false;
    document.getElementById('createKeyModal').classList.add('active');
}

function hideCreateKeyModal() {
    document.getElementById('createKeyModal').classList.remove('active');
    loadAPIKeys();
}

async function createAPIKey(btn) {
    const name = document.getElementById('newKeyName').value.trim();
    if (!name) { showErrorNotification('Enter a key name'); return; }

    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
        const resp = await apiFetch('/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await resp.json();

        if (!resp.ok) throw new Error(data.error || 'Failed');

        document.getElementById('newKeyValue').value = data.key;
        document.getElementById('newKeyResult').style.display = 'block';
        btn.style.display = 'none'; // Hide create button once shown
        showSuccessNotification('API key created');
    } catch (err) {
        showErrorNotification('Failed to create key: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

// ─── Track currentPlayingKey via MutationObserver ────────────────────────────
// The script runs after DOM is ready (it's at the bottom of the page), so we
// can observe the videoPlayer element directly — no DOMContentLoaded needed.
(function () {
    const v = document.getElementById('videoPlayer');
    if (!v) return; // defensive: element must exist

    const observer = new MutationObserver(() => {
        if (v.dataset.streamKey) {
            currentPlayingKey = v.dataset.streamKey;
            updateRecordBtn(false);
            isRecording = false;
        }
    });
    observer.observe(v, { attributes: true, attributeFilter: ['data-stream-key'] });
})();
