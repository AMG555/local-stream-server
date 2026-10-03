const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// API keys storage — override with API_KEYS_FILE env var so tests can use a temp file
const API_KEYS_FILE = process.env.API_KEYS_FILE || path.join(__dirname, 'api-keys.json');
// keyed by full key string
const apiKeys = new Map();
// keyed by id (uuid) -> full key string, for revoke-by-id
const keyById = new Map();

/**
 * Load API keys from disk
 */
function loadAPIKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const data = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
      
      if (!Array.isArray(data)) {
        console.error('Invalid api-keys.json format');
        return;
      }
      
      data.forEach(entry => {
        const id = entry.id || crypto.randomUUID();
        const record = {
          id,
          key: entry.key,
          name: entry.name,
          createdAt: entry.createdAt,
          lastUsed: entry.lastUsed || null
        };
        apiKeys.set(entry.key, record);
        keyById.set(id, entry.key);
      });
      
      console.log(`✓ Loaded ${apiKeys.size} API keys`);
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
  }
}

/**
 * Save API keys to disk
 */
function saveAPIKeys() {
  try {
    const data = Array.from(apiKeys.values()).map(entry => ({
      id: entry.id,
      key: entry.key,
      name: entry.name,
      createdAt: entry.createdAt,
      lastUsed: entry.lastUsed
    }));
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving API keys:', error);
  }
}

/**
 * Generate new API key
 * @param {string} name - Human-readable name for the key
 * @returns {string} The generated API key
 */
function generateAPIKey(name) {
  const id = crypto.randomUUID();
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const record = {
    id,
    key,
    name: name || 'Unnamed Key',
    createdAt: Date.now(),
    lastUsed: null
  };
  apiKeys.set(key, record);
  keyById.set(id, key);
  saveAPIKeys();
  return { key, id };
}

/**
 * Revoke API key
 * @param {string} key - The API key to revoke
 * @returns {boolean} True if key was revoked, false if not found
 */
function revokeAPIKey(key) {
  const record = apiKeys.get(key);
  if (!record) return false;
  keyById.delete(record.id);
  apiKeys.delete(key);
  saveAPIKeys();
  return true;
}

/**
 * Revoke API key by its ID (safe — does not require the full secret key)
 * @param {string} id - The UUID id of the key
 * @returns {boolean} True if revoked, false if not found
 */
function revokeAPIKeyById(id) {
  const key = keyById.get(id);
  if (!key) return false;
  return revokeAPIKey(key);
}

/**
 * Validate API key
 * @param {string} key - The API key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateAPIKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const entry = apiKeys.get(key);
  if (!entry) {
    return false;
  }
  
  // Update last used timestamp
  entry.lastUsed = Date.now();
  saveAPIKeys();
  
  return true;
}

/**
 * Express middleware for API key authentication
 */
function requireAPIKey(req, res, next) {
  // Extract API key from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing Authorization header',
      hint: 'Include: Authorization: Bearer YOUR_API_KEY'
    });
  }
  
  // Support "Bearer TOKEN" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const apiKey = match ? match[1] : authHeader;
  
  if (!validateAPIKey(apiKey)) {
    return res.status(403).json({ 
      error: 'Invalid or revoked API key' 
    });
  }
  
  // Key is valid, continue
  next();
}

/**
 * List all API keys (redacted)
 * @returns {Array} Array of API key metadata
 */
function listAPIKeys() {
  return Array.from(apiKeys.values()).map(entry => ({
    id: entry.id,
    name: entry.name,
    keyPreview: entry.key.substring(0, 12) + '...',
    createdAt: entry.createdAt,
    lastUsed: entry.lastUsed
  }));
}

// Initialize
loadAPIKeys();

module.exports = {
  requireAPIKey,
  generateAPIKey,
  revokeAPIKey,
  revokeAPIKeyById,
  listAPIKeys
};
