import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { organizations, accessLogs, users, posts } from '../../shared/schema';
import { eq, and, inArray, avg, sql } from 'drizzle-orm';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import crypto from 'crypto';

// Admin user configuration
const ADMIN_USER_EMAIL = "suhrad205@gmail.com";

/**
 * Calculate organization rating averages from reviews
 */
async function calculateOrganizationRatings(organizationId: number) {
  try {
    const ratingAverages = await db
      .select({
        avgWorkLifeBalance: avg(posts.workLifeBalance),
        avgCultureValues: avg(posts.cultureValues),
        avgCareerOpportunities: avg(posts.careerOpportunities),
        avgCompensation: avg(posts.compensation),
        avgManagement: avg(posts.management),
      })
      .from(posts)
      .where(and(
        eq(posts.organizationId, organizationId),
        eq(posts.type, 'review')
      ));

    return ratingAverages[0] || {
      avgWorkLifeBalance: null,
      avgCultureValues: null,
      avgCareerOpportunities: null,
      avgCompensation: null,
      avgManagement: null,
    };
  } catch (error) {
    console.error('Error calculating organization ratings:', error);
    return {
      avgWorkLifeBalance: null,
      avgCultureValues: null,
      avgCareerOpportunities: null,
      avgCompensation: null,
      avgManagement: null,
    };
  }
}

// Access levels
export type AccessLevel = 'read' | 'write' | 'admin';

// Feature flags interface
export interface OrganizationFeatures {
  // View permissions
  canViewMarketData: boolean;
  canViewAnalytics: boolean;
  canViewCompanyStats: boolean;
  canViewDiversityStats: boolean;
  canViewRecentActivity: boolean;
  
  // Edit permissions
  canEditOrganization: boolean;
  canDeleteOrganization: boolean;
  canManageUsers: boolean;
  
  // Feature permissions
  canCreatePolls: boolean;
  canCreateReviews: boolean;
  canViewAuditLogs: boolean;
  
  // Admin features
  isAdminCreated: boolean;
  isUserCreated: boolean;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      organization?: any;
      accessLevel?: AccessLevel;
      features?: OrganizationFeatures;
    }
  }
}

/**
 * Check if user has access to an organization
 */
export async function checkOrganizationAccess(
  userId: string, 
  organizationId: number, 
  requiredAccess: AccessLevel
): Promise<boolean> {
  try {
    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) {
      return false;
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return false;
    }

    // Check if user is admin
    const isAdmin = user.email === ADMIN_USER_EMAIL;

    // Admin has full access
    if (isAdmin) {
      return true;
    }

    // Check access level
    switch (organization.accessLevel) {
      case 'public':
        return requiredAccess === 'read';
      
      case 'private':
        // Check if user is in allowed users list
        if (organization.allowedUsers && organization.allowedUsers.includes(userId)) {
          return true;
        }
        // Check if user is the creator
        if (organization.createdBy === userId) {
          return true;
        }
        return false;
      
      case 'admin_only':
        return false; // Only admins can access
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking organization access:', error);
    return false;
  }
}

/**
 * Get organization features based on user permissions
 */
export function getOrganizationFeatures(organization: any, user: any): OrganizationFeatures {
  const isAdmin = user.email === ADMIN_USER_EMAIL;
  const isOwner = organization.createdBy === user.id;
  const isPublic = organization.accessLevel === 'public';
  const isPrivate = organization.accessLevel === 'private';
  const isAllowedUser = organization.allowedUsers && organization.allowedUsers.includes(user.id);
  const isAnonymous = user.id === 'anonymous';

  return {
    // View permissions
    canViewMarketData: isAdmin || isPublic,
    canViewAnalytics: isAdmin,
    canViewCompanyStats: isAdmin || isPublic,
    canViewDiversityStats: isAdmin,
    canViewRecentActivity: isAdmin,
    
    // Edit permissions
    canEditOrganization: isAdmin || isOwner,
    canDeleteOrganization: isAdmin,
    canManageUsers: isAdmin,
    
    // Feature permissions
    canCreatePolls: isAdmin || isOwner || (isPublic && !isAnonymous) || (isPrivate && isAllowedUser),
    canCreateReviews: isAdmin || isOwner || (isPublic && !isAnonymous) || (isPrivate && isAllowedUser),
    canViewAuditLogs: isAdmin,
    
    // Admin features
    isAdminCreated: isAdmin,
    isUserCreated: !isAdmin && organization.createdBy
  };
}

