import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { UAParser } from 'ua-parser-js';
import DeviceDetector from 'device-detector-js';
import slowDown from 'express-slow-down';
import ExpressBrute from 'express-brute';
import { CONFIG } from '../config';

// Advanced encryption key derivation
const ENCRYPTION_KEY = crypto.pbkdf2Sync(
  CONFIG.SECURITY.JWT_SECRET,
  'anonn-salt-2025',
  10000,
  32,
  'sha512'
);

// Device fingerprinting store
const deviceFingerprints = new Map<string, {
  fingerprint: string;
  lastSeen: Date;
  trustScore: number;
  violations: number;
}>();

// Session security store
const secureSessions = new Map<string, {
  sessionId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  trustScore: number;
}>();

// Anti-bot detection patterns (excluding 'phantom' to allow Phantom wallet)
const BOT_PATTERNS = [
  /bot|crawler|spider|crawling/i,
  /slurp|facebook|twitter|linkedin/i,
  /postman|insomnia|curl|wget/i,
  /automated|headless/i,
];

/**
 * Advanced payload encryption middleware
 */
export const encryptPayload = (req: Request, res: Response, next: NextFunction) => {
  // Only encrypt sensitive endpoints (EXCLUDING /api/auth for wallet authentication)
  const sensitiveEndpoints = [
    '/api/users',
    '/api/organizations',
    '/api/payments',
    '/api/admin'
  ];

  const shouldEncrypt = sensitiveEndpoints.some(endpoint =>
    req.path.startsWith(endpoint)
  );

  if (!shouldEncrypt) {
    return next();
  }

  // Encrypt request body if present
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(req.body),
        ENCRYPTION_KEY.toString('hex')
      ).toString();
      
      req.body = { encrypted: true, data: encrypted };
    } catch (error) {
      console.error('Payload encryption failed:', error);
    }
  }

  // Intercept response to encrypt sensitive data
  const originalSend = res.send;
  res.send = function(data: any) {
    try {
      if (typeof data === 'object' && data !== null) {
        // Encrypt sensitive fields
        const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'token'];
        const encrypted = encryptSensitiveFields(data, sensitiveFields);
        return originalSend.call(this, encrypted);
      }
    } catch (error) {
      console.error('Response encryption failed:', error);
    }
    
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Device fingerprinting and trust scoring
 */
export const deviceFingerprinting = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // Parse user agent for device information
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();
  
  const deviceDetector = new DeviceDetector();
  const deviceInfo = deviceDetector.parse(userAgent);
  
  // Create device fingerprint
  const fingerprintData = {
    ip: hashValue(ip),
    userAgent: hashValue(userAgent),
    acceptLanguage,
    acceptEncoding,
    browser: uaResult.browser.name,
    os: uaResult.os.name,
    device: deviceInfo.device?.type || 'unknown',
    timezone: req.get('X-Timezone-Offset') || '',
    screen: req.get('X-Screen-Resolution') || '',
  };
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintData))
    .digest('hex');

  // Check if device is known
  let deviceData = deviceFingerprints.get(fingerprint);
  const now = new Date();
  
  if (deviceData) {
    // Update existing device
    deviceData.lastSeen = now;
    
    // Increase trust score for returning devices
    if (deviceData.trustScore < 100) {
      deviceData.trustScore += 1;
    }
  } else {
    // New device - start with low trust score
    deviceData = {
      fingerprint,
      lastSeen: now,
      trustScore: 10,
      violations: 0,
    };
    deviceFingerprints.set(fingerprint, deviceData);
  }

  // Add device info to request
  (req as any).deviceInfo = {
    fingerprint,
    trustScore: deviceData.trustScore,
    isNewDevice: deviceData.trustScore < 50,
    deviceType: deviceInfo.device?.type || 'unknown',
    browser: uaResult.browser.name,
    os: uaResult.os.name,
  };

  next();
};

/**
 * Advanced bot detection
 */
