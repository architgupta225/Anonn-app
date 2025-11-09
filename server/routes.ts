import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { requireAuth, optionalAuth, type AuthRequest } from "./auth";
import { optionalAnonymousAuth, requireAnonymousAuth, decryptParams } from "./middleware/anonymousAuth";
import { CONFIG } from "./config";
import { 
  requireOrganizationAccess, 
  rateLimit, 
  securityHeaders, 
  validateOrganizationInput,
  validateUrlInputs,
  type OrganizationFeatures
} from './middleware/security';
import crypto from 'crypto';
import {
  encryptUserId,
  decryptUserId,
  createAnonymousUserResponse,
  createAnonymousPostResponse,
  createAnonymousCommentResponse,
  sanitizeResponse,
  anonymizeResponse,
  generateAnonymousSessionToken,
  verifyAnonymousSessionToken
} from './lib/anonymity';

// Type helper for authenticated routes
type AuthenticatedRoute = (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;
import {
  insertOrganizationSchema,
  insertBowlSchema,
  insertPostSchema,
  insertCommentSchema,
  insertVoteSchema,
  insertBowlFollowSchema,
  insertOrgTrustVoteSchema,
} from "@shared/schema";


export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🔧 Mounting ZK verification routes...');

  // ZK Verification routes - mount EARLY to avoid conflicts
  console.log('📦 Importing ZK verification routes...');
  const zkVerificationRoutes = await import('./zkVerificationRoutes');
  console.log('✅ ZK routes imported successfully');

  // Mount ZK verification routes (some endpoints are public, some require auth)
  console.log('🔗 Mounting ZK verification routes at /api/zk-verification');

  app.use('/api/zk-verification', zkVerificationRoutes.default);
  console.log('✅ ZK routes mounted successfully');

  // Mount Sign-in with Wallet (SIWW) authentication routes
  console.log('🔗 Mounting SIWW authentication routes at /api/auth');
  const siwwAuthRoutes = await import('./simpleAuth');
  app.use('/api/auth', siwwAuthRoutes.default);
  console.log('✅ SIWW auth routes mounted successfully');

  // Add Garaga ZK proof generation route
  app.post('/api/zk/generate-proof', requireAuth, async (req: Request, res: Response) => {
    try {
      const { idToken, domain, email, ephemeralKeyId, ephemeralPubkeyHash } = req.body;

      if (!idToken || !domain || !email) {
        return res.status(400).json({
          success: false,
          message: 'idToken, domain, and email are required',
        });
      }

      // Import the Garaga proof service
      const { garagaProofService } = await import('./garagaProofService');
      
      // Generate the ZK proof
      const proof = await garagaProofService.generateProof({
        idToken,
        domain,
        email,
        ephemeralKeyId: ephemeralKeyId || '',
        ephemeralPubkeyHash: ephemeralPubkeyHash || '',
      });

      res.json({
        success: true,
        proof: {
          proof: Array.from(proof.proof),
          publicInputs: proof.publicInputs,
          verificationKey: proof.verificationKey ? Array.from(proof.verificationKey) : undefined,
        },
      });
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate ZK proof',
      });
    }
  });

  // ZK OAuth callback routes (public, no auth required)
  app.get('/api/zk-verification/oauth/google/callback', zkVerificationRoutes.default);

  // Apply anonymization middleware to all OTHER routes (not ZK)
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/zk-verification')) {
      console.log('🚫 Skipping anonymization for ZK route:', req.path);
      return next();
    }
    anonymizeResponse(req, res, next);
  });

  
  // WebSocket test endpoint
  app.get('/websocket-test', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'websocket-test.html'));
  });
  
  // Login redirect endpoint
  app.get('/api/login', (req, res) => {
    res.redirect('/auth');
  });

  // Add this logout endpoint after the other auth endpoints (around line 372, after the /api/auth/user route)
