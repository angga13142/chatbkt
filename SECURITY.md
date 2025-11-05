# Security Policy

## 🔒 Security Overview

This document outlines the security considerations, known vulnerabilities, and best practices for the WhatsApp Shopping Chatbot.

**Last Updated:** November 5, 2025  
**Security Review Date:** November 5, 2025

---

## 🎯 Security Status

### Current Security Score: **B (75/100)**

| Category | Status | Priority |
|----------|--------|----------|
| Secrets Management | ✅ Secure | - |
| Input Validation | ⚠️ Partial | HIGH |
| Authentication | ✅ Implemented | - |
| Rate Limiting | ✅ Active | - |
| Dependencies | ⚠️ 5 Known Issues | HIGH |
| Logging | ⚠️ Needs Improvement | MEDIUM |

---

## 🚨 Known Vulnerabilities

### 1. NPM Dependencies (HIGH PRIORITY)

**Status:** KNOWN - Under Monitoring  
**Risk Level:** MEDIUM  
**Affected Version:** All current versions

#### Details:

**Package: tar-fs (2.0.0 - 2.1.3)**
- **CVE:** GHSA-vj76-c3g6-qr5v, GHSA-8cj5-5rvv-wf4v, GHSA-pq67-2wwv-3xjx
- **Severity:** HIGH
- **Description:** 
  - Symlink validation bypass with predictable destination
  - Can extract outside specified directory
  - Path traversal vulnerability
- **Exploitability:** LOW in this context
- **Reason:** Application does not handle file uploads or tar extraction from user input

**Package: ws (8.0.0 - 8.17.0)**
- **CVE:** GHSA-3h5v-q93c-6h6q
- **Severity:** HIGH
- **Description:** DoS vulnerability when handling requests with many HTTP headers
- **Exploitability:** VERY LOW in this context
- **Reason:** WebSocket connections are internal only (WhatsApp Web client)

#### Mitigation:

**Current Mitigations:**
- ✅ No user file upload functionality
- ✅ No tar/zip extraction from user input
- ✅ WebSocket connections are internal only
- ✅ Bot runs in controlled environment

**Planned Actions:**
1. **Monitor Dependencies:** Set up automated security scanning
2. **Wait for Upstream Fix:** Track whatsapp-web.js for security updates
3. **Consider Overrides:** If critical, override vulnerable packages

```json
// package.json (if urgent)
"overrides": {
  "tar-fs": "^3.0.4",
  "ws": "^8.18.0"
}
```

**Update Command:**
```bash
# Review changes before applying
npm audit
npm audit fix --force
```

**Timeline:** Monitor monthly, update when stable fixes available

---

## ✅ Security Best Practices Implemented

### 1. Secrets Management ✅

**Status:** SECURE

- ✅ All secrets in environment variables
- ✅ `.env` file in .gitignore
- ✅ `.env.example` for documentation
- ✅ No hardcoded credentials in code
- ✅ Validation on startup

**Environment Variables:**
```bash
# Required
ADMIN_NUMBER=628xxx          # Admin WhatsApp number
XENDIT_API_KEY=xnd_xxx       # Payment gateway API key
REDIS_URL=redis://localhost  # Redis connection string

# Optional
GOOGLE_API_KEY=xxx           # AI features (optional)
WEBHOOK_SECRET=xxx           # Webhook security (recommended)
```

### 2. Authentication ✅

**Status:** IMPLEMENTED

- ✅ Admin commands require phone number verification
- ✅ Admin numbers stored in environment variables
- ✅ No hardcoded admin numbers in code

**Implementation:**
```javascript
// Verified in AdminHandler
static isAdmin(customerId) {
  const adminNumbers = [
    process.env.ADMIN_NUMBER_1,
    process.env.ADMIN_NUMBER_2
  ].filter(Boolean);
  
  return adminNumbers.some(num => customerId.includes(num));
}
```

### 3. Rate Limiting ✅

**Status:** ACTIVE - Prevents Spam & WhatsApp Bans

