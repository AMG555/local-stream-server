'use strict';

/**
 * helpers.js — Pure utility functions shared by server.js.
 * Extracted into their own module so they can be unit-tested in isolation.
 */

/**
 * Returns true if str is a v4 UUID in canonical form.
 */
function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitizes a stream title: strips control/zero-width chars, trims,
 * enforces 1–100 char length. Returns null on failure.
 */
function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') {
    return null;
  }

  const cleaned = title
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '')         // Zero-width
    .trim();

  if (cleaned.length === 0 || cleaned.length > 100) {
    return null;
  }

  return cleaned;
}

/**
 * Replaces the last path segment in a stream path with ***REDACTED***
 * so stream keys never appear in logs.
 */
function redactStreamKey(streamPath) {
  return streamPath.replace(/\/([^/]+)$/, '/***REDACTED***');
}

/**
 * Returns only the safe fields from RTMP connection args (app, flashVer,
 * objectEncoding, type). Strips tcUrl / swfUrl / pageUrl which can contain
 * the stream key.
 */
function safeArgs(args) {
  if (!args || typeof args !== 'object') return {};
  const { app, flashVer, objectEncoding, type } = args;
  return { app, flashVer, objectEncoding, type };
}

module.exports = { isValidUUID, sanitizeTitle, redactStreamKey, safeArgs };