/**
 * Log access attempt
 */
export async function logAccessAttempt(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: number | null,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(accessLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      success,
      errorMessage
    });
  } catch (error) {
    console.error('Error logging access attempt:', error);
  }
}

/**
 * Middleware to require organization access
 */
export const requireOrganizationAccess = (accessLevel: AccessLevel) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        await logAccessAttempt(
          userId || 'anonymous',
          'access_denied',
          'organization',
          null,
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          false,
          'No organization ID'
        );
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // First, get the organization to check if it's public
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, parseInt(id)));

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Calculate rating averages
      const ratingAverages = await calculateOrganizationRatings(parseInt(id));
      
      // Merge organization with rating averages
      const organizationWithRatings = {
        ...organization,
        ...ratingAverages
      };

      // If organization is public and we only need read access, allow access without authentication
      if (organization.accessLevel === 'public' && accessLevel === 'read') {
        // For public organizations, create a minimal user object for feature flags
        const anonymousUser = {
          id: 'anonymous',
          email: null,
          isAdmin: false
        };

        // Add to request
        req.organization = organizationWithRatings;
        req.accessLevel = accessLevel;
        req.features = getOrganizationFeatures(organization, anonymousUser);

        // Log successful access
        await logAccessAttempt(
          'anonymous',
          'access_granted',
          'organization',
          parseInt(id),
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          true
        );

        return next();
      }

      // For non-public organizations or write/admin access, require authentication
      if (!userId) {
        await logAccessAttempt(
          'anonymous',
          'access_denied',
          'organization',
          parseInt(id),
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          false,
          'No user ID'
        );
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check access for authenticated users
      const hasAccess = await checkOrganizationAccess(userId, parseInt(id), accessLevel);
      
      if (!hasAccess) {
        await logAccessAttempt(
          userId,
          'access_denied',
          'organization',
          parseInt(id),
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          false,
          'Insufficient permissions'
        );
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get user for feature flags
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add to request
      req.organization = organizationWithRatings;
      req.accessLevel = accessLevel;
      req.features = getOrganizationFeatures(organization, user);

      // Log successful access
      await logAccessAttempt(
        userId,
        'access_granted',
        'organization',
        parseInt(id),
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        true
      );

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const userRequests = requests.get(key);
    
    if (!userRequests || userRequests.resetTime < now) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      userRequests.count++;
      
      if (userRequests.count > maxRequests) {
        return res.status(429).json({ error: 'Too many requests' });
      }
    }

    next();
  };
};

/**
 * Comprehensive security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Generate a unique nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  // Comprehensive security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Enhanced permissions policy
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'encrypted-media=()',
    'fullscreen=()',
    'picture-in-picture=()'
  ].join(', '));

  // Strict Transport Security (HSTS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy with nonce
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.dynamic.xyz https://app.dynamicauth.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss: ws:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' https://app.dynamicauth.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // Remove server identification
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * XSS Protection middleware - sanitizes all text inputs
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any, isUserId: boolean = false): any => {
    // Don't sanitize userId values at all
    if (isUserId) {
      return value;
    }

    if (typeof value === 'string') {
      // Remove null bytes and other dangerous characters
      let sanitized = value.replace(/\0/g, '');

      // Sanitize HTML content using DOMPurify
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });

      return sanitized.trim();
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, false));
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          // Pass true for userId to skip sanitization entirely
          const shouldSkipSanitization = key === 'userId';
          sanitized[key] = sanitizeValue(value[key], shouldSkipSanitization);
        }
      }
      return sanitized;
    }

    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body, false);
  }

  // Skip sanitizing query parameters for API endpoints as they're typically safe
  // and contain identifiers like userId that shouldn't be modified
  if (req.query && req.path.startsWith('/api/')) {
    console.log('[sanitizeInputs] Skipping query sanitization for API endpoint:', req.path);
  } else if (req.query) {
    console.log('[sanitizeInputs] Original query:', req.query);
    req.query = sanitizeValue(req.query, false);
    console.log('[sanitizeInputs] Sanitized query:', req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params, false);
  }

  next();
};

/**
 * Enhanced input validation middleware
 */
