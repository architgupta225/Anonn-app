/**
 * Client-side security utilities for input validation and XSS protection
 */

import DOMPurify from 'dompurify';

// Patterns for detecting potentially malicious content
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<form[^>]*>/gi,
  /<input[^>]*>/gi,
  /<textarea[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /livescript:/gi,
  /mocha:/gi,
];

// Private IP ranges to block for SSRF protection
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

/**
 * Sanitize text content to prevent XSS attacks
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\0\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Use DOMPurify to sanitize
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return sanitized.trim();
}

/**
 * Validate and sanitize HTML content
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'div', 'span',
      'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a'
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'target', 'rel'],
      '*': ['class']
    },
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'style'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Validate text input for dangerous patterns
 */
export function validateTextInput(input: string): { isValid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: true };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return { 
        isValid: false, 
        error: 'Input contains forbidden content' 
      };
    }
  }

  // Check for excessive length
  if (input.length > 10000) {
    return { 
      isValid: false, 
      error: 'Input is too long' 
    };
  }

  return { isValid: true };
}

/**
 * Validate URL for SSRF protection
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: true };
  }

  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { 
        isValid: false, 
        error: 'Only HTTP and HTTPS URLs are allowed' 
      };
    }
    
    // Check for private IP addresses
    const hostname = parsedUrl.hostname;
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { 
          isValid: false, 
          error: 'URLs cannot reference private or local addresses' 
        };
      }
    }
    
    // Check for suspicious schemes
    if (/^(file|ftp|sftp|smb|ldap|dict|gopher|jar|zip|rar):/i.test(url)) {
      return { 
        isValid: false, 
        error: 'URL protocol is not allowed' 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid URL format' 
    };
  }
}

/**
 * Validate file upload (client-side checks)
 */
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { 
      isValid: false, 
      error: 'File size must be less than 5MB' 
    };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'File type is not allowed' 
    };
  }

  // Check filename for suspicious patterns
  const filename = file.name;
  if (/[<>:"/\\|?*\0]/.test(filename)) {
    return { 
      isValid: false, 
      error: 'Filename contains invalid characters' 
    };
  }

  return { isValid: true };
}

/**
 * Generate a secure CSP nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if current page is served over HTTPS
 */
export function isSecureContext(): boolean {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * Rate limiting helper for client-side operations
 */
export class ClientRateLimit {
  private operations: Map<string, number[]> = new Map();

  isAllowed(key: string, maxOperations: number, windowMs: number): boolean {
    const now = Date.now();
    const operations = this.operations.get(key) || [];
    
    // Remove old operations outside the window
    const validOperations = operations.filter(time => now - time < windowMs);
    
    if (validOperations.length >= maxOperations) {
      return false;
    }
    
    validOperations.push(now);
    this.operations.set(key, validOperations);
    
    return true;
  }
}

// Export a singleton rate limiter
export const clientRateLimit = new ClientRateLimit();