- ✅ 20 messages per minute per customer
- ✅ Auto-resets every 60 seconds
- ✅ Prevents DoS attacks
- ✅ Protects from WhatsApp rate limits

**Configuration:**
```javascript
// sessionManager.js
const RATE_LIMIT = 20; // messages per minute
const RATE_WINDOW = 60000; // 1 minute
```

### 4. Session Security ✅

**Status:** SECURE

- ✅ Redis-backed session storage
- ✅ Auto-expiration after 30 minutes inactivity
- ✅ Session cleanup every 10 minutes
- ✅ No sensitive data in sessions

---

## ⚠️ Security Improvements Needed

### 1. Input Validation (HIGH PRIORITY)

**Current State:** PARTIAL - Basic validation exists  
**Risk:** XSS, injection attacks, DoS  
**Priority:** HIGH

#### Recommended Implementation:

Create `src/utils/InputSanitizer.js`:

```javascript
class InputSanitizer {
  /**
   * Sanitize user message input
   */
  static sanitizeMessage(message) {
    if (typeof message !== 'string') return '';
    
    // Remove null bytes
    let sanitized = message.replace(/\0/g, '');
    
    // Remove potential XSS patterns
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    // Limit length (prevent DoS)
    return sanitized.substring(0, 1000).trim();
  }
  
  /**
   * Validate and sanitize numeric input
   */
  static validateNumeric(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return null;
    if (num < min || num > max) return null;
    return num;
  }
  
  /**
   * Sanitize product ID
   */
  static sanitizeProductId(productId) {
    if (typeof productId !== 'string') return null;
    
    // Allow only alphanumeric, dash, underscore
    const sanitized = productId.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    // Limit length
    return sanitized.substring(0, 50);
  }
  
  /**
   * Sanitize phone number
   */
  static sanitizePhoneNumber(phone) {
    if (typeof phone !== 'string') return null;
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Validate length (international format)
    if (digits.length < 10 || digits.length > 15) return null;
    
    return digits;
  }
}

module.exports = InputSanitizer;
```

#### Integration Points:

1. **MessageRouter.js** - Sanitize all incoming messages
2. **AdminHandler.js** - Validate admin command parameters
3. **CustomerHandler.js** - Validate product selections and quantities

#### Usage Example:

```javascript
// In MessageRouter.js
const InputSanitizer = require('../utils/InputSanitizer');

async route(customerId, rawMessage) {
  // Sanitize input first
  const message = InputSanitizer.sanitizeMessage(rawMessage);
  
  // Continue with routing...
}
```

### 2. Structured Logging (MEDIUM PRIORITY)

**Current State:** Uses console.log (137 occurrences)  
**Risk:** Sensitive data exposure, poor debugging  
**Priority:** MEDIUM

#### Recommended Implementation:

Create `lib/SecureLogger.js`:

```javascript
class SecureLogger {
  constructor(context) {
    this.context = context;
  }
  
  /**
   * Sanitize log data - remove sensitive information
   */
  static sanitize(data) {
    const sensitiveKeys = [
      'password', 'apiKey', 'secret', 'token', 
      'authorization', 'api_key', 'phone'
    ];
    
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  info(message, meta = {}) {
    const logEntry = {
      level: 'info',
      context: this.context,
      message,
      ...SecureLogger.sanitize(meta),
      timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  error(message, error, meta = {}) {
    const logEntry = {
      level: 'error',
      context: this.context,
      message,
      error: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      ...SecureLogger.sanitize(meta),
      timestamp: new Date().toISOString()
    };
    
    console.error(JSON.stringify(logEntry));
  }
  
  warn(message, meta = {}) {
    const logEntry = {
      level: 'warn',
      context: this.context,
      message,
      ...SecureLogger.sanitize(meta),
      timestamp: new Date().toISOString()
    };
    
    console.warn(JSON.stringify(logEntry));
  }
}

module.exports = SecureLogger;
```

### 3. Webhook Security (MEDIUM PRIORITY)

**Current State:** Webhook endpoint exists but needs verification  
**Risk:** Unauthorized payment confirmations  
**Priority:** MEDIUM

