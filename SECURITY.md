# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented across the Anonn platform to protect against common web vulnerabilities including XSS, SSRF, injection attacks, and other security threats.

## 🛡️ Security Features Implemented

### 1. Response Headers & CSP
**Location**: `server/middleware/security.ts` - `securityHeaders`

- **Content Security Policy (CSP)**: Strict CSP with whitelisted domains
- **HSTS**: Strict Transport Security with preload
- **X-Frame-Options**: DENY to prevent clickjacking
- **X-Content-Type-Options**: nosniff to prevent MIME sniffing
- **X-XSS-Protection**: Browser XSS filtering enabled
- **Referrer Policy**: Strict origin when cross-origin
- **Permissions Policy**: Disables unnecessary browser APIs
- **X-DNS-Prefetch-Control**: Disabled for privacy

### 2. XSS Protection
**Locations**: 
- Server: `server/middleware/security.ts` - `sanitizeInputs`
- Client: `client/src/lib/security.ts`, `client/src/components/MarkdownRenderer.tsx`

- **Input Sanitization**: All text inputs sanitized with DOMPurify
- **HTML Rendering**: Safe HTML rendering with strict allowlist
- **Pattern Detection**: Dangerous patterns blocked (script tags, event handlers)
- **Content Validation**: Client and server-side validation

### 3. SSRF Protection
**Location**: `server/middleware/security.ts` - `validateUrlInputs`

- **URL Validation**: Only HTTP/HTTPS protocols allowed
- **Private IP Blocking**: Prevents access to internal networks
- **Protocol Filtering**: Blocks dangerous protocols (file://, ftp://, etc.)
- **Domain Whitelisting**: Configurable allowed domains

### 4. Rate Limiting
**Locations**: 
- Server: `server/middleware/security.ts` - `createRateLimit`
- Client: `client/src/lib/security.ts` - `ClientRateLimit`

- **Tiered Limits**: Different limits for read/write operations
- **User-based Tracking**: Per-user and per-IP rate limiting
- **Exponential Backoff**: Escalating penalties for repeat violators
- **Proper Headers**: Standard rate limit headers included

### 5. Input Validation & Sanitization
**Location**: `server/middleware/security.ts` - Various middleware

- **Schema Validation**: Zod schemas for all API inputs
- **Length Limits**: Appropriate length limits for all fields
- **Character Filtering**: Dangerous characters removed
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **NoSQL Injection Prevention**: Input sanitization

### 6. Authentication Security
**Location**: `server/simpleAuth.ts`, `server/config.ts`

- **JWT Validation**: Proper JWT signature verification
- **Token Expiration**: Time-limited access tokens
- **Secure Headers**: Authentication tokens in secure headers
- **Environment Validation**: Required secrets in production

### 7. Error Handling
**Location**: `server/index.ts` - Error middleware

- **Information Disclosure Prevention**: Generic error messages in production
- **Detailed Logging**: Full error details logged server-side only
- **Sensitive Data Redaction**: Passwords/tokens redacted from errors
- **Status Code Normalization**: Appropriate HTTP status codes

### 8. Database Security
**Location**: `server/db.ts`, Query implementations

- **Parameterized Queries**: All queries use Drizzle ORM parameterization
- **Connection Security**: SSL required for database connections
- **Access Control**: Role-based access to database operations
- **Query Logging**: Development-only query logging

## 🔒 Security Headers in Response

The following security headers are automatically added to all responses:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [detailed policy]
Permissions-Policy: [restrictive policy]
```

## 🚫 Blocked Vulnerabilities

### XSS (Cross-Site Scripting)
- ✅ Input sanitization on all text fields
- ✅ HTML content filtering with DOMPurify
- ✅ CSP prevents inline scripts and eval
- ✅ Output encoding for dynamic content

### SSRF (Server-Side Request Forgery)
- ✅ URL validation blocks private IPs
- ✅ Protocol whitelisting (HTTP/HTTPS only)
- ✅ Domain validation for external requests

### SQL Injection
- ✅ Parameterized queries via Drizzle ORM
- ✅ Input validation and sanitization
- ✅ No dynamic SQL construction

### CSRF (Cross-Site Request Forgery)
- ✅ SameSite cookie settings
- ✅ Origin header validation
- ✅ CORS properly configured

### Clickjacking
- ✅ X-Frame-Options: DENY
- ✅ CSP frame-ancestors directive

### Information Disclosure
- ✅ Generic error messages in production
- ✅ Sensitive headers removed
- ✅ Stack traces hidden in production

## 🔧 Rate Limiting Configuration

### API Endpoints
- **General API**: 300 requests per 15 minutes
- **Write Operations**: 100 requests per 15 minutes
- **Auth Operations**: 50 requests per 15 minutes

### Escalation Policy
- First violation: Standard rate limit
- Repeat violations: Exponential backoff (up to 10x penalty)

## 🛠️ Development vs Production

### Development Mode
- Full error messages displayed
- Query logging enabled
- Relaxed CSP for hot reloading
- Development secrets allowed

### Production Mode
- Generic error messages only
- No query logging
- Strict CSP enforcement
- Required environment validation

## 📝 Security Checklist

### Server Security
- [x] HTTPS enforced with HSTS
- [x] Secure headers implemented
- [x] Input validation on all endpoints
- [x] Rate limiting configured
- [x] Error handling sanitized
- [x] Authentication properly implemented
- [x] Database queries parameterized
- [x] File upload restrictions

### Client Security
- [x] XSS protection in place
- [x] Content sanitization implemented
- [x] Secure URL validation
- [x] Client-side rate limiting
- [x] Secure storage practices
- [x] HTTPS-only cookies

### Infrastructure Security
- [x] Environment variables secured
- [x] Secrets management implemented
- [x] Database SSL connections
- [x] Proper CORS configuration
- [x] Security headers automated

## 🚨 Security Incident Response

If a security vulnerability is discovered:

1. **Immediate Actions**
   - Document the vulnerability
   - Assess the impact and scope
   - Implement temporary mitigations

2. **Resolution**
   - Develop and test a fix
   - Deploy the fix with monitoring
   - Validate the fix effectiveness

3. **Post-Incident**
   - Review and update security measures
   - Update documentation
   - Consider additional protections

## 📖 Security Testing

### Automated Testing
- Input validation tests
- XSS payload testing
- SSRF attempt detection
- Rate limiting verification

### Manual Testing
- Penetration testing checklist
- Code review guidelines
- Security audit procedures

## 🔄 Continuous Security

### Regular Updates
- Dependencies updated monthly
- Security headers reviewed quarterly
- Rate limits adjusted based on usage
- CSP policies updated as needed

### Monitoring
- Failed authentication attempts
- Rate limiting violations
- Suspicious input patterns
- Error rate monitoring

## 📞 Contact

For security-related issues or questions, please contact the development team immediately.

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready ✅
