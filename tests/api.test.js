/**
 * API integration tests — spins up a minimal Express app that mirrors
 * the real server.js routes but with no NMS/FFmpeg/socket.io side effects.
 *
 * Strategy: require auth.js and helpers.js directly; reproduce just the
 * route handlers under test. This avoids the RTMP/NMS startup entirely
 * while still exercising real middleware and real auth logic.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);

// Redirect auth.js to a temp file so tests never touch the real api-keys.json
const tmpDir = mkdtempSync(join(tmpdir(), 'stream-api-test-'));
process.env.API_KEYS_FILE = join(tmpDir, 'api-keys.json');

// Fresh auth module for each test file run
const authKey = require.resolve('../auth.js');
delete require.cache[authKey];
const auth = require('../auth.js');

const { isValidUUID, sanitizeTitle } = require('../helpers.js');

// ── Build minimal test app ────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(bodyParser.json({ limit: '64kb' }));

  const streamKeys = new Map();
  const activeStreams = new Map();

  // ── /api/info (public) ───────────────────────────────────────────────────
  app.get('/api/info', (req, res) => {
    res.json({
      localIP: '127.0.0.1',
      rtmpPort: 2935,
      httpPort: 9000,
      mediaPort: 9081,
      rtmpUrl: 'rtmp://127.0.0.1:2935/live',
      totalStreams: streamKeys.size,
      activeStreams: activeStreams.size,
      ffmpegAvailable: false
    });
  });

  // ── /health (public) ────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeStreams: activeStreams.size,
      totalKeys: streamKeys.size,
      ffmpeg: false,
      timestamp: new Date().toISOString()
    });
  });

  // ── /api/stream/create ───────────────────────────────────────────────────
  app.post('/api/stream/create', auth.requireAPIKey, (req, res) => {
    const { title } = req.body;
    const sanitized = sanitizeTitle(title);
    if (!sanitized) {
      return res.status(400).json({ error: 'Title must be 1-100 characters and contain valid text' });
    }
    const { v4: uuidv4 } = require('uuid');
    const streamKey = uuidv4();
    streamKeys.set(streamKey, { key: streamKey, title: sanitized, createdAt: Date.now(), isLive: false });
    res.json({ success: true, streamKey, title: sanitized, ffmpegAvailable: false });
  });

  // ── /api/streams ─────────────────────────────────────────────────────────
  app.get('/api/streams', auth.requireAPIKey, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const allValues = Array.from(streamKeys.values());
    const total = allValues.length;
    const streams = allValues.slice(offset, offset + limit);
    res.json({ streams, total, page, limit, pages: Math.ceil(total / limit) });
  });

  // ── /api/stream/:key ─────────────────────────────────────────────────────
  app.get('/api/stream/:key', auth.requireAPIKey, (req, res) => {
    const { key } = req.params;
    if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
      return res.status(404).json({ error: 'Stream key not found' });
    }
    const stream = streamKeys.get(key);
    res.json({ stream, stats: null });
  });

  // ── DELETE /api/stream/:key ───────────────────────────────────────────────
  app.delete('/api/stream/:key', auth.requireAPIKey, (req, res) => {
    const { key } = req.params;
    if (!key || !isValidUUID(key) || !streamKeys.has(key)) {
      return res.status(404).json({ error: 'Stream key not found' });
    }
    streamKeys.delete(key);
    activeStreams.delete(key);
    res.json({ success: true });
  });

  // ── /api/keys ─────────────────────────────────────────────────────────────
  app.get('/api/keys', auth.requireAPIKey, (req, res) => {
    res.json({ keys: auth.listAPIKeys() });
  });

  app.post('/api/keys', auth.requireAPIKey, (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 80) {
      return res.status(400).json({ error: 'Name must be 1-80 characters' });
    }
    const { key, id } = auth.generateAPIKey(name.trim());
    res.status(201).json({ success: true, key, id, name: name.trim() });
  });

  app.delete('/api/keys/id/:id', auth.requireAPIKey, (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const callerKey = match ? match[1] : authHeader.trim();
    const keys = auth.listAPIKeys();
    const target = keys.find((k) => k.id === id);
    if (!target) return res.status(404).json({ error: 'Key not found' });
    if (callerKey && callerKey.startsWith(target.keyPreview.replace('...', ''))) {
      return res.status(400).json({ error: 'Cannot revoke the key you are using' });
    }
    const ok = auth.revokeAPIKeyById(id);
    if (!ok) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true });
  });

  // ── DELETE /api/keys/:key ────────────────────────────────────────────────
  app.delete('/api/keys/:key', auth.requireAPIKey, (req, res) => {
    const { key } = req.params;
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const callerKey = match ? match[1] : authHeader.trim();
    if (key === callerKey) {
      return res.status(400).json({ error: 'Cannot revoke the key you are using' });
    }
    const ok = auth.revokeAPIKey(key);
    if (!ok) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true });
  });

  // ── GET /health/deep ─────────────────────────────────────────────────────
  app.get('/health/deep', auth.requireAPIKey, (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeStreams: activeStreams.size,
      totalKeys: streamKeys.size,
      checks: {
        ffmpeg: { ok: false, detail: 'not found' },
        disk: { ok: true, detail: 'statfs ok' },
        rtmp: { ok: true, port: 2935 }
      },
      timestamp: new Date().toISOString()
    });
  });

  // ── GET /api/streams/export ──────────────────────────────────────────────
  app.get('/api/streams/export', auth.requireAPIKey, (req, res) => {
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

  return { app, streamKeys, activeStreams };
}

// ── Test suite ────────────────────────────────────────────────────────────────

let request;
let apiKey;
let streamKeys;

beforeAll(() => {
  const { app, streamKeys: sk } = buildApp();
  streamKeys = sk;
  request = supertest(app);
  // Generate a test API key
  ({ key: apiKey } = auth.generateAPIKey('Test Suite'));
});

afterAll(() => {
  if (apiKey) auth.revokeAPIKey(apiKey);
  delete process.env.API_KEYS_FILE;
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ── /api/info ─────────────────────────────────────────────────────────────────

describe('GET /api/info', () => {
  it('returns 200 with server info (public — no auth needed)', async () => {
    const res = await request.get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rtmpPort', 2935);
    expect(res.body).toHaveProperty('httpPort', 9000);
    expect(res.body).not.toHaveProperty('ffmpegPath');
  });
});

// ── /health ───────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok (public)', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ── Auth enforcement ──────────────────────────────────────────────────────────

describe('Auth enforcement', () => {
  it('rejects /api/streams with no auth → 401', async () => {
    const res = await request.get('/api/streams');
    expect(res.status).toBe(401);
  });

  it('rejects /api/streams with bad key → 403', async () => {
    const res = await request.get('/api/streams').set('Authorization', 'Bearer sk_invalid');
    expect(res.status).toBe(403);
  });

  it('accepts /api/streams with valid key → 200', async () => {
    const res = await request
      .get('/api/streams')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /api/stream/create ────────────────────────────────────────────────────

describe('POST /api/stream/create', () => {
  it('creates a stream key with valid title', async () => {
    const res = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: 'My Test Stream' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.streamKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(res.body.title).toBe('My Test Stream');
  });

  it('rejects empty title → 400', async () => {
    const res = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('rejects title >100 chars → 400', async () => {
    const res = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: 'x'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('strips control characters from title', async () => {
    const res = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: 'Clean\x00Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('CleanTitle');
  });

  it('rejects whitespace-only title → 400', async () => {
    const res = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/streams ──────────────────────────────────────────────────────────

describe('GET /api/streams', () => {
  it('returns paginated streams list', async () => {
    const res = await request
      .get('/api/streams')
      .set('Authorization', `Bearer ${apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('streams');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(Array.isArray(res.body.streams)).toBe(true);
  });

  it('respects limit query param', async () => {
    // Create 3 streams
    for (let i = 0; i < 3; i++) {
      await request
        .post('/api/stream/create')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: `Limit Test ${i}` });
    }

    const res = await request
      .get('/api/streams?limit=2')
      .set('Authorization', `Bearer ${apiKey}`);

    expect(res.body.streams.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
  });
});

// ── GET /api/stream/:key ──────────────────────────────────────────────────────

describe('GET /api/stream/:key', () => {
  it('returns 404 for unknown key', async () => {
    const res = await request
      .get('/api/stream/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-UUID key (path traversal guard)', async () => {
    const res = await request
      .get('/api/stream/../../etc/passwd')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });

  it('returns stream info for existing key', async () => {
    const create = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: 'Lookup Test' });

    const key = create.body.streamKey;
    const res = await request
      .get(`/api/stream/${key}`)
      .set('Authorization', `Bearer ${apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.stream.key).toBe(key);
    expect(res.body.stream.title).toBe('Lookup Test');
  });
});

// ── DELETE /api/stream/:key ───────────────────────────────────────────────────

describe('DELETE /api/stream/:key', () => {
  it('deletes an existing stream key', async () => {
    const create = await request
      .post('/api/stream/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ title: 'Delete Me' });

    const key = create.body.streamKey;

    const del = await request
      .delete(`/api/stream/${key}`)
      .set('Authorization', `Bearer ${apiKey}`);

    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    // Confirm gone
    const check = await request
      .get(`/api/stream/${key}`)
      .set('Authorization', `Bearer ${apiKey}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 for non-existent key', async () => {
    const res = await request
      .delete('/api/stream/00000000-0000-4000-8000-000000000099')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });
});

// ── /api/keys ─────────────────────────────────────────────────────────────────

describe('GET /api/keys', () => {
  it('returns list of API keys', async () => {
    const res = await request
      .get('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
  });

  it('key previews do not expose full secret', async () => {
    const res = await request
      .get('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`);

    for (const k of res.body.keys) {
      expect(k).toHaveProperty('keyPreview');
      expect(k.keyPreview).toMatch(/\.\.\.$/);
      expect(k).not.toHaveProperty('key'); // full key must not be present
    }
  });
});

describe('POST /api/keys', () => {
  it('creates a new API key', async () => {
    const res = await request
      .post('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: 'Integration Test Key' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.key).toMatch(/^sk_/);
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Cleanup
    auth.revokeAPIKeyById(res.body.id);
  });

  it('rejects blank name → 400', async () => {
    const res = await request
      .post('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('rejects name >80 chars → 400', async () => {
    const res = await request
      .post('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: 'x'.repeat(81) });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/keys/id/:id', () => {
  it('revokes a key by ID', async () => {
    // Create a key to revoke
    const create = await request
      .post('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: 'To Revoke' });

    const { id } = create.body;

    const del = await request
      .delete(`/api/keys/id/${id}`)
      .set('Authorization', `Bearer ${apiKey}`);

    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request
      .delete('/api/keys/id/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });

  it('rejects revoking own key when using Bearer prefix', async () => {
    const list = await request.get('/api/keys').set('Authorization', `Bearer ${apiKey}`);
    const myKeyEntry = list.body.keys.find((k) => apiKey.startsWith(k.keyPreview.replace('...', '')));
    expect(myKeyEntry).toBeDefined();

    const res = await request
      .delete(`/api/keys/id/${myKeyEntry.id}`)
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot revoke the key you are using/i);
  });

  it('rejects revoking own key when Authorization header lacks Bearer prefix', async () => {
    const list = await request.get('/api/keys').set('Authorization', apiKey);
    const myKeyEntry = list.body.keys.find((k) => apiKey.startsWith(k.keyPreview.replace('...', '')));
    expect(myKeyEntry).toBeDefined();

    const res = await request
      .delete(`/api/keys/id/${myKeyEntry.id}`)
      .set('Authorization', apiKey);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot revoke the key you are using/i);
  });
});

// ── DELETE /api/keys/:key ───────────────────────────────────────────────────

describe('DELETE /api/keys/:key', () => {
  it('revokes an API key by raw value', async () => {
    const create = await request
      .post('/api/keys')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: 'RawKeyToRevoke' });

    const rawKey = create.body.key;

    const del = await request
      .delete(`/api/keys/${rawKey}`)
      .set('Authorization', `Bearer ${apiKey}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it('rejects revoking own key directly by value', async () => {
    const res = await request
      .delete(`/api/keys/${apiKey}`)
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot revoke the key you are using/i);
  });

  it('returns 404 for unknown raw key', async () => {
    const res = await request
      .delete('/api/keys/sk_unknown_key_value_12345')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });
});

// ── GET /health/deep ────────────────────────────────────────────────────────

describe('GET /health/deep', () => {
  it('rejects unauthenticated request', async () => {
    const res = await request.get('/health/deep');
    expect(res.status).toBe(401);
  });

  it('returns deep health checks when authenticated', async () => {
    const res = await request.get('/health/deep').set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.rtmp).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── GET /api/streams/export ─────────────────────────────────────────────────

describe('GET /api/streams/export', () => {
  it('rejects unauthenticated export request', async () => {
    const res = await request.get('/api/streams/export');
    expect(res.status).toBe(401);
  });

  it('exports streams in JSON format by default', async () => {
    const res = await request
      .get('/api/streams/export')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('streams-export.json');
    expect(res.body.streams).toBeDefined();
    expect(Array.isArray(res.body.streams)).toBe(true);
  });

  it('exports streams in CSV format when requested', async () => {
    const res = await request
      .get('/api/streams/export?format=csv')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('streams-export.csv');
    expect(res.text).toContain('key,title,createdAt,isLive,startTime,endTime,durationSeconds');
  });
});
