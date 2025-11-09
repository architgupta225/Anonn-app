import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const SALT_ROUNDS = 10;

export interface AuthRequest extends Request {
  user?: User;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): { sub: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
};

/**
 * Middleware: Require authentication
 * Verifies internal JWT token and attaches user to request
 * Returns 401 if authentication fails
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('[requireAuth] No bearer token provided');
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.slice(7);

    // Verify the internal JWT token
    const payload = verifyToken(token);
    if (!payload) {
      console.log('[requireAuth] Token verification failed');
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user ID from token payload
    const userId = payload.sub;

    // Fetch user from storage
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('[requireAuth] User not found:', userId);
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request
    req.user = user;
    console.log('[requireAuth] Authentication successful for user:', user.id);
    next();
  } catch (error) {
    console.error('[requireAuth] Error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

/**
 * Middleware: Optional authentication
 * Verifies internal JWT token if present and attaches user to request
 * Does not fail if no token provided
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.slice(7);

    // Verify the internal JWT token
    const payload = verifyToken(token);
    if (!payload) {
      // Invalid token, continue without user
      return next();
    }

    // Get user ID from token payload
    const userId = payload.sub;

    // Fetch user from storage
    const user = await storage.getUser(userId);
    if (user) {
      // Attach user to request if found
      req.user = user;
      console.log('[optionalAuth] User authenticated:', user.id);
    }

    next();
  } catch (error) {
    console.error('[optionalAuth] Error:', error);
    // Continue without user on error
    next();
  }
};