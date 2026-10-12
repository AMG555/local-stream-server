import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isValidUUID, sanitizeTitle, redactStreamKey, safeArgs } = require('../helpers.js');

// ── isValidUUID ───────────────────────────────────────────────────────────────

describe('isValidUUID', () => {
  it('accepts a valid v4 UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects non-v4 UUIDs (wrong version digit)', () => {
    // Version 1 UUID
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
    // Version 3 UUID
    expect(isValidUUID('6ba7b810-9dad-31d1-80b4-00c04fd430c8')).toBe(false);
  });

  it('rejects UUIDs with wrong variant digit', () => {
    // Variant must be [89ab] — '0' is invalid
    expect(isValidUUID('550e8400-e29b-41d4-0716-446655440000')).toBe(false);
  });

  it('rejects path traversal strings', () => {
    expect(isValidUUID('../../../etc/passwd')).toBe(false);
    expect(isValidUUID('../../evil')).toBe(false);
  });

  it('rejects plain alphanumeric strings', () => {
    expect(isValidUUID('notauuid')).toBe(false);
    expect(isValidUUID('12345678901234567890123456789012')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID(123)).toBe(false);
    expect(isValidUUID({})).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});

// ── sanitizeTitle ─────────────────────────────────────────────────────────────

describe('sanitizeTitle', () => {
  it('accepts a normal title', () => {
    expect(sanitizeTitle('My Stream')).toBe('My Stream');
  });

  it('trims leading/trailing whitespace', () => {
    expect(sanitizeTitle('  Hello  ')).toBe('Hello');
  });

  it('strips control characters', () => {
    expect(sanitizeTitle('Bad\x00Title\x1F')).toBe('BadTitle');
  });

  it('strips zero-width characters', () => {
    expect(sanitizeTitle('Invis\u200Bible')).toBe('Invisible');
  });

  it('returns null for empty string', () => {
    expect(sanitizeTitle('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(sanitizeTitle(null)).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(sanitizeTitle(42)).toBeNull();
    expect(sanitizeTitle({})).toBeNull();
  });

  it('returns null when title is >100 chars', () => {
    expect(sanitizeTitle('a'.repeat(101))).toBeNull();
  });

  it('accepts exactly 100 chars', () => {
    const title = 'a'.repeat(100);
    expect(sanitizeTitle(title)).toBe(title);
  });

  it('returns null for whitespace-only string', () => {
    expect(sanitizeTitle('   ')).toBeNull();
  });

  it('returns null when stripping control chars makes it empty', () => {
    expect(sanitizeTitle('\x00\x1F')).toBeNull();
  });
});

// ── redactStreamKey ───────────────────────────────────────────────────────────

describe('redactStreamKey', () => {
  it('redacts the stream key in a /live/<key> path', () => {
    const result = redactStreamKey('/live/my-secret-key');
    expect(result).toBe('/live/***REDACTED***');
    expect(result).not.toContain('my-secret-key');
  });

  it('redacts a UUID key', () => {
    const key = '550e8400-e29b-41d4-a716-446655440000';
    const result = redactStreamKey(`/live/${key}`);
    expect(result).toBe('/live/***REDACTED***');
    expect(result).not.toContain(key);
  });

  it('handles nested paths', () => {
    const result = redactStreamKey('/app/sub/key123');
    expect(result).toBe('/app/sub/***REDACTED***');
  });

  it('handles a path with just one segment', () => {
    const result = redactStreamKey('/justkey');
    expect(result).toBe('/***REDACTED***');
  });
});

// ── safeArgs ──────────────────────────────────────────────────────────────────

describe('safeArgs', () => {
  it('strips tcUrl from args', () => {
    const args = {
      app: 'live',
      flashVer: 'FMLE/3.0',
      tcUrl: 'rtmp://server/live/secretkey123',
      swfUrl: 'http://example.com/app.swf',
      pageUrl: 'http://example.com/',
      objectEncoding: 0
    };
    const safe = safeArgs(args);
    expect(safe).not.toHaveProperty('tcUrl');
    expect(safe).not.toHaveProperty('swfUrl');
    expect(safe).not.toHaveProperty('pageUrl');
  });

  it('preserves safe fields', () => {
    const args = { app: 'live', flashVer: 'FMLE/3.0', objectEncoding: 0, type: 'live' };
    const safe = safeArgs(args);
    expect(safe.app).toBe('live');
    expect(safe.flashVer).toBe('FMLE/3.0');
    expect(safe.objectEncoding).toBe(0);
    expect(safe.type).toBe('live');
  });

  it('returns empty object for null', () => {
    expect(safeArgs(null)).toEqual({});
  });

  it('returns empty object for non-object', () => {
    expect(safeArgs('string')).toEqual({});
    expect(safeArgs(42)).toEqual({});
  });

  it('handles args with no safe fields gracefully', () => {
    const safe = safeArgs({ tcUrl: 'rtmp://server/live/key' });
    expect(safe).toEqual({ app: undefined, flashVer: undefined, objectEncoding: undefined, type: undefined });
  });
});