#### Recommended Implementation:

```javascript
// services/webhookServer.js - Add signature verification

const crypto = require('crypto');

function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('WEBHOOK_SECRET not configured');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook handler
app.post('/webhook/xendit', (req, res) => {
  const signature = req.headers['x-callback-token'];
  
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
});
```

---

## 🛡️ Security Checklist for Developers

Before deploying or merging code:

### Input Handling
- [ ] All user inputs are sanitized
- [ ] Numeric inputs are validated with min/max bounds
- [ ] String inputs have length limits
- [ ] No eval() or Function() with user input
- [ ] No command injection vulnerabilities

### Authentication & Authorization
- [ ] Admin commands check authorization
- [ ] No hardcoded credentials
- [ ] All secrets in environment variables
- [ ] Session tokens are secure and expire

### Data Protection
- [ ] No sensitive data in logs
- [ ] No sensitive data in error messages
- [ ] Sessions contain minimal data
- [ ] No PII stored unnecessarily

### Dependencies
- [ ] Run `npm audit` before deployment
- [ ] Review security advisories
- [ ] Keep dependencies up to date
- [ ] Remove unused dependencies

### Error Handling
- [ ] Errors don't leak internal details
- [ ] All errors are logged
- [ ] User-facing errors are generic
- [ ] Stack traces hidden in production

### Rate Limiting
- [ ] All endpoints have rate limits
- [ ] Rate limits prevent abuse
- [ ] Rate limits prevent WhatsApp bans

---

## 📞 Reporting Security Issues

### How to Report

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead:
1. Email: [REDACTED - Add security email]
2. Use GitHub Security Advisories (private)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours:** Acknowledgment
- **72 hours:** Initial assessment
- **7 days:** Fix or mitigation plan
- **30 days:** Public disclosure (after fix)

---

## 🔄 Security Update Schedule

### Weekly
- [ ] Review npm audit output
- [ ] Check for new CVEs in dependencies
- [ ] Review access logs for anomalies

### Monthly
- [ ] Full security audit
- [ ] Update dependencies
- [ ] Review and update this document
- [ ] Test incident response procedures

### Quarterly
- [ ] Penetration testing (if applicable)
- [ ] Security training for team
- [ ] Review and update security policies

---

## 📚 Security Resources

### Tools
- **npm audit** - Dependency vulnerability scanning
- **Snyk** - Continuous security monitoring
- **ESLint Security Plugin** - Code security linting
- **SonarQube** - Code quality and security analysis

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

## 📝 Security Incident Response Plan

### Phase 1: Detection (0-1 hour)
1. Identify the security incident
2. Assess immediate impact
3. Activate incident response team

### Phase 2: Containment (1-4 hours)
1. Isolate affected systems
2. Prevent further damage
3. Preserve evidence

### Phase 3: Investigation (4-24 hours)
1. Determine root cause
2. Identify scope of breach
3. Document timeline

### Phase 4: Remediation (24-72 hours)
1. Apply security patches
2. Remove vulnerabilities
3. Test fixes thoroughly

### Phase 5: Recovery (72+ hours)
1. Restore normal operations
2. Monitor for recurrence
3. Update security measures

### Phase 6: Post-Incident (1-2 weeks)
1. Conduct post-mortem
2. Update security policies
3. Implement preventive measures
4. Team training

---

## ✅ Security Compliance

### Current Compliance Status

**Data Protection:**
- ✅ No PII stored without consent
- ✅ Session data auto-expires
- ✅ No credit card data stored
- ⚠️ Need privacy policy (if required by jurisdiction)

**Payment Security:**
- ✅ PCI-DSS not required (no card processing)
- ✅ Using certified payment gateway (Xendit)
- ✅ No sensitive payment data stored

**WhatsApp Policies:**
- ✅ No spam messages
- ✅ Rate limiting prevents abuse
- ✅ Respects user opt-out

---

**Document Version:** 1.0.0  
**Last Review:** November 5, 2025  
**Next Review:** December 5, 2025  
**Maintained By:** Development Team