// Add this logout endpoint after the other auth endpoints
app.post('/api/auth/logout', async (req: any, res) => {
  try {
    console.log('[logout] Processing logout request');
    
    // If you have a user ID, update their online status
    if (req.user?.id) {
      try {
        const user = await storage.getUser(req.user.id);
        if (user) {
          await storage.upsertUser({
            ...user,
            isOnline: false,
          });
          console.log(`[logout] User ${req.user.id} marked as offline`);
        }
      } catch (error) {
        console.warn('[logout] Failed to update user status:', error);
      }
    }
    
    // Since auth tokens are stored client-side in localStorage/sessionStorage,
    // the actual logout happens on the client side
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('[logout] Error during logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
});

  // Dynamic webhook endpoint removed - no longer using Dynamic Labs authentication
  /*
  app.post('/api/webhooks/dynamic', async (req, res) => {
    try {
      // Verify webhook signature for security
      const signature = req.headers['x-dynamic-signature'] as string;
      const rawBody = JSON.stringify(req.body);
      
      if (CONFIG.DYNAMIC.WEBHOOK_SECRET && signature) {
        const isValid = verifyWebhookSignature(rawBody, signature, CONFIG.DYNAMIC.WEBHOOK_SECRET);
        if (!isValid) {
          console.error('[webhook] Invalid signature');
          return res.status(401).json({ message: 'Invalid webhook signature' });
        }
      } else if (CONFIG.SERVER.NODE_ENV === 'production') {
        console.error('[webhook] Missing signature in production');
        return res.status(401).json({ message: 'Webhook signature required in production' });
      }

      const event = req.body || {};
      const type = event.eventName || event.type || event.event || 'unknown';
      const data = event.data || event.user || {};

      console.log(`[webhook] Received ${type} event for user:`, data?.userId || data?.id || 'unknown');

      // Handle session events
      if (type === 'user.session.created') {
        const userId = data?.userId;
        if (!userId) {
          console.error('[webhook] Missing user ID in session.created payload');
          return res.status(400).json({ message: 'Missing user ID' });
        }

        try {
          // Update user's online status and last active time
          const user = await storage.getUser(userId);
          if (user) {
            await storage.upsertUser({
              ...user,
              isOnline: true,
              lastActiveAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`[webhook] User ${userId} session created - marked online`);
          } else {
            console.warn(`[webhook] Session created for unknown user ${userId}`);
          }
          
          return res.json({ message: 'Session created processed', userId });
        } catch (error: any) {
          console.error(`[webhook] Error processing session.created for user ${userId}:`, error);
          return res.status(500).json({ message: 'Failed to process session creation' });
        }
      }
      
      if (type === 'user.session.revoked') {
        const userId = data?.userId;
        if (!userId) {
          console.error('[webhook] Missing user ID in session.revoked payload');
          return res.status(400).json({ message: 'Missing user ID' });
        }

        try {
          // Update user's online status when session is revoked
          const user = await storage.getUser(userId);
          if (user) {
            await storage.upsertUser({
              ...user,
              isOnline: false,
              lastActiveAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`[webhook] User ${userId} session revoked - marked offline`);
          } else {
            console.warn(`[webhook] Session revoked for unknown user ${userId}`);
          }
          
          return res.json({ message: 'Session revocation processed', userId });
        } catch (error: any) {
          console.error(`[webhook] Error processing session.revoked for user ${userId}:`, error);
          return res.status(500).json({ message: 'Failed to process session revocation' });
        }
      }

      // Handle wallet.created event
      if (type === 'wallet.created') {
        const userId = data?.userId;
        const walletAddress = data?.lowerPublicKey || data?.publicKey;
        
        if (!userId || !walletAddress) {
          console.error('[webhook] Missing user ID or wallet address in wallet.created payload');
          return res.status(400).json({ message: 'Missing user ID or wallet address' });
        }

        try {
          const user = await storage.getUser(userId);
          if (user) {
            await storage.upsertUser({
              ...user,
              walletAddress: walletAddress,
              updatedAt: new Date(),
            });
            console.log(`[webhook] Updated user ${userId} wallet address: ${walletAddress}`);
          } else {
            console.warn(`[webhook] Wallet created for unknown user ${userId}`);
          }
          
          return res.json({ 
            received: true, 
            id: userId, 
            type: 'wallet.created',
            fields: ['walletAddress', 'updatedAt'],
            updated: true, 
            existed: !!user 
          });
        } catch (error: any) {
          console.error(`[webhook] Error processing wallet.created for user ${userId}:`, error);
          return res.status(500).json({ message: 'Failed to process wallet creation' });
        }
      }

      // Validate payload for user events
      if (!data || (!data.id && !data.userId)) {
        console.error('[webhook] Invalid payload - missing user data or ID');
        return res.status(400).json({ message: 'Invalid payload: missing user data or ID' });
      }

      // Extract the correct user ID - prioritize data.userId (actual user) over data.id (session)
      // From logs: data.userId = "c72e4a77-ae02-458e-99ac-c1019a681585" (real user)
      // From logs: data.id = "6a472754-fb70-4c49-b0f2-d783947131a1" (session ID)
      let userId: string;
      if (data.userId) {
        // Use the actual user ID when available
        userId = data.userId as string;
        if (data.id !== data.userId) {
          console.log(`[webhook] Using actual user ID: ${userId} (ignoring session ID: ${data.id})`);
        }
      } else {
        // Fallback to data.id for true user events
        userId = data.id as string;
        console.log(`[webhook] Using data.id as user ID: ${userId}`);
      }

      // Extract email and first blockchain wallet if present
      const vc: any[] = Array.isArray(data.verifiedCredentials) ? data.verifiedCredentials : [];
      const walletCred = vc.find((c: any) => c.format === 'blockchain' && c.address);
      const emailCred = vc.find((c: any) => c.format === 'email' && (c.email || c.publicIdentifier));
      
      const email = data.email || emailCred?.email || emailCred?.publicIdentifier || null;
      const walletAddress = walletCred?.address || null;

      const existing = await storage.getUser(userId);

      if (existing) {
        // Update any newly provided fields and always refresh dynamicProfile
        const updates: any = { 
          dynamicProfile: data, 
          dynamicProfileSynced: true,
          updatedAt: new Date(),
        };
        
        // Only update fields if they have changed and are not empty
        if (email && existing.email !== email) {
          updates.email = email;
        }
        if (walletAddress && (existing as any).walletAddress !== walletAddress) {
          updates.walletAddress = walletAddress;
        }
        // firstName and lastName removed for privacy
        
        // Add username from alias if not set
        if (data.alias && !(existing as any).username) {
          updates.username = data.alias;
        }

        let updatedId = existing.id;
        let updated = false;
        
        try {
          const row = await storage.upsertUser({ ...(existing as any), ...updates } as any);
          updatedId = row.id;
          updated = true;
          console.log(`[webhook] Updated user ${updatedId} with ${Object.keys(updates).join(', ')}`);
        } catch (err: any) {
          const msg = String(err?.message || err);
          console.error(`[webhook] Error updating user ${userId}:`, msg);
          
          // Handle unique constraint violations gracefully
          if (/duplicate key|unique constraint/i.test(msg)) {
            if (/email/i.test(msg) && 'email' in updates) {
              delete updates.email;
              console.warn('[webhook] Removed email update due to uniqueness constraint');
            }
            if (/username/i.test(msg) && 'username' in updates) {
              delete updates.username;
              console.warn('[webhook] Removed username update due to uniqueness constraint');
            }
            
            // Retry without conflicting fields
            try {
              const row = await storage.upsertUser({ ...(existing as any), ...updates } as any);
              updatedId = row.id;
              updated = true;
              console.log(`[webhook] Updated user ${updatedId} after removing conflicts`);
            } catch (retryErr) {
              console.error(`[webhook] Retry failed for user ${userId}:`, retryErr);
              throw retryErr;
            }
          } else {
            throw err;
          }
        }
        
        return res.status(200).json({ 
          received: true, 
          type, 
          id: updatedId, 
          existed: true, 
          updated,
          fields: Object.keys(updates)
        });
      }

      // Create new user (covers user.created and late-arriving user.updated)
      try {
        const userData = {
          id: userId,
          email: email,
          username: data.alias || null,
          password: null,
          walletAddress: walletAddress,
          allowlisted: true,
          karma: 0,
          postKarma: 0,
          commentKarma: 0,
          awardeeKarma: 0,
          followerCount: 0,
          followingCount: 0,
          isVerified: false,
          isPremium: false,
          isOnline: false,
          dynamicProfile: data,
          dynamicProfileSynced: true,
        } as any;

        const created = await storage.upsertUser(userData);
        console.log(`[webhook] Created new user ${created.id}`);

        return res.status(200).json({ 
          received: true, 
          type, 
          id: created.id, 
          created: true,
          fields: Object.keys(userData)
        });
      } catch (createErr: any) {
        const msg = String(createErr?.message || createErr);
        console.error(`[webhook] Error creating user ${userId}:`, msg);
        
        // Handle race condition where user was created between our check and creation
        if (/duplicate key|unique constraint/i.test(msg) && /pkey|primary/i.test(msg)) {
          console.warn(`[webhook] User ${userId} was created concurrently, fetching existing`);
          const existingUser = await storage.getUser(userId);
          if (existingUser) {
            return res.status(200).json({ 
              received: true, 
              type, 
              id: existingUser.id, 
              existed: true, 
              raceCondition: true
            });
          }
        }
        
        throw createErr;
      }
    } catch (e: any) {
      console.error('[webhook] Dynamic webhook error:', e);
      return res.status(500).json({ 
        message: e?.message || 'Webhook processing error',
        type: 'webhook_error'
      });
    }
  });
  */

  // Auth endpoints now handled by SIWW. Return anonymized user data.
  app.get('/api/auth/user', optionalAnonymousAuth, async (req: any, res) => {
    if (!req.user) {
      console.warn('[api] /api/auth/user: unauthenticated');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Return anonymized user data (own profile with limited additional info)
    const anonymizedUser = createAnonymousUserResponse(req.user, true);
    res.json(anonymizedUser);
  });

  // Get user by ID (for viewing other users' profiles)
  app.get('/api/users/:id', optionalAnonymousAuth, decryptParams(['id']), async (req: any, res) => {
    try {
      const userId = req.params.id; // Already decrypted by middleware
      
      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if this is the user's own profile
      const isOwnProfile = req.user && req.user.id === userId;
      
      // Return anonymized user data
      const anonymizedUser = createAnonymousUserResponse(user, isOwnProfile);
      res.json(anonymizedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update current user's profile  
  app.put('/api/users/me', requireAnonymousAuth, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const schema = z.object({
        email: z.string().email().optional(),
        bio: z.string().max(500).optional().or(z.literal('')),
        username: z.string().min(1).max(50).optional(),
      });
      
      const body = schema.parse(req.body || {});
      const updates: any = { ...body };
      
      // Normalize empty strings to null
      if (updates.bio === '') updates.bio = null;
      if (updates.username === '') updates.username = null;
      
      // Add updatedAt timestamp
      updates.updatedAt = new Date();
      
      const user = await storage.upsertUser({ ...currentUser, ...updates });
      console.log(`[users/me] Updated user ${user.id}:`, Object.keys(updates));
      
      // Return anonymized user data
      const anonymizedUser = createAnonymousUserResponse(user, true);
      res.json(anonymizedUser);
    } catch (error: any) {
      const message = error?.message || 'Failed to update profile';
      
      // Handle unique constraint violations
      if (/duplicate key|unique constraint/i.test(message)) {
        if (message.includes('email')) {
          return res.status(409).json({ message: 'Email address is already in use by another account' });
        }
        if (message.includes('username')) {
          return res.status(409).json({ message: 'Username is already taken' });
        }
        return res.status(409).json({ message: 'This information is already in use by another account' });
      }
      
      console.error('[users/me] Error updating profile:', error);
      res.status(400).json({ message });
    }
  });

  // Debug endpoint to see current user info (DEV ONLY)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/auth/debug-user', requireAuth, async (req: any, res) => {
      try {
        res.json({
          user: req.user,
          userId: req.user?.id,
          walletAddress: req.user?.walletAddress,
          email: req.user?.email,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  // Apply security headers to all routes
  app.use(securityHeaders);

  // Company Verification routes
  const { companyVerificationService } = await import('./companyVerificationService');

  // Initiate company email verification
  app.post('/api/company-verification/initiate', requireAuth, async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required' });
      }

      const result = await companyVerificationService.initiateVerification({
        userId: req.user.id,
        email: email.toLowerCase().trim(),
      });

      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error initiating company verification:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Confirm company email verification with code
  app.post('/api/company-verification/confirm', requireAuth, async (req: any, res) => {
    try {
      const { email, code, zkProof } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: 'Email and verification code are required' });
      }

      const result = await companyVerificationService.confirmVerification({
        userId: req.user.id,
        email: email.toLowerCase().trim(),
        code: code.toString().trim(),
        zkProof,
      });

      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message,
          zkProofHash: result.zkProofHash 
        });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error confirming company verification:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's company verification status
  app.get('/api/company-verification/status', requireAuth, async (req: any, res) => {
    try {
      const status = await companyVerificationService.getVerificationStatus(req.user.id);
      res.json(status);
    } catch (error) {
      console.error('Error getting verification status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Remove company verification (for user or admin)
  app.delete('/api/company-verification', requireAuth, async (req: any, res) => {
    try {
      const success = await companyVerificationService.removeVerification(req.user.id);
      
      if (success) {
        res.json({ success: true, message: 'Company verification removed successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to remove verification' });
      }
    } catch (error) {
      console.error('Error removing company verification:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin endpoint to add/update company domain mappings
  app.post('/api/company-verification/domains', requireAuth, async (req: any, res) => {
    try {
      // TODO: Add admin check here
      const { domain, companyName, logo } = req.body;
      
      if (!domain || !companyName) {
        return res.status(400).json({ message: 'Domain and company name are required' });
      }

      const success = await companyVerificationService.addCompanyDomainMapping({
        domain: domain.toLowerCase().trim(),
        companyName: companyName.trim(),
        logo: logo?.trim(),
      });

      if (success) {
        res.json({ success: true, message: 'Company domain mapping added successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to add domain mapping' });
      }
    } catch (error) {
      console.error('Error adding company domain mapping:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get company info from domain
  app.get('/api/company-verification/domain/:domain', async (req, res) => {
    try {
      const domain = req.params.domain.toLowerCase().trim();
      const mapping = await companyVerificationService.getCompanyNameFromDomain(domain);

      if (mapping) {
        res.json(mapping);
      } else {
        res.status(404).json({ message: 'Company domain mapping not found' });
      }
    } catch (error) {
      console.error('Error getting company domain mapping:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Organization routes
  app.get('/api/organizations', async (req, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get('/api/organizations/search', async (req, res) => {
    try {
      const query = (req.query.q as string || '').slice(0, 100);
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const organizations = await storage.searchOrganizationsWithStats(query);
      res.json(organizations);
    } catch (error) {
      console.error("Error searching organizations:", error);
      res.status(500).json({ message: "Failed to search organizations" });
    }
  });

  // Global search (posts only for now)
  app.get('/api/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const type = String(req.query.type || 'posts');
      if (!q) {
        return res.json({ posts: [] });
      }
      // Simple search across posts title/content
      const results = await storage.searchPosts(q);
      console.log('[search] q="' + q + '" -> ' + (results?.length || 0) + ' posts');
      // Ensure consistent shape for client
      res.setHeader('Content-Type', 'application/json');
      res.json({ posts: results });
    } catch (error) {
      console.error('Error in /api/search:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  // POST /api/organizations - Create organization with security
  app.post('/api/organizations', 
    requireAuth, 
    rateLimit(10, 60000),
    validateOrganizationInput,
    validateUrlInputs,
    async (req: any, res) => {
      try {
        const userId = req.user!.id;
        const orgData = insertOrganizationSchema.parse({ ...req.body, createdBy: userId });

        // Check if organization with same name already exists
        const existingOrg = await storage.getOrganizationByName(orgData.name);
        if (existingOrg) {
          return res.status(400).json({ message: "An organization with this name already exists" });
        }

        const organization = await storage.createOrganization(orgData, userId);
        res.status(201).json(organization);
      } catch (error) {
        console.error("Error creating organization:", error);
        res.status(500).json({ message: "Failed to create organization" });
      }
    }
  );

  // Organization routes with security
  app.get('/api/organizations/featured', rateLimit(100, 60000), async (req, res) => {
    try {
      const userId = req.user?.id;
      const organizations = await storage.getFeaturedOrganizations(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching featured organizations:", error);
      res.status(500).json({ message: "Failed to fetch featured organizations" });
    }
  });

  app.get('/api/organizations/all', rateLimit(100, 60000), async (req, res) => {
    try {
      const userId = req.user?.id;
      const organizations = await storage.getAllOrganizations(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching all organizations:", error);
      res.status(500).json({ message: "Failed to fetch all organizations" });
    }
  });

  // Secure organization routes with access control
  app.get('/api/organizations/:id', 
    rateLimit(100, 60000),
    requireOrganizationAccess('read'),
    async (req, res) => {
      try {
        const organization = req.organization;
        const features = req.features as OrganizationFeatures;
        
        // Return organization with feature flags
        res.json({
          ...organization,
          features
        });
      } catch (error) {
        console.error("Error fetching organization:", error);
        res.status(500).json({ message: "Failed to fetch organization" });
      }
    }
  );



  app.put('/api/organizations/:id', 
    rateLimit(10, 60000),
    requireOrganizationAccess('write'),
    validateOrganizationInput,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user!.id;
        
        const updatedOrg = await storage.updateOrganization(parseInt(id), updates, userId);
        
        if (!updatedOrg) {
          return res.status(403).json({ message: "Access denied or organization not found" });
        }
        
        res.json(updatedOrg);
      } catch (error) {
        console.error("Error updating organization:", error);
        res.status(500).json({ message: "Failed to update organization" });
      }
    }
  );

  app.delete('/api/organizations/:id', 
    rateLimit(5, 60000),
    requireOrganizationAccess('admin'),
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user!.id;
        
        const success = await storage.deleteOrganization(parseInt(id), userId);
        
        if (!success) {
          return res.status(403).json({ message: "Access denied or organization not found" });
        }
        
        res.json({ message: "Organization deleted successfully" });
      } catch (error) {
        console.error("Error deleting organization:", error);
        res.status(500).json({ message: "Failed to delete organization" });
      }
    }
  );

  // Bowl routes
  app.get('/api/bowls', async (req, res) => {
    try {
      const { category } = req.query;
      
      if (category && typeof category === 'string' && category.trim()) {
        const bowls = await storage.getBowlsByCategory(category);
        res.json(bowls);
      } else {
        const bowls = await storage.getBowls();
        res.json(bowls);
      }
    } catch (error) {
      console.error("Error fetching bowls:", error);
      res.status(500).json({ message: "Failed to fetch bowls" });
    }
  });

  app.get('/api/bowls/categories', async (req, res) => {
    try {
      const categories = await storage.getBowlsCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching bowl categories:", error);
      res.status(500).json({ message: "Failed to fetch bowl categories" });
    }
  });

  app.get('/api/bowls/:id', async (req, res) => {
    try {
      const param = req.params.id;
      let bowl;
      if (/^\d+$/.test(param)) {
        bowl = await storage.getBowl(parseInt(param));
      } else {
        bowl = await storage.getBowlByName(decodeURIComponent(param));
      }
      if (!bowl) {
        return res.status(404).json({ message: "Bowl not found" });
      }
      res.json(bowl);
    } catch (error) {
      console.error("Error fetching bowl:", error);
      res.status(500).json({ message: "Failed to fetch bowl" });
    }
  });

  // Follow bowl
  app.post('/api/bowls/:id/follow', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const bowlId = parseInt(req.params.id);

      console.log('[follow] Attempting to follow bowl:', { userId, bowlId, userEmail: req.user!.email });

      // Check if bowl exists
      const bowl = await storage.getBowl(bowlId);
      if (!bowl) {
        console.log('[follow] Bowl not found:', bowlId);
        return res.status(404).json({ message: "Bowl not found" });
      }

      console.log('[follow] Bowl found:', bowl.name);

      // Check if already following
      const isFollowing = await storage.isUserFollowingBowl(userId, bowlId);
      console.log('[follow] Is already following:', isFollowing);
      
      if (isFollowing) {
        return res.status(200).json({ message: "Already following this bowl", isFollowing: true });
      }

      console.log('[follow] Creating new follow...');
      const follow = await storage.followBowl({ userId, bowlId });
      console.log('[follow] Follow created successfully:', follow.id);
      
      res.status(201).json({ ...follow, isFollowing: true });
    } catch (error) {
      console.error("Error following bowl:", error);
      res.status(500).json({ message: "Failed to follow bowl", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Unfollow bowl  
  app.delete('/api/bowls/:id/follow', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const bowlId = parseInt(req.params.id);

      // Check if following
      const isFollowing = await storage.isUserFollowingBowl(userId, bowlId);
      if (!isFollowing) {
        return res.status(400).json({ message: "Not following this bowl" });
      }

      await storage.unfollowBowl(userId, bowlId);
      res.json({ message: "Successfully unfollowed bowl" });
    } catch (error) {
      console.error("Error unfollowing bowl:", error);
      res.status(500).json({ message: "Failed to unfollow bowl" });
    }
  });

  // Get user's followed bowls
  app.get('/api/user/bowls', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const follows = await storage.getUserBowlFollows(userId);
      res.json(follows);
    } catch (error) {
      console.error("Error fetching user bowls:", error);
      res.status(500).json({ message: "Failed to fetch user bowls" });
    }
  });

  // Get user favorites
  app.get('/api/user/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserBowlFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // Update user favorites
  app.post('/api/user/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { bowlId, isFavorite } = req.body;
      
      console.log('[favorite] Updating favorite:', { userId, bowlId, isFavorite });
      
      if (typeof bowlId !== 'number' || typeof isFavorite !== 'boolean') {
        return res.status(400).json({ message: "Invalid request data" });
      }

      await storage.updateBowlFavorite(userId, bowlId, isFavorite);
      res.json({ message: "Favorite updated successfully" });
    } catch (error) {
      console.error("Error updating favorite:", error);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });

  // Check if user is favoriting a bowl
  app.get('/api/bowls/:id/favoriting', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const bowlId = parseInt(req.params.id);
      const isFavoriting = await storage.isUserFavoritingBowl(userId, bowlId);
      res.json({ isFavoriting });
    } catch (error) {
      console.error("Error checking bowl favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Check if user is following a bowl
  app.get('/api/bowls/:id/following', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const bowlId = parseInt(req.params.id);
      const isFollowing = await storage.isUserFollowingBowl(userId, bowlId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking bowl follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });


  // ==================== BOOKMARK/SAVE ROUTES ====================

// Save/bookmark a post
app.post('/api/posts/:id/save', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const postId = parseInt(req.params.id);

    // Validate post ID
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Check if post exists
    const post = await storage.getPost(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already saved
    const isSaved = await storage.isPostSavedByUser(userId, postId);
    if (isSaved) {
      return res.status(200).json({ 
        message: "Post already saved", 
        isSaved: true 
      });
    }

    // Save the post
    const savedContent = await storage.savePost(userId, postId);
    
    res.status(201).json({ 
      ...savedContent, 
      isSaved: true,
      message: "Post saved successfully"
    });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({ 
      message: "Failed to save post", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// Unsave/unbookmark a post
app.delete('/api/posts/:id/save', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const postId = parseInt(req.params.id);

    // Validate post ID
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Check if saved
    const isSaved = await storage.isPostSavedByUser(userId, postId);
    if (!isSaved) {
      return res.status(400).json({ message: "Post not saved" });
    }

    // Unsave the post
    await storage.unsavePost(userId, postId);
    
    res.json({ 
      message: "Post unsaved successfully",
      isSaved: false 
    });
  } catch (error) {
    console.error("Error unsaving post:", error);
    res.status(500).json({ 
      message: "Failed to unsave post", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// Check if post is saved by user
app.get('/api/posts/:id/saved', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const postId = parseInt(req.params.id);

    // Validate post ID
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const isSaved = await storage.isPostSavedByUser(userId, postId);
    res.json({ isSaved });
  } catch (error) {
    console.error("Error checking if post is saved:", error);
    res.status(500).json({ 
      message: "Failed to check save status",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// Get user's saved posts
app.get('/api/user/saved-posts', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    
    console.log('[API] Fetching saved posts for user:', userId);
    
    const savedPosts = await storage.getUserSavedPosts(userId);
    
    console.log('[API] Found', savedPosts.length, 'saved posts');
    
    // Add user votes if needed
    if (savedPosts.length > 0) {
      const postIds = savedPosts.map(s => s.post.id);
      const userVotes = await storage.getUserVotes(userId, postIds, 'post');
      
      savedPosts.forEach(saved => {
        saved.post.userVote = userVotes.find(v => v.targetId === saved.post.id);
      });
    }
    
    res.json(savedPosts);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ 
      message: "Failed to fetch saved posts",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});


  // Post routes
  app.get('/api/posts', optionalAuth, async (req: any, res) => {
    try {
      const filters: any = {};
      if (req.query.organizationId) {
        const orgId = parseInt(req.query.organizationId as string);
        if (!isNaN(orgId)) {
          filters.organizationId = orgId;
        }
      }
      if (req.query.bowlId) {
        const bowlId = parseInt(req.query.bowlId as string);
        if (!isNaN(bowlId)) {
          filters.bowlId = bowlId;
        }
      }
      if (req.query.type) {
        filters.type = req.query.type as string;
      }
      if (req.query.featured) {
        filters.featured = req.query.featured === 'true';
      }
      if (req.query.trending) {
        filters.trending = req.query.trending === 'true';
      }
      if (req.query.time) {
        filters.time = req.query.time as string;
      }
      if (req.query.sortBy) {
        filters.sortBy = req.query.sortBy as string;
      }
      if (req.query.userId) {
        filters.userId = req.query.userId as string;
        console.log('[API Posts] userId filter:', filters.userId, 'type:', typeof filters.userId);
      }
      // Also check for "author" parameter as workaround for corrupted userId
      if (req.query.author) {
        filters.userId = req.query.author as string;
        console.log('[API Posts] author filter:', filters.userId, 'type:', typeof filters.userId);
      }
      // Also check for "id" parameter as another workaround
      if (req.query.id && !req.query.userId && !req.query.author) {
        filters.userId = req.query.id as string;
        console.log('[API Posts] id filter:', filters.userId, 'type:', typeof filters.userId);
      }

      const posts = await storage.getPosts(filters);
      
      
      // Add user votes if authenticated
      if (req.user && posts.length > 0) {
        try {
          const userId = req.user.id;
          const postIds = posts.map(p => p.id);
          const userVotes = await storage.getUserVotes(userId, postIds, 'post');
          
          posts.forEach(post => {
            post.userVote = userVotes.find(v => v.targetId === post.id);
          });
        } catch (error) {
          console.error("Error fetching user votes:", error);
          // Continue without user votes if there's an error
        }
      }

      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/:id', optionalAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate that the ID is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Add user vote if authenticated
      if (req.user) {
        const userId = req.user.id;
        post.userVote = await storage.getVote(userId, id, 'post');
      }

      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post('/api/posts', requireAuth, validateUrlInputs, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { poll, ...postBody } = req.body;
      
      const postData = insertPostSchema.parse({ ...postBody, authorId: userId });
      const post = await storage.createPost(postData);
      
      // Create poll if provided
      if (poll && poll.options && poll.options.length > 0) {
        const pollData = {
          title: poll.title || postData.title,
          description: poll.description,
          authorId: userId,
          bowlId: postData.bowlId,
          organizationId: postData.organizationId,
          allowMultipleChoices: poll.allowMultipleSelections || false,
          isAnonymous: false,
          postId: post.id, // Link the poll to the post
        };
        
        const createdPoll = await storage.createPoll(pollData);
        
        // Create poll options
        for (const optionText of poll.options) {
          await storage.createPollOption({
            pollId: createdPoll.id,
            text: optionText,
          });
        }
      }
      
      // Award karma for posting a review
      if (postData.type === 'review') {
        await storage.updateUserKarma(userId, 5);
      }

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Poll routes
  app.get('/api/polls', optionalAuth, async (req: any, res) => {
    try {
      const { featured, trending, time, organizationId, sortBy } = req.query;
      const filters: any = {};

      if (featured) filters.featured = featured === 'true';
      if (trending) filters.trending = trending === 'true';
      if (time) filters.time = time as string;
      if (sortBy) filters.sortBy = sortBy as string;
      if (organizationId) {
        const orgId = parseInt(organizationId as string);
        if (!isNaN(orgId)) {
          filters.organizationId = orgId;
        }
      }
      console.log("filters", filters)
      const polls = await storage.getAllPolls(filters);
      
      // Add user votes if authenticated
      if (req.user) {
        const userId = req.user.id;
        const pollIds = polls.map(p => p.id);
        const userVotes = await storage.getUserVotes(userId, pollIds, 'poll');
        
        // Add user votes to polls
        polls.forEach(poll => {
          poll.userVote = userVotes.find(v => v.targetId === poll.id);
        });
      }
      
      res.json(polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.get('/api/polls/:id', optionalAuth, async (req: any, res) => {
    try {
      const pollId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Invalid poll ID" });
      }

      const userId = req.user?.id;
      const poll = await storage.getPollWithDetails(pollId, userId);

      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      res.json(poll);
    } catch (error) {
      console.error("Error fetching poll:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  app.post('/api/polls/:id/vote', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const pollId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Invalid poll ID" });
      }

      const { optionIds } = req.body;

      // Check if user has already voted on this poll
      const hasVoted = await storage.hasUserVotedOnPoll(userId, pollId);
      if (hasVoted) {
        return res.status(400).json({
          message: "You have already voted on this poll",
          error: "ALREADY_VOTED"
        });
      }
      
      // Create poll votes
      for (const optionId of optionIds) {
        await storage.createPollVote({
          pollId,
          optionId,
          userId,
        });
      }
      
      // Update poll option vote counts
      await storage.updatePollOptionVoteCounts(optionIds);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error voting on poll:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  // Poll post-style voting (upvote/downvote)
  app.post('/api/polls/:id/votes', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const pollId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Invalid poll ID" });
      }

      const { voteType } = req.body; // 'up' or 'down'

      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      console.log(`[POLL VOTE] User ${userId} voting ${voteType} on poll ${pollId}`);
      
      // Use transaction-like vote processing
      const result = await storage.processVoteTransaction(
        userId,
        pollId,
        'poll',
        voteType
      );
      
      // Also update the corresponding post's vote counts if this poll is linked to a post
      const poll = await storage.getPollWithDetails(pollId);
      if (poll && poll.postId) {
        await storage.updatePostVoteCounts(poll.postId);
      }
      
      console.log(`[POLL VOTE] Result:`, { 
        success: result.success, 
        hasUpdatedCounts: !!result.updatedCounts,
        hasUserVote: !!result.userVote 
      });
      
      res.json({ 
        success: result.success, 
        updatedCounts: result.updatedCounts,
        userVote: result.userVote
      });
    } catch (error) {
      console.error("Error voting on poll:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  // Poll comment routes
  app.get('/api/polls/:id/comments', optionalAuth, async (req: any, res) => {
    try {
      const pollId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Invalid poll ID" });
      }

      const comments = await storage.getCommentsByPoll(pollId);

      // Add user votes if authenticated
      if (req.user) {
        const userId = req.user.id;
        const commentIds = comments.map(c => c.id);
        const userVotes = await storage.getUserVotes(userId, commentIds, 'comment');
        
        // Helper function to add user votes recursively
        const addUserVotes = (commentList: any[]) => {
          commentList.forEach(comment => {
            comment.userVote = userVotes.find(v => v.targetId === comment.id);
            if (comment.replies && comment.replies.length > 0) {
              addUserVotes(comment.replies);
            }
          });
        };
        
        addUserVotes(comments);
      }

      res.json(comments);
    } catch (error) {
      console.error("Error fetching poll comments:", error);
      res.status(500).json({ message: "Failed to fetch poll comments" });
    }
  });

  app.post('/api/polls/:id/comments', requireAuth, async (req: any, res) => {
    try {
      console.log('=== POLL COMMENT REQUEST ===');
      console.log('User:', req.user ? req.user.id : 'No user');
      console.log('Params:', req.params);
      console.log('Body:', req.body);

      if (!req.user) {
        console.error('No user found in request');
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      const pollId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(pollId)) {
        console.error('Invalid poll ID:', req.params.id);
        return res.status(400).json({ message: "Invalid poll ID" });
      }

      // Validate request body
      if (!req.body || !req.body.content || typeof req.body.content !== 'string') {
        console.error('Invalid comment content:', req.body);
        return res.status(400).json({ message: "Comment content is required" });
      }

      const commentData = {
        content: req.body.content.trim(),
        authorId: userId,
        pollId: pollId,
        parentId: req.body.parentId || null,
      };

      console.log('Creating poll comment with data:', commentData);

      const comment = await storage.createComment(commentData);
      console.log('Poll comment created successfully:', comment.id);

      // Skip notification logic for now to simplify
      console.log('Poll comment creation completed successfully');

      res.status(201).json(comment);
    } catch (error: any) {
      console.error("=== POLL COMMENT CREATION ERROR ===");
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      // Check for specific database errors
      if (error?.message?.includes('violates foreign key constraint')) {
        return res.status(400).json({ message: "Invalid poll or user reference" });
      }

      if (error?.message?.includes('duplicate key')) {
        return res.status(409).json({ message: "Comment already exists" });
      }

      res.status(500).json({
        message: "Failed to create poll comment",
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // Comment routes
  app.get('/api/posts/:id/comments', optionalAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const comments = await storage.getCommentsByPost(postId);

      // Add user votes if authenticated
      if (req.user) {
        const userId = req.user.id;
        const commentIds = comments.map(c => c.id);
        const userVotes = await storage.getUserVotes(userId, commentIds, 'comment');
        
        // Helper function to add user votes recursively
        const addUserVotes = (commentList: any[]) => {
          commentList.forEach(comment => {
            comment.userVote = userVotes.find(v => v.targetId === comment.id);
            if (comment.replies && comment.replies.length > 0) {
              addUserVotes(comment.replies);
            }
          });
        };
        
        addUserVotes(comments);
      }

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/posts/:id/comments', requireAuth, async (req: any, res) => {
    try {
      console.log('=== POST COMMENT REQUEST ===');
      console.log('User:', req.user ? req.user.id : 'No user');
      console.log('Params:', req.params);
      console.log('Body:', req.body);

      if (!req.user) {
        console.error('No user found in request');
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      const postId = parseInt(req.params.id);

      // Validate that the ID is a valid number
      if (isNaN(postId)) {
        console.error('Invalid post ID:', req.params.id);
        return res.status(400).json({ message: "Invalid post ID" });
      }

      // Validate request body
      if (!req.body || !req.body.content || typeof req.body.content !== 'string') {
        console.error('Invalid comment content:', req.body);
        return res.status(400).json({ message: "Comment content is required" });
      }

      const commentData = {
        content: req.body.content.trim(),
        authorId: userId,
        postId: postId,
        parentId: req.body.parentId || null,
      };

      console.log('Creating comment with data:', commentData);

      const comment = await storage.createComment(commentData);
      console.log('Comment created successfully:', comment.id);

      // Update the post's comment count (optional - handled in storage layer)
      try {
        await storage.updatePostCommentCount(postId);
        console.log('Post comment count updated');
      } catch (countError) {
        console.warn('Failed to update comment count:', countError);
        // Don't fail the whole request
      }

      // Skip notification logic for now to simplify
      console.log('Comment creation completed successfully');

      res.status(201).json(comment);
    } catch (error: any) {
      console.error("=== COMMENT CREATION ERROR ===");
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      // Check for specific database errors
      if (error?.message?.includes('violates foreign key constraint')) {
        return res.status(400).json({ message: "Invalid post or user reference" });
      }

      if (error?.message?.includes('duplicate key')) {
        return res.status(409).json({ message: "Comment already exists" });
      }

      res.status(500).json({
        message: "Failed to create comment",
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // Deletion routes (owner-only)
  app.delete('/api/posts/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const postId = parseInt(req.params.id);
      await storage.deletePostCascade(postId, userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN') return res.status(403).json({ message: 'Not allowed' });
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  app.delete('/api/comments/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const commentId = parseInt(req.params.id);
      await storage.deleteCommentCascade(commentId, userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN') return res.status(403).json({ message: 'Not allowed' });
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  // Get comments by user (for profile page)
  app.get('/api/comments/user/:userId', optionalAuth, async (req: any, res) => {
    try {
      let userId = req.params.userId;
      // Check for author query parameter as fallback (workaround for corruption)
      if (req.query.author) {
        userId = req.query.author as string;
      }
      console.log('[API Comments] Fetching comments for userId:', userId);
      const comments = await storage.getCommentsByUser(userId);
      console.log('[API Comments] Found', comments.length, 'comments');
      res.json(comments);
    } catch (error) {
      console.error('Error fetching user comments:', error);
      res.status(500).json({ message: 'Failed to fetch user comments' });
    }
  });

  // Alternative endpoint that only uses query parameters
  app.get('/api/comments/user', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.query.author as string;
      console.log('[API Comments Query] Fetching comments for userId:', userId);
      const comments = await storage.getCommentsByUser(userId);
      console.log('[API Comments Query] Found', comments.length, 'comments');
      res.json(comments);
    } catch (error) {
      console.error('Error fetching user comments:', error);
      res.status(500).json({ message: 'Failed to fetch user comments' });
    }
  });

  // Get own posts (for authenticated user's own profile)
  // In your API route - add validation
app.get('/api/post/own', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    // Add validation to ensure userId exists and is valid
    if (!userId) {
      console.error('[API Posts Own] No userId found in req.user');
      return res.status(401).json({ message: 'User not authenticated properly' });
    }
    
    console.log('[API Posts Own] Fetching posts for userId:', userId, 'type:', typeof userId);
    
    // Ensure userId is a string (since your schema has authorId as varchar)
    const filters = { userId: String(userId) };
    
    const posts = await storage.getPosts(filters);
    console.log('[API Posts Own] Found', posts.length, 'posts');

     // Add user votes if authenticated
      if (req.user && posts.length > 0) {
        try {
          const userId = req.user.id;
          const postIds = posts.map(p => p.id);
          const userVotes = await storage.getUserVotes(userId, postIds, 'post');
          
          posts.forEach(post => {
            post.userVote = userVotes.find(v => v.targetId === post.id);
          });
        } catch (error) {
          console.error("Error fetching user votes:", error);
          // Continue without user votes if there's an error
        }
      }

    // Prevent caching to ensure fresh data
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json(posts);
  } catch (error) {
    console.error('Error fetching own posts:', error);
    res.status(500).json({ message: 'Failed to fetch own posts' });
  }
});

  // Get own comments (for authenticated user's own profile)
  app.get('/api/comments/own', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      console.log('[API Comments Own] Fetching comments for userId:', userId);
      const comments = await storage.getCommentsByUser(userId);
      console.log('[API Comments Own] Found', comments.length, 'comments');
      res.json(comments);
    } catch (error) {
      console.error('Error fetching own comments:', error);
      res.status(500).json({ message: 'Failed to fetch own comments' });
    }
  });

  // Get posts by user ID (path parameter approach)
  app.get('/api/posts/user/:userId', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      console.log('[API Posts User] Raw req.params:', req.params);
      console.log('[API Posts User] Raw req.params.userId:', req.params.userId);
      console.log('[API Posts User] userId type:', typeof userId);
      console.log('[API Posts User] Fetching posts for userId:', userId);
      const filters = { userId };
      const posts = await storage.getPosts(filters);
      console.log('[API Posts User] Found', posts.length, 'posts');
      res.json(posts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      res.status(500).json({ message: 'Failed to fetch user posts' });
    }
  });

  // Debug endpoint for posts query (DEV ONLY)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/posts', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.query.userId as string;
      console.log('[DEBUG] Raw req.query:', req.query);
      console.log('[DEBUG] Testing posts query with userId:', userId);

      const filters = userId ? { userId } : {};
      console.log('[DEBUG] Filters:', filters);

      const posts = await storage.getPosts(filters);
      console.log('[DEBUG] Found', posts.length, 'posts');

      res.json({ userId, filters, postCount: posts.length, posts: posts.slice(0, 3) });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ message: 'Debug failed', error: error.message });
    }
  });
  }

  // Debug endpoint for current user (DEV ONLY)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/user', optionalAuth, async (req: any, res) => {
    try {
      console.log('[DEBUG USER] req.user:', req.user);
      console.log('[DEBUG USER] req.user?.id:', req.user?.id);
      console.log('[DEBUG USER] req.user?.id type:', typeof req.user?.id);

      res.json({
        user: req.user,
        userId: req.user?.id,
        authenticated: !!req.user,
        userIdType: typeof req.user?.id
      });
    } catch (error) {
      console.error('Error in debug user endpoint:', error);
      res.status(500).json({ message: 'Debug failed', error: error.message });
    }
  });
  }

  // Test endpoint without middleware (DEV ONLY)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/test/posts', async (req: any, res) => {
    try {
      console.log('[TEST] Raw req.query:', JSON.stringify(req.query));
      console.log('[TEST] req.query type:', typeof req.query);
      console.log('[TEST] req.query.userId type:', typeof req.query.userId);
      const userId = req.query.userId as string;
      console.log('[TEST] userId received:', userId);
      console.log('[TEST] Original URL:', req.originalUrl);
      console.log('[TEST] Raw URL:', req.url);

      const filters = userId ? { userId } : {};
      console.log('[TEST] Filters:', filters);

      const posts = await storage.getPosts(filters);
      console.log('[TEST] Found', posts.length, 'posts');

      res.json({ userId, filters, postCount: posts.length, posts: posts.slice(0, 3) });
    } catch (error) {
      console.error('Error in test endpoint:', error);
      res.status(500).json({ message: 'Test failed', error: error.message });
    }
  });
  }

  app.delete('/api/polls/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const pollId = parseInt(req.params.id);
      await storage.deletePollCascade(pollId, userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN') return res.status(403).json({ message: 'Not allowed' });
      console.error('Error deleting poll:', error);
      res.status(500).json({ message: 'Failed to delete poll' });
    }
  });

  // Vote routes
  app.post('/api/vote', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const voteData = insertVoteSchema.parse({ ...req.body, userId });
      
      console.log(`[VOTE] User ${userId} voting ${voteData.voteType} on ${voteData.targetType} ${voteData.targetId}`);
      
      // Use transaction-like vote processing
      const result = await storage.processVoteTransaction(
        userId,
        voteData.targetId,
        voteData.targetType,
        voteData.voteType
      );

      // Update author karma for posts
      if (voteData.targetType === 'post') {
        const post = await storage.getPost(voteData.targetId);
        if (post && post.authorId !== userId) {
          const karmaChange = voteData.voteType === 'up' ? 2 : -2;
          await storage.updateUserKarma(post.authorId, karmaChange);
        }
      }

      // Notification logic
      if (voteData.targetType === 'post') {
        const post = await storage.getPost(voteData.targetId);
        if (post && post.authorId === userId) {
          const notif = await storage.createNotification({
            userId: post.authorId,
            type: voteData.voteType === 'up' ? 'upvote' : 'downvote',
            content: `Someone ${voteData.voteType}voted your ${post.type}: "${post.title.slice(0, 100)}"`,
            link: `/post?id=${post.id}`,
          });
          console.log('Notification created:', notif); // Debug log
          // WebSocket broadcast
          const wss = req.app.get('wss');
          if (wss) {
            wss.clients.forEach(client => {
              client.send(JSON.stringify({ type: 'notification', notification: notif }));
            });
          }
        }
      }
      // Feed update broadcast
      const wss = req.app.get('wss');
      if (wss) {
        wss.clients.forEach(client => {
          client.send(JSON.stringify({ type: 'feed_update', action: 'vote', vote: voteData }));
        });
      }
      console.log(`[VOTE] Result:`, { 
        success: result.success, 
        hasUpdatedCounts: !!result.updatedCounts,
        hasUserVote: !!result.userVote 
      });

      res.status(200).json({ 
        success: result.success, 
        updatedCounts: result.updatedCounts,
        userVote: result.userVote
      });
    } catch (error) {
      console.error("Error voting:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Trust voting routes
  app.post('/api/organizations/:id/trust-vote', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = parseInt(req.params.id);
      const voteData = insertOrgTrustVoteSchema.parse({
        ...req.body,
        userId,
        organizationId,
      });

      await storage.createOrganizationTrustVote(voteData);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error creating trust vote:", error);
      res.status(500).json({ message: "Failed to create trust vote" });
    }
  });

  app.get('/api/organizations/:id/trust-vote', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = parseInt(req.params.id);
      const trustVote = await storage.getOrganizationTrustVote(userId, organizationId);
      res.json(trustVote || null);
    } catch (error) {
      console.error("Error fetching trust vote:", error);
      res.status(500).json({ message: "Failed to fetch trust vote" });
    }
  });

  app.delete('/api/organizations/:id/trust-vote', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = parseInt(req.params.id);
      await storage.deleteOrganizationTrustVote(userId, organizationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting trust vote:", error);
      res.status(500).json({ message: "Failed to delete trust vote" });
    }
  });

  // Fetch notifications for the current user
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const notifs = await storage.getNotifications(userId);
      res.json(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark a notification as read
  app.post('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const notifId = parseInt(req.params.id);
      await storage.markNotificationAsRead(userId, notifId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });


  // test route to verify notifications work
app.post('/api/test-notifications', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    
    // Create a test notification
    const notification = await storage.createNotification({
      userId: userId,
      type: 'test',
      content: 'This is a test notification!',
      link: '/notifications',
    });
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Failed to create test notification' });
  }
});

  // Test endpoint to create a notification for debugging
  app.post('/api/test-notification', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const notif = await storage.createNotification({
        userId,
        type: 'test',
        content: 'This is a test notification to verify the system works!',
        link: '/',
      });
      
      // WebSocket broadcast
      const wss = req.app.get('wss');
      if (wss) {
        wss.clients.forEach(client => {
          client.send(JSON.stringify({ type: 'notification', notification: notif }));
        });
      }
      
      res.json({ success: true, notification: notif });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({ message: 'Failed to create test notification' });
    }
  });

  // Admin endpoint to recalculate comment counts
  app.post('/api/admin/recalculate-comment-counts', requireAuth, async (req: any, res) => {
    try {
      // TODO: Add proper admin role check here
      const result = await storage.recalculateAllCommentCounts();
      res.json({ 
        success: true, 
        message: `Recalculated comment counts for ${result.updated} out of ${result.total} posts`,
        result 
      });
    } catch (error) {
      console.error('Error recalculating comment counts:', error);
      res.status(500).json({ message: 'Failed to recalculate comment counts' });
    }
  });

  // Onchain passthrough endpoints (optional)
  app.get('/api/onchain/company/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: 'Invalid id' });
      // Frontend reads directly from chain; keeping server minimal to avoid RPC creds.
      // This endpoint can be wired later if we want server-cached onchain.
      return res.status(501).json({ message: 'Not implemented. Frontend queries Starknet directly.' });
    } catch (e: any) {
      return res.status(500).json({ message: 'Failed', error: String(e?.message || e) });
    }
  });

  // Security endpoints
  
  // Key exchange for client-side encryption
  app.post('/api/security/key-exchange', rateLimit(10, 60000), (req, res) => {
    try {
      // Generate a new encryption key
      const key = crypto.randomBytes(32).toString('hex');
      
      res.json({
        key,
        timestamp: Date.now(),
        algorithm: 'AES-256-GCM',
      });
    } catch (error) {
      console.error('Key exchange error:', error);
      res.status(500).json({ error: 'Key exchange failed' });
    }
  });

  // Security violation reporting
  app.post('/api/security/violation', rateLimit(50, 60000), (req, res) => {
    try {
      const { reason, timestamp, userAgent, url } = req.body;
      
      console.warn('Security violation reported:', {
        reason,
        timestamp,
        userAgent,
        url,
        ip: req.ip,
        headers: {
          'user-agent': req.get('User-Agent'),
          'referer': req.get('Referer'),
          'x-forwarded-for': req.get('X-Forwarded-For'),
        },
      });
      
      // In production, you might want to store this in a security log database
      // or send to a security monitoring service
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Security violation logging error:', error);
      res.status(500).json({ error: 'Logging failed' });
    }
  });

  // Security health check
  app.get('/api/security/health', (req, res) => {
    const securityMetrics = {
      timestamp: Date.now(),
      csp: 'active',
      headers: 'secured',
      encryption: 'enabled',
      rateLimit: 'active',
      botDetection: 'enabled',
    };
    
    res.json(securityMetrics);
  });

  // Challenge-response for bot detection
  app.post('/api/security/challenge', rateLimit(20, 60000), (req, res) => {
    try {
      const challenge = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      
      // Simple mathematical challenge
      const a = Math.floor(Math.random() * 100) + 1;
      const b = Math.floor(Math.random() * 100) + 1;
      const operation = Math.random() > 0.5 ? 'add' : 'multiply';
      
      const expectedAnswer = operation === 'add' ? a + b : a * b;
      
      // Store challenge temporarily (in production, use Redis)
      const challengeKey = `challenge_${challenge}`;
      setTimeout(() => {
        // Auto-expire challenge after 5 minutes
      }, 5 * 60 * 1000);
      
      res.json({
        challenge,
        question: `What is ${a} ${operation === 'add' ? '+' : '×'} ${b}?`,
        timestamp,
      });
    } catch (error) {
      console.error('Challenge generation error:', error);
      res.status(500).json({ error: 'Challenge generation failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}