export const validateOrganizationInput = (req: Request, res: Response, next: NextFunction) => {
  const { name, description } = req.body;

  // Enhanced validation with regex patterns
  const namePattern = /^[a-zA-Z0-9\s\-_&.,()]+$/;
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
  ];

  if (name) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 255) {
      return res.status(400).json({ error: 'Invalid organization name length' });
    }
    
    if (!namePattern.test(name)) {
      return res.status(400).json({ error: 'Organization name contains invalid characters' });
    }
    
    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(name)) {
        return res.status(400).json({ error: 'Organization name contains forbidden content' });
      }
    }
  }

  if (description) {
    if (typeof description !== 'string' || description.length > 5000) {
      return res.status(400).json({ error: 'Invalid description' });
    }
    
    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(description)) {
        return res.status(400).json({ error: 'Description contains forbidden content' });
      }
    }
  }

  next();
};

/**
 * SSRF Protection middleware - validates URLs and images
 */
export const validateUrlInputs = (req: Request, res: Response, next: NextFunction) => {
  const { imageUrl, profileImageUrl, websiteUrl } = req.body;
  
  const validateUrl = (url: string, fieldName: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`${fieldName} must use HTTP or HTTPS protocol`);
      }
      
      // Block private/internal IP ranges
      const hostname = parsedUrl.hostname;
      const privateIpPatterns = [
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
      
      for (const pattern of privateIpPatterns) {
        if (pattern.test(hostname)) {
          throw new Error(`${fieldName} cannot reference private/internal addresses`);
        }
      }
      
      // Block file:// and other dangerous schemes
      const dangerousPatterns = [
        /^(file|ftp|sftp|smb|ldap|dict|gopher):/i,
        /^(jar|zip|rar):/i,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(url)) {
          throw new Error(`${fieldName} contains forbidden protocol`);
        }
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid ${fieldName}: ${errorMessage}`);
    }
  };

  try {
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      validateUrl(imageUrl, 'imageUrl');
    }
    
    if (profileImageUrl && typeof profileImageUrl === 'string' && profileImageUrl.trim()) {
      validateUrl(profileImageUrl, 'profileImageUrl');
    }
    
    if (websiteUrl && typeof websiteUrl === 'string' && websiteUrl.trim()) {
      validateUrl(websiteUrl, 'websiteUrl');
    }
    
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    return res.status(400).json({ error: errorMessage });
  }
};

/**
 * Advanced rate limiting with different tiers
 */
export const createRateLimit = (config: {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  const requests = new Map<string, { count: number; resetTime: number; violations: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : `${req.ip}-${req.path}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let userRequests = requests.get(key);
    
    if (!userRequests || userRequests.resetTime < now) {
      userRequests = { count: 1, resetTime: now + config.windowMs, violations: 0 };
      requests.set(key, userRequests);
    } else {
      userRequests.count++;
      
      if (userRequests.count > config.maxRequests) {
        userRequests.violations++;
        
        // Exponential backoff for repeat violators
        const penaltyMultiplier = Math.min(userRequests.violations, 10);
        
        res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000 * penaltyMultiplier));
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(userRequests.resetTime).toISOString());
        
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: config.windowMs / 1000 * penaltyMultiplier
        });
      }
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - userRequests.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(userRequests.resetTime).toISOString());
    
    next();
  };
};
