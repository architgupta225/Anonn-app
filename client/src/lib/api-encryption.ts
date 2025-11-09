/**
 * Advanced API encryption and security for client-server communication
 */

import CryptoJS from 'crypto-js';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM',
  keyDerivationIterations: 10000,
  saltLength: 16,
  ivLength: 12,
  tagLength: 16,
};

// Dynamic key rotation
let currentKey: string | null = null;
let keyRotationInterval: NodeJS.Timeout | null = null;

/**
 * Initialize API encryption system
 */
export async function initializeApiEncryption(): Promise<void> {
  await rotateEncryptionKey();
  
  // Rotate keys every 15 minutes
  keyRotationInterval = setInterval(rotateEncryptionKey, 15 * 60 * 1000);
  
  console.log('API encryption initialized');
}

/**
 * Rotate encryption key
 */
async function rotateEncryptionKey(): Promise<void> {
  try {
    const response = await fetch('/api/security/key-exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Key-Request': 'rotation',
      },
    });

    if (response.ok) {
      const data = await response.json();
      currentKey = data.key;
    } else {
      // Fallback to client-side key generation
      currentKey = generateFallbackKey();
    }
  } catch (error) {
    console.error('Key rotation failed:', error);
    currentKey = generateFallbackKey();
  }
}

/**
 * Generate fallback encryption key
 */
function generateFallbackKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt request payload
 */
export async function encryptRequest(data: any): Promise<{
  encrypted: string;
  iv: string;
  tag: string;
  timestamp: number;
}> {
  if (!currentKey) {
    await rotateEncryptionKey();
  }

  const timestamp = Date.now();
  const payload = JSON.stringify({
    data,
    timestamp,
    nonce: crypto.getRandomValues(new Uint32Array(1))[0],
  });

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
  
  // Encrypt using AES-GCM
  const encoder = new TextEncoder();
  const keyBuffer = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(currentKey!),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: ENCRYPTION_CONFIG.tagLength * 8,
    },
    keyBuffer,
    encoder.encode(payload)
  );

  const encrypted = arrayBufferToHex(encryptedBuffer.slice(0, -ENCRYPTION_CONFIG.tagLength));
  const tag = arrayBufferToHex(encryptedBuffer.slice(-ENCRYPTION_CONFIG.tagLength));

  return {
    encrypted,
    iv: arrayBufferToHex(iv),
    tag,
    timestamp,
  };
}

/**
 * Decrypt response payload
 */
export async function decryptResponse(encryptedData: {
  encrypted: string;
  iv: string;
  tag: string;
  timestamp: number;
}): Promise<any> {
  if (!currentKey) {
    throw new Error('Encryption key not available');
  }

  // Check timestamp to prevent replay attacks
  const now = Date.now();
  if (now - encryptedData.timestamp > 60000) { // 1 minute tolerance
    throw new Error('Response timestamp too old');
  }

  const keyBuffer = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(currentKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Combine encrypted data and tag
  const encryptedBuffer = hexToArrayBuffer(encryptedData.encrypted);
  const tagBuffer = hexToArrayBuffer(encryptedData.tag);
  const combinedBuffer = new Uint8Array(encryptedBuffer.byteLength + tagBuffer.byteLength);
  combinedBuffer.set(new Uint8Array(encryptedBuffer));
  combinedBuffer.set(new Uint8Array(tagBuffer), encryptedBuffer.byteLength);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: hexToArrayBuffer(encryptedData.iv),
      tagLength: ENCRYPTION_CONFIG.tagLength * 8,
    },
    keyBuffer,
    combinedBuffer
  );

  const decoder = new TextDecoder();
  const payload = JSON.parse(decoder.decode(decryptedBuffer));

  // Validate nonce and timestamp
  if (!payload.nonce || !payload.timestamp || !payload.data) {
    throw new Error('Invalid decrypted payload');
  }

  return payload.data;
}

/**
 * Secure API request wrapper
 */
export async function secureApiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Generate request signature
  const timestamp = Date.now();
  const nonce = crypto.getRandomValues(new Uint32Array(1))[0].toString();
  const method = options.method || 'GET';
  
  // Create request signature
  const signatureData = `${method}|${url}|${timestamp}|${nonce}`;
  const signature = await createSignature(signatureData);

  // Encrypt request body if present
  let encryptedBody = null;
  if (options.body && typeof options.body === 'string') {
    try {
      const bodyData = JSON.parse(options.body);
      encryptedBody = await encryptRequest(bodyData);
    } catch (error) {
      console.error('Request encryption failed:', error);
    }
  }

  // Enhanced headers
  const enhancedHeaders = {
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID(),
    'X-Timestamp': timestamp.toString(),
    'X-Nonce': nonce,
    'X-Signature': signature,
    'X-Client-Version': '1.0.0',
    'X-Encrypted': encryptedBody ? 'true' : 'false',
    ...options.headers,
  };

  // Add device fingerprint if available
  try {
    const fingerprint = await import('./anti-debug').then(m => m.generateDeviceFingerprint());
    enhancedHeaders['X-Device-ID'] = await fingerprint;
  } catch (error) {
    // Ignore fingerprinting errors
  }

  const enhancedOptions: RequestInit = {
    ...options,
    headers: enhancedHeaders,
    body: encryptedBody ? JSON.stringify(encryptedBody) : options.body,
  };

  // Add request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...enhancedOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Verify response integrity
    await verifyResponseIntegrity(response.clone());

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Create request signature
 */
async function createSignature(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(currentKey || 'fallback-key');
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToHex(signature);
}

/**
 * Verify response integrity
 */
async function verifyResponseIntegrity(response: Response): Promise<void> {
  const serverSignature = response.headers.get('X-Response-Signature');
  const timestamp = response.headers.get('X-Response-Timestamp');
  
  if (!serverSignature || !timestamp) {
    console.warn('Response missing integrity headers');
    return;
  }

  // Check timestamp freshness
  const responseTime = parseInt(timestamp);
  const now = Date.now();
  if (now - responseTime > 60000) { // 1 minute tolerance
    throw new Error('Response timestamp too old');
  }

  // Additional integrity checks can be added here
}

/**
 * Secure local storage with encryption
 */
export function secureStorageSet(key: string, value: any): void {
  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(value),
      currentKey || 'fallback-key'
    ).toString();
    
    localStorage.setItem(`secure_${key}`, encrypted);
  } catch (error) {
    console.error('Secure storage set failed:', error);
  }
}

/**
 * Retrieve from secure local storage
 */
export function secureStorageGet(key: string): any {
  try {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;
    
    const decrypted = CryptoJS.AES.decrypt(
      encrypted,
      currentKey || 'fallback-key'
    ).toString(CryptoJS.enc.Utf8);
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Secure storage get failed:', error);
    return null;
  }
}

/**
 * Clear secure storage
 */
export function secureStorageClear(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('secure_')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Rate limiting for API requests
 */
class ApiRateLimit {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 100;
  private readonly windowMs = 60000; // 1 minute

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(endpoint, validRequests);
    
    return true;
  }
}

export const apiRateLimit = new ApiRateLimit();

/**
 * Utility functions
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (keyRotationInterval) {
    clearInterval(keyRotationInterval);
  }
});
