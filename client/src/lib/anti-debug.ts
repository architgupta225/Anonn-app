/**
 * Advanced anti-debugging and tamper detection for client-side protection
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Anti-debugging state
let debuggingDetected = false;
let consoleWarningShown = false;

/**
 * Initialize anti-debugging protection
 */
export async function initializeAntiDebug(): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('Anti-debug protection disabled in development mode');
    return;
  }

  // Initialize all protection mechanisms
  await Promise.all([
    setupDevToolsDetection(),
    setupConsoleProtection(),
    setupNetworkMonitoring(),
    setupDOMProtection(),
    setupTimingAttackPrevention(),
    setupIntegrityChecking(),
  ]);

  console.log('Security protection initialized');
}

/**
 * Developer tools detection
 */
async function setupDevToolsDetection(): Promise<void> {
  let devtools = { open: false, orientation: null };
  const threshold = 160;

  // Method 1: Window size detection
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        handleSecurityViolation('DevTools detected via window size');
      }
    } else {
      devtools.open = false;
    }
  }, 1000);

  // Method 2: Performance timing detection
  setInterval(() => {
    const start = performance.now();
    debugger; // This will pause if devtools is open
    const end = performance.now();
    
    if (end - start > 100) { // Took too long = debugger was hit
      handleSecurityViolation('DevTools detected via debugger timing');
    }
  }, 2000);

  // Method 3: Console detection
  let devtools_detect = new Image();
  Object.defineProperty(devtools_detect, 'id', {
    get: function() {
      handleSecurityViolation('DevTools detected via console access');
    }
  });

  // Trigger the detection
  setTimeout(() => {
    try {
      console.log('%c', devtools_detect);
    } catch (e) {
      // Ignore errors
    }
  }, 1000);
}

/**
 * Console protection and monitoring
 */
async function setupConsoleProtection(): Promise<void> {
  // Disable console methods in production
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  // Override console methods
  Object.keys(originalMethods).forEach(method => {
    (console as any)[method] = function(...args: any[]) {
      if (!consoleWarningShown) {
        consoleWarningShown = true;
        handleSecurityViolation('Console usage detected');
      }
      
      // Allow errors in development
      if (process.env.NODE_ENV === 'development') {
        (originalMethods as any)[method].apply(console, args);
      }
    };
  });

  // Monitor console clearing
  const originalClear = console.clear;
  console.clear = function() {
    handleSecurityViolation('Console clear detected');
    return originalClear.apply(console);
  };
}

/**
 * Network request monitoring
 */
async function setupNetworkMonitoring(): Promise<void> {
  // Monitor fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args: any[]) {
    const url = args[0];
    
    // Check for suspicious requests
    if (typeof url === 'string') {
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        if (!url.includes(window.location.origin)) {
          handleSecurityViolation(`Suspicious fetch to: ${url}`);
        }
      }
    }
    
    return originalFetch.apply(this, args);
  };

  // Monitor XMLHttpRequest
  const originalXHR = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args: any[]) {
    const url = args[1];
    
    if (typeof url === 'string') {
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        if (!url.includes(window.location.origin)) {
          handleSecurityViolation(`Suspicious XHR to: ${url}`);
        }
      }
    }
    
    return originalXHR.apply(this, args);
  };
}

/**
 * DOM protection and mutation monitoring
 */
async function setupDOMProtection(): Promise<void> {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleSecurityViolation('Right-click attempted');
  });

  // Disable common debugging shortcuts
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.key === 'U') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C')
    ) {
      e.preventDefault();
      handleSecurityViolation(`Debugging shortcut attempted: ${e.key}`);
    }
  });

  // Monitor DOM mutations for suspicious changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check for suspicious script injections
            if (element.tagName === 'SCRIPT') {
              const src = element.getAttribute('src');
              if (src && !src.startsWith(window.location.origin)) {
                handleSecurityViolation(`Suspicious script injection: ${src}`);
              }
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Timing attack prevention
 */
async function setupTimingAttackPrevention(): Promise<void> {
  // Add random delays to sensitive operations
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;

  window.setTimeout = function(callback: Function, delay: number, ...args: any[]) {
    const randomDelay = delay + Math.random() * 10; // Add 0-10ms random delay
    return originalSetTimeout(callback, randomDelay, ...args);
  };

  window.setInterval = function(callback: Function, delay: number, ...args: any[]) {
    const randomDelay = delay + Math.random() * 10;
    return originalSetInterval(callback, randomDelay, ...args);
  };
}

/**
 * Code integrity checking
 */
async function setupIntegrityChecking(): Promise<void> {
  // Check if critical functions have been tampered with
  const criticalFunctions = [
    'fetch',
    'XMLHttpRequest',
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
  ];

  const originalFunctions = new Map();
  
  criticalFunctions.forEach(funcName => {
    const func = (window as any)[funcName];
    if (func) {
      originalFunctions.set(funcName, func.toString());
    }
  });

  // Periodically check for tampering
  setInterval(() => {
    criticalFunctions.forEach(funcName => {
      const currentFunc = (window as any)[funcName];
      if (currentFunc) {
        const currentCode = currentFunc.toString();
        const originalCode = originalFunctions.get(funcName);
        
        if (originalCode && currentCode !== originalCode) {
          handleSecurityViolation(`Function tampering detected: ${funcName}`);
        }
      }
    });
  }, 5000);
}

/**
 * Generate device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    
    // Add additional entropy
    const additionalData = {
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      deviceMemory: (navigator as any).deviceMemory,
      webGL: getWebGLInfo(),
      canvas: getCanvasFingerprint(),
    };

    const combined = result.visitorId + JSON.stringify(additionalData);
    
    // Hash the combined fingerprint
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Fingerprinting failed:', error);
    return 'fallback-' + Math.random().toString(36).substring(2);
  }
}

/**
 * Get WebGL fingerprint
 */
function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}~${renderer}`;
  } catch (error) {
    return 'webgl-error';
  }
}

/**
 * Get canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    // Draw unique pattern
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint 🔒', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillRect(100, 5, 80, 20);
    
    return canvas.toDataURL();
  } catch (error) {
    return 'canvas-error';
  }
}

/**
 * Handle security violations
 */
function handleSecurityViolation(reason: string): void {
  if (debuggingDetected) return; // Prevent spam
  
  debuggingDetected = true;
  
  console.error('Security violation detected:', reason);
  
  // Report to server
  fetch('/api/security/violation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }),
  }).catch(() => {
    // Ignore reporting errors
  });

  // Take action based on violation severity
  if (reason.includes('DevTools') || reason.includes('Console')) {
    // Clear sensitive data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to safe page
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
}

/**
 * Encrypt sensitive data before storing
 */
export function encryptStorage(key: string, data: any): void {
  try {
    const encrypted = btoa(JSON.stringify(data));
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Storage encryption failed:', error);
  }
}

/**
 * Decrypt sensitive data from storage
 */
export function decryptStorage(key: string): any {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    return JSON.parse(atob(encrypted));
  } catch (error) {
    console.error('Storage decryption failed:', error);
    return null;
  }
}

/**
 * Secure random number generation
 */
export function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

/**
 * Check if app is running in secure context
 */
export function isSecureContext(): boolean {
  return window.isSecureContext && 
         (window.location.protocol === 'https:' || 
          window.location.hostname === 'localhost');
}
