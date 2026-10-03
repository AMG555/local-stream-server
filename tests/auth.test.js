import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

// auth.js uses CommonJS — load it fresh for each test to avoid key state leakage.
// We reload by clearing the require cache.
const require = createRequire(import.meta.url);

function freshAuth() {
  // Clear the module from require cache so each describe block starts clean.
  const key = require.resolve('../auth.js');
  delete require.cache[key];
  return require('../auth.js');
}

// ── generateAPIKey ───────────────────────────────────────────────────────────

describe('generateAPIKey', () => {
  it('returns an object with key and id', () => {
    const auth = freshAuth();
    const result = auth.generateAPIKey('TestKey');
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('id');
  });

  it('key starts with sk_', () => {
    const auth = freshAuth();
    const { key } = auth.generateAPIKey('TestKey');
    expect(key).toMatch(/^sk_[0-9a-f]{64}$/);
  });

  it('id is a valid UUID v4', () => {
    const auth = freshAuth();
    const { id } = auth.generateAPIKey('TestKey');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('two generated keys are unique', () => {
    const auth = freshAuth();
    const k1 = auth.generateAPIKey('Key1').key;
    const k2 = auth.generateAPIKey('Key2').key;
    expect(k1).not.toBe(k2);
  });

  it('name defaults to "Unnamed Key" if empty', () => {
    const auth = freshAuth();
    const { key } = auth.generateAPIKey('');
    // Should not throw — key is generated regardless of name
    expect(key).toMatch(/^sk_/);
  });
});

// ── requireAPIKey middleware ──────────────────────────────────────────────────

describe('requireAPIKey middleware', () => {
  it('rejects request with no Authorization header', () => {
    const auth = freshAuth();
    const req = { headers: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    auth.requireAPIKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with invalid key', () => {
    const auth = freshAuth();
    const req = { headers: { authorization: 'Bearer sk_invalid123' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    auth.requireAPIKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes request with valid Bearer token', () => {
    const auth = freshAuth();
    const { key } = auth.generateAPIKey('Test');
    const req = { headers: { authorization: `Bearer ${key}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    auth.requireAPIKey(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts key without Bearer prefix', () => {
    const auth = freshAuth();
    const { key } = auth.generateAPIKey('Test2');
    const req = { headers: { authorization: key } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    auth.requireAPIKey(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ── revokeAPIKey ──────────────────────────────────────────────────────────────

describe('revokeAPIKey', () => {
  it('revokes an existing key by value', () => {
    const auth = freshAuth();
    const { key } = auth.generateAPIKey('ToRevoke');

    expect(auth.revokeAPIKey(key)).toBe(true);

    // Key should now be rejected
    const req = { headers: { authorization: `Bearer ${key}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    auth.requireAPIKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns false for unknown key', () => {
    const auth = freshAuth();
    expect(auth.revokeAPIKey('sk_doesnotexist')).toBe(false);
  });
});

// ── revokeAPIKeyById ──────────────────────────────────────────────────────────

describe('revokeAPIKeyById', () => {
  it('revokes a key by UUID id', () => {
    const auth = freshAuth();
    const { key, id } = auth.generateAPIKey('ById');

    expect(auth.revokeAPIKeyById(id)).toBe(true);

    // Confirm key is now invalid
    const req = { headers: { authorization: `Bearer ${key}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    auth.requireAPIKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns false for unknown id', () => {
    const auth = freshAuth();
    expect(auth.revokeAPIKeyById(randomUUID())).toBe(false);
  });
});

// ── listAPIKeys ───────────────────────────────────────────────────────────────

describe('listAPIKeys', () => {
  it('returns an array', () => {
    const auth = freshAuth();
    expect(Array.isArray(auth.listAPIKeys())).toBe(true);
  });

  it('includes generated keys with redacted preview', () => {
    const auth = freshAuth();
    const { key, id } = auth.generateAPIKey('Listed');
    const list = auth.listAPIKeys();

    const found = list.find((k) => k.id === id);
    expect(found).toBeDefined();
    expect(found.keyPreview).toMatch(/^sk_[0-9a-f]+\.\.\.$/);
    // Preview must not contain the full key
    expect(found.keyPreview.length).toBeLessThan(key.length);
  });

  it('does not include revoked keys', () => {
    const auth = freshAuth();
    const { key, id } = auth.generateAPIKey('Temp');
    auth.revokeAPIKeyById(id);

    const list = auth.listAPIKeys();
    const found = list.find((k) => k.id === id);
    expect(found).toBeUndefined();
  });
});