export const botDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || '';
  
  // Skip bot detection for legitimate browser requests from same origin
  const referer = req.get('Referer') || '';
  const origin = req.get('Origin') || '';
  const isSameOrigin = referer.includes('localhost') || origin.includes('localhost') || 
                       referer.includes(req.get('Host') || '') || origin.includes(req.get('Host') || '');
  
  // Allow browser requests from same origin
  if (isSameOrigin && userAgent.match(/Mozilla|Chrome|Safari|Firefox|Edge/i)) {
    return next();
  }
  
  // Check for bot patterns (more lenient)
  const strictBotPatterns = [
    /bot|crawler|spider|crawling/i,
    /slurp|facebook|twitter|linkedin/i,
  ];
  
  const isBot = strictBotPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot) {
    return res.status(403).json({ error: 'Automated requests not allowed' });
  }

  // Check for suspicious request patterns (more lenient)
  const requestFingerprint = `${ip}-${req.path}-${req.method}`;
  const requestCount = getRequestCount(requestFingerprint);
  
  // Too many identical requests = likely bot (increased threshold)
  if (requestCount > 200) {
    return res.status(429).json({ error: 'Too many identical requests' });
  }

  // Allow requests without all headers (browsers sometimes don't send all)
  const requiredHeaders = ['accept'];
  const missingRequiredHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingRequiredHeaders.length > 0) {
    // Only block if completely missing basic headers
    incrementViolation(ip);
    return res.status(403).json({ error: 'Invalid request headers' });
  }

  next();
};

/**
 * Session security and hijacking prevention
 */
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.get('X-Session-ID') || '';
  const deviceId = (req as any).deviceInfo?.fingerprint || '';
  const ip = req.ip || '';
  const userAgent = req.get('User-Agent') || '';
  
  if (!sessionId) {
    // Create new session
    const newSessionId = uuidv4();
    const sessionData = {
      sessionId: newSessionId,
      deviceId,
      ipAddress: ip,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      trustScore: (req as any).deviceInfo?.trustScore || 0,
    };
    
    secureSessions.set(newSessionId, sessionData);
    res.setHeader('X-Session-ID', newSessionId);
    (req as any).sessionData = sessionData;
    
    return next();
  }

  // Validate existing session
  const sessionData = secureSessions.get(sessionId);
  
  if (!sessionData) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check for session hijacking
  if (sessionData.deviceId !== deviceId) {
    console.warn(`Session hijacking attempt: ${sessionId} from ${ip}`);
    secureSessions.delete(sessionId);
    return res.status(401).json({ error: 'Session security violation' });
  }

  // Check for IP changes (allow some flexibility for mobile users)
  if (sessionData.ipAddress !== ip) {
    const ipDistance = calculateIpDistance(sessionData.ipAddress, ip);
    if (ipDistance > 1000) { // More than 1000km apart
      console.warn(`Suspicious IP change: ${sessionId} from ${sessionData.ipAddress} to ${ip}`);
      sessionData.trustScore -= 20;
    }
  }

  // Update session activity
  sessionData.lastActivity = new Date();
  sessionData.ipAddress = ip; // Update IP for mobile users
  
  // Session timeout (24 hours)
  const sessionAge = Date.now() - sessionData.createdAt.getTime();
  if (sessionAge > 24 * 60 * 60 * 1000) {
    secureSessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }

  (req as any).sessionData = sessionData;
  res.setHeader('X-Session-ID', sessionId);
  
  next();
};

/**
 * Advanced brute force protection
 */
const store = new ExpressBrute.MemoryStore();
export const advancedBruteForce = new ExpressBrute(store, {
  freeRetries: 5,
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 60 * 60 * 1000, // 1 hour
  lifetime: 24 * 60 * 60, // 24 hours
  failCallback: (req: Request, res: Response, next: NextFunction, nextValidRequestDate: Date) => {
    res.status(429).json({
      error: 'Too many failed attempts',
      nextValidRequestDate,
    });
  },
  handleStoreError: (error: Error) => {
    console.error('Brute force store error:', error);
  },
});

