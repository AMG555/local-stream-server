# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x: (EOL)          |

## Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Local Stream Server, please report it responsibly:

### 📧 Contact

Send details to: **[Create a GitHub Security Advisory](https://github.com/AMG555/local-stream-server/security/advisories/new)**

Or email the maintainer directly (check GitHub profile for contact).

### 📝 What to Include

Please include the following information:

- **Type of vulnerability** (e.g., RTMP injection, XSS, authentication bypass)
- **Full paths** of affected source files
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept** or exploit code (if possible)
- **Impact assessment** - what an attacker could achieve
- **Suggested fix** (if you have one)

### ⏱️ Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next release cycle

### 🏆 Recognition

We appreciate security researchers who responsibly disclose vulnerabilities:

- Credit in CHANGELOG and release notes
- Listed in SECURITY.md Hall of Fame (if desired)
- Priority support for future questions

---

## Security Considerations

### 🔒 Default Security Posture

**This software is designed for LOCAL TESTING only.** Default configuration:

✅ **Safe for local testing:**
- Binds to all interfaces (0.0.0.0) for local network access
- No authentication by default (assumes trusted network)
- Stream keys provide basic access control

**Hardening included (v1.2+):**
- ✅ API key authentication on all `/api/*` routes
- ✅ Rate limiting on all API routes (120 req/min, stricter on creates/downloads)
- ✅ Input sanitization and UUID-only stream keys
- ✅ CSP + security headers on all responses
- ✅ Body size cap (64 KB) against large-payload DoS

**Still limited (by design — local/tunnel use):**
- ⚠️ No DDoS protection beyond rate limiting
- ⚠️ RTMP transport is unencrypted (use Cloudflare Tunnel or RTMPS proxy)
- ⚠️ No per-user viewer access control

### 🌐 Public Deployment Risks

**If exposing to the internet via Cloudflare Tunnel:**

1. **Authentication**: Consider adding reverse proxy auth (Cloudflare Access, Nginx Basic Auth)
2. **Rate limiting**: Implement connection limits
3. **Stream key rotation**: Change keys regularly
4. **Monitoring**: Watch for suspicious activity
5. **Firewall**: Restrict RTMP port (1935) to trusted IPs only

### 🔐 Recommended Hardening

**For production or semi-public use:**

```javascript
// server.js - Add authentication middleware
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

**Use HTTPS reverse proxy:**
```bash
# Example with nginx
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://localhost:8000;
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
  }
}
```

### 🚨 Known Limitations

**Not vulnerabilities, but important to know:**

1. **No stream transport encryption**: RTMP is unencrypted (use Cloudflare Tunnel or RTMPS proxy for public deployments)
2. **No viewer authentication**: Anyone on the LAN with the HLS URL can watch (stream key is only a publisher credential)
3. **No resource limits on stream count**: Large numbers of concurrent streams may exhaust file descriptors
4. **FFmpeg vulnerabilities**: Depends on the version installed on the host system — keep FFmpeg updated

### 📊 Dependency Security

We use Dependabot for automated dependency updates. Check:

```bash
npm audit
```

To fix vulnerabilities:

```bash
npm audit fix
```

For breaking changes:

```bash
npm audit fix --force
```

### 🛡️ Security Best Practices

**For users deploying this server:**

1. ✅ **Run on isolated network** (VLAN, separate WiFi)
2. ✅ **Update dependencies** regularly (`npm update`)
3. ✅ **Use strong stream keys** (default UUIDs are good)
4. ✅ **Monitor logs** for unusual activity
5. ✅ **Backup stream-keys.json** securely
6. ✅ **Use environment variables** for sensitive config
7. ✅ **Limit RTMP port exposure** (firewall rules)
8. ✅ **Rotate stream keys** after public events

**For developers contributing:**

1. ✅ Never commit secrets or API keys
2. ✅ Sanitize user input in web interface
3. ✅ Validate stream paths and keys
4. ✅ Use parameterized queries (if adding database)
5. ✅ Follow principle of least privilege
6. ✅ Test with security scanners (npm audit, Snyk)

---

## Vulnerability Disclosure Policy

This project follows **Coordinated Vulnerability Disclosure**:

1. Security researcher reports vulnerability privately
2. Maintainer confirms and develops fix
3. Fix is released in new version
4. Public disclosure after users have time to update (typically 30 days)
5. Credit given to reporter (if desired)

---

## Security Hall of Fame

Contributors who responsibly disclosed vulnerabilities:

<!-- 
Format:
- **[Reporter Name](GitHub/Website)** - [Vulnerability Type] - [Date]
-->

*No security reports yet. Be the first!*

---

## Questions?

For security-related questions that are NOT vulnerabilities:

- Open a [GitHub Discussion](https://github.com/AMG555/local-stream-server/discussions)
- Check existing [Issues](https://github.com/AMG555/local-stream-server/issues)

**Thank you for helping keep Local Stream Server secure!** 🔒
