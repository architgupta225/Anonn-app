/**
 * Anonymity and encryption utilities for the platform
 * Ensures complete user anonymity by encrypting/obfuscating all identifying information
 */

import crypto from 'crypto';
import { CONFIG } from '../config';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyDerivationIterations: 100000,
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
};

// Derive encryption key from config
const deriveKey = (salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(
    CONFIG.SECURITY.JWT_SECRET,
    salt,
    ENCRYPTION_CONFIG.keyDerivationIterations,
    32,
    'sha512'
  );
};

/**
 * Encrypt user ID for external use (API responses, URLs, etc.)
 * Uses a simpler AES-256-CBC encryption
 */
export function encryptUserId(userId: string): string {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(CONFIG.SECURITY.JWT_SECRET, salt, 10000, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(userId, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine salt + iv + encrypted data
    const combined = salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;

    return Buffer.from(combined).toString('base64url');
  } catch (error) {
    console.error('Error encrypting user ID:', error);
    // Fallback to a secure hash if encryption fails
    return crypto.createHash('sha256').update(userId + CONFIG.SECURITY.JWT_SECRET).digest('base64url');
  }
}

/**
 * Decrypt encrypted user ID back to original
 */
export function decryptUserId(encryptedUserId: string): string | null {
  try {
    const combined = Buffer.from(encryptedUserId, 'base64url').toString('utf8');
    const [saltHex, ivHex, encrypted] = combined.split(':');

    if (!saltHex || !ivHex || !encrypted) {
      return null;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.pbkdf2Sync(CONFIG.SECURITY.JWT_SECRET, salt, 10000, 32, 'sha256');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting user ID:', error);
    return null;
  }
}

/**
 * Create anonymous user response (removes all identifying information)
 */
export function createAnonymousUserResponse(user: any, isOwnProfile: boolean = false): any {
  const encryptedId = encryptUserId(user.id);
  
  // Base anonymous response
  const anonymousResponse = {
    id: encryptedId,
    username: user.username,
    bio: user.bio,
    profileImageUrl: user.profileImageUrl,
    bannerUrl: user.bannerUrl,
    karma: user.karma,
    postKarma: user.postKarma,
    commentKarma: user.commentKarma,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    isOnline: user.isOnline,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  
  // For own profile, include limited additional info (but still no email/wallet)
  if (isOwnProfile) {
    return {
      ...anonymousResponse,
      allowlisted: user.allowlisted,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      awardeeKarma: user.awardeeKarma,
      premiumExpiresAt: user.premiumExpiresAt,
      lastActiveAt: user.lastActiveAt,
      // Never include email, walletAddress, firstName, lastName, companyEmail, etc.
    };
  }
  
  return anonymousResponse;
}

/**
 * Generate session token that doesn't expose user info
 */
export function generateAnonymousSessionToken(userId: string): string {
  const payload = {
    uid: encryptUserId(userId),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iss: 'anonn-anon',
  };
  
  const header = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha512', CONFIG.SECURITY.JWT_SECRET)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  
  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and extract user ID from anonymous session token
 */
export function verifyAnonymousSessionToken(token: string): string | null {
  try {
    const [header, payload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha512', CONFIG.SECURITY.JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // Decrypt user ID
    return decryptUserId(decodedPayload.uid);
  } catch (error) {
    console.error('Error verifying anonymous session token:', error);
    return null;
  }
}

/**
 * Sanitize response to remove any identifying information
 */
export function sanitizeResponse(data: any): any {
  if (!data) return data;
  
  // Fields that should never be exposed
  const sensitiveFields = [
    'email',
    'walletAddress',
    'firstName',
    'lastName',
    'companyEmail',
    'companyDomain',
    'dynamicProfile',
    'password',
    'zkProofHash',
  ];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      delete sanitized[field];
    });
    
    // Encrypt user IDs if present
    if (sanitized.id && typeof sanitized.id === 'string') {
      sanitized.id = encryptUserId(sanitized.id);
    }
    
    if (sanitized.userId && typeof sanitized.userId === 'string') {
      sanitized.userId = encryptUserId(sanitized.userId);
    }
    
    if (sanitized.authorId && typeof sanitized.authorId === 'string') {
      sanitized.authorId = encryptUserId(sanitized.authorId);
    }
    
    if (sanitized.createdBy && typeof sanitized.createdBy === 'string') {
      sanitized.createdBy = encryptUserId(sanitized.createdBy);
    }
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeResponse(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  return data;
}

/**
 * Create anonymous post/comment response
 */
export function createAnonymousPostResponse(post: any): any {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    type: post.type,
    authorId: encryptUserId(post.authorId),
    author: post.author ? createAnonymousUserResponse(post.author) : null,
    organizationId: post.organizationId,
    organization: post.organization,
    karma: post.karma,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    commentCount: post.commentCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    // Remove any sensitive fields
    workLifeBalance: post.workLifeBalance,
    cultureValues: post.cultureValues,
    careerOpportunities: post.careerOpportunities,
    compensation: post.compensation,
    management: post.management,
    verified: post.verified,
    tags: post.tags,
  };
}

/**
 * Create anonymous comment response
 */
export function createAnonymousCommentResponse(comment: any): any {
  return {
    id: comment.id,
    content: comment.content,
    authorId: encryptUserId(comment.authorId),
    author: comment.author ? createAnonymousUserResponse(comment.author) : null,
    postId: comment.postId,
    pollId: comment.pollId,
    parentId: comment.parentId,
    karma: comment.karma,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

/**
 * Hash sensitive data for internal use (non-reversible)
 */
export function hashSensitiveData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data + CONFIG.SECURITY.JWT_SECRET)
    .digest('hex');
}

/**
 * Generate anonymous username if needed
 */
export function generateAnonymousUsername(userId: string): string {
  const hash = crypto
    .createHash('md5')
    .update(userId + CONFIG.SECURITY.JWT_SECRET)
    .digest('hex');
  
  const adjectives = ['Silent', 'Swift', 'Brave', 'Wise', 'Bold', 'Quick', 'Sharp', 'Bright', 'Cool', 'Dark'];
  const nouns = ['Wolf', 'Eagle', 'Tiger', 'Bear', 'Fox', 'Hawk', 'Lion', 'Deer', 'Owl', 'Shark'];
  
  const adjIndex = parseInt(hash.substring(0, 2), 16) % adjectives.length;
  const nounIndex = parseInt(hash.substring(2, 4), 16) % nouns.length;
  const number = parseInt(hash.substring(4, 8), 16) % 10000;
  
  return `${adjectives[adjIndex]}${nouns[nounIndex]}${number}`;
}

/**
 * Middleware to ensure all responses are anonymized
 */
export function anonymizeResponse(req: any, res: any, next: any) {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    try {
      if (typeof data === 'object' && data !== null) {
        data = sanitizeResponse(data);
      } else if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          data = JSON.stringify(sanitizeResponse(parsed));
        } catch {
          // Not JSON, leave as is
        }
      }
    } catch (error) {
      console.error('Error anonymizing response:', error);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}
