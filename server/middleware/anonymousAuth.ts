/**
 * Anonymous authentication middleware
 * Handles authentication without exposing any identifying information
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyAnonymousSessionToken, decryptUserId } from '../lib/anonymity';
import { verifyToken } from '../auth';

export interface AnonymousAuthRequest extends Request {
  user?: any;
  userId?: string;
}

/**
 * Optional anonymous authentication
 * Checks for anonymous session or Dynamic auth, but doesn't require it
 */
export const optionalAnonymousAuth = async (
  req: AnonymousAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No auth provided, continue without user
    }
    
    const token = authHeader.slice(7);
    
    // First try to verify as anonymous session token
    const anonymousUserId = verifyAnonymousSessionToken(token);
    if (anonymousUserId) {
      const user = await storage.getUser(anonymousUserId);
      if (user) {
        req.user = user;
        req.userId = anonymousUserId;
        return next();
      }
    }
    
    // Fallback to internal JWT auth (but still return anonymous data)
    const payload = verifyToken(token);
    if (payload) {
      const user = await storage.getUser(payload.sub);
      if (user) {
        req.user = user;
        req.userId = user.id;
        return next();
      }
    }
    
    // No valid auth found, continue without user
    next();
  } catch (error) {
    console.error('Optional anonymous auth error:', error);
    next(); // Continue without user on error
  }
};

/**
 * Required anonymous authentication
 * Requires valid authentication but returns anonymous data
 */
export const requireAnonymousAuth = async (
  req: AnonymousAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.slice(7);
    
    // First try to verify as anonymous session token
    const anonymousUserId = verifyAnonymousSessionToken(token);
    if (anonymousUserId) {
      const user = await storage.getUser(anonymousUserId);
      if (user) {
        req.user = user;
        req.userId = anonymousUserId;
        return next();
      }
    }
    
    // Fallback to internal JWT auth
    const payload = verifyToken(token);
    if (payload) {
      const user = await storage.getUser(payload.sub);
      if (user) {
        req.user = user;
        req.userId = user.id;
        return next();
      }
    }
    
    // No valid auth found
    return res.status(401).json({ message: 'Invalid authentication' });
  } catch (error) {
    console.error('Required anonymous auth error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Decrypt user ID from request parameters
 */
export const decryptUserIdParam = (req: AnonymousAuthRequest, paramName: string = 'id'): string | null => {
  const encryptedId = req.params[paramName];
  if (!encryptedId) return null;
  
  // If it's already a plain ID (for backward compatibility), return it
  if (encryptedId.match(/^[a-f0-9-]+$/)) {
    return encryptedId;
  }
  
  // Try to decrypt it
  return decryptUserId(encryptedId);
};

/**
 * Middleware to decrypt user IDs in request parameters
 */
export const decryptParams = (params: string[] = ['id']) => {
  return (req: AnonymousAuthRequest, res: Response, next: NextFunction) => {
    try {
      for (const param of params) {
        if (req.params[param]) {
          const decrypted = decryptUserId(req.params[param]);
          if (decrypted) {
            // Store both encrypted and decrypted versions
            req.params[`${param}_encrypted`] = req.params[param];
            req.params[param] = decrypted;
          }
        }
      }
      next();
    } catch (error) {
      console.error('Error decrypting parameters:', error);
      return res.status(400).json({ message: 'Invalid parameters' });
    }
  };
};