/**
 * Progressive speed limiting
 */
export const progressiveSpeedLimit = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay after delayAfter is reached
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  skip: (req: Request) => {
    // Skip for trusted devices
    return (req as any).deviceInfo?.trustScore > 80;
  },
});

/**
 * Content Security Policy v3 with nonce
 */
export const advancedCSP = (req: Request, res: Response, next: NextFunction) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.dynamic.xyz https://app.dynamicauth.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss: ws:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' https://app.dynamicauth.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "require-trusted-types-for 'script'",
    "trusted-types default",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  next();
};

/**
 * Anti-debugging and tamper detection
 */
export const antiTampering = (req: Request, res: Response, next: NextFunction) => {
  // Add anti-debugging script to HTML responses
  const originalSend = res.send;
  res.send = function(data: any) {
    if (res.getHeader('Content-Type')?.toString().includes('text/html')) {
      const antiDebugScript = `
        <script nonce="${res.locals.nonce}">
          // Anti-debugging protection
          (function() {
            let devtools = {open: false, orientation: null};
            let threshold = 160;
            
            setInterval(function() {
              if (window.outerHeight - window.innerHeight > threshold || 
                  window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                  devtools.open = true;
                  console.clear();
                  document.body.innerHTML = '<h1>Developer tools detected. Access denied.</h1>';
                  window.location.href = '/';
                }
              } else {
                devtools.open = false;
              }
            }, 500);

            // Disable right-click
            document.addEventListener('contextmenu', e => e.preventDefault());
            
            // Disable F12, Ctrl+Shift+I, etc.
            document.addEventListener('keydown', function(e) {
              if (e.key === 'F12' || 
                  (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                  (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                  (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
              }
            });

            // Detect console usage
            let devtools_detect = new Image();
            Object.defineProperty(devtools_detect, 'id', {
              get: function() {
                console.clear();
                document.body.innerHTML = '<h1>Console usage detected. Access denied.</h1>';
                window.location.href = '/';
              }
            });
            console.log(devtools_detect);
          })();
        </script>
      `;
      
      if (typeof data === 'string' && data.includes('</head>')) {
        data = data.replace('</head>', antiDebugScript + '</head>');
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Helper functions
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
}

function encryptSensitiveFields(obj: any, sensitiveFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (sensitiveFields.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
        (result as any)[key] = CryptoJS.AES.encrypt(
          obj[key],
          ENCRYPTION_KEY.toString('hex')
        ).toString();
      } else if (typeof obj[key] === 'object') {
        (result as any)[key] = encryptSensitiveFields(obj[key], sensitiveFields);
      } else {
        (result as any)[key] = obj[key];
      }
    }
  }
  
  return result;
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRequestCount(fingerprint: string): number {
  const now = Date.now();
  const data = requestCounts.get(fingerprint);
  
  if (!data || data.resetTime < now) {
    requestCounts.set(fingerprint, { count: 1, resetTime: now + 60000 });
    return 1;
  }
  
  data.count++;
  return data.count;
}

const violations = new Map<string, { count: number; resetTime: number }>();

function incrementViolation(ip: string): void {
  const now = Date.now();
  const data = violations.get(ip);
  
  if (!data || data.resetTime < now) {
    violations.set(ip, { count: 1, resetTime: now + 3600000 }); // 1 hour
  } else {
    data.count++;
  }
}

function calculateIpDistance(ip1: string, ip2: string): number {
  // Simplified IP distance calculation
  // In production, use a proper geolocation service
  const parts1 = ip1.split('.').map(Number);
  const parts2 = ip2.split('.').map(Number);
  
  let distance = 0;
  for (let i = 0; i < 4; i++) {
    distance += Math.abs(parts1[i] - parts2[i]) * Math.pow(256, 3 - i);
  }
  
  return distance / 1000; // Rough approximation to km
}
