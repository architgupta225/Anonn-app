import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth, isLocalAuthenticated } from "./localAuth";
import {
  insertOrganizationSchema,
  insertBowlSchema,
  insertPostSchema,
  insertCommentSchema,
  insertVoteSchema,
  insertBowlMembershipSchema,
  insertOrgTrustVoteSchema,
} from "@shared/schema";
import { hashPassword, comparePassword, generateToken } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - use local auth for development
  const isDevEnvironment = process.env.NODE_ENV === "development";
  if (isDevEnvironment) {
    await setupLocalAuth(app);
  } else {
    await setupAuth(app);
  }
  
  // Choose auth middleware based on environment
  const authMiddleware = isDevEnvironment ? isLocalAuthenticated : isAuthenticated;

  // Standard Authentication Routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const userData = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        karma: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = await storage.upsertUser(userData);
      const token = generateToken(user.id);
      
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = generateToken(user.id);
      
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: "Logged out successfully" });
  });

  // Get current user (check both standard auth and local/replit auth)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // First try standard auth with cookie token
      const token = req.cookies?.auth_token;
      if (token) {
        const { verifyToken } = await import("./auth");
        const payload = verifyToken(token);
        if (payload) {
          const user = await storage.getUser(payload.sub);
          if (user) {
            return res.json(user);
          }
        }
      }
      
      // Fallback to existing auth middleware
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(401).json({ message: "Unauthorized" });
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

  app.get('/api/organizations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganizationWithStats(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.get('/api/organizations/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const organizations = await storage.searchOrganizations(query);
      res.json(organizations);
    } catch (error) {
      console.error("Error searching organizations:", error);
      res.status(500).json({ message: "Failed to search organizations" });
    }
  });

  app.get('/api/organizations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganizationWithStats(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post('/api/organizations', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgData = insertOrganizationSchema.parse({ ...req.body, createdBy: userId });
      const organization = await storage.createOrganization(orgData);
      res.status(201).json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Bowl routes
  app.get('/api/bowls', async (req, res) => {
    try {
      const bowls = await storage.getBowls();
      res.json(bowls);
    } catch (error) {
      console.error("Error fetching bowls:", error);
      res.status(500).json({ message: "Failed to fetch bowls" });
    }
  });

  app.get('/api/bowls/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bowl = await storage.getBowl(id);
      if (!bowl) {
        return res.status(404).json({ message: "Bowl not found" });
      }
      res.json(bowl);
    } catch (error) {
      console.error("Error fetching bowl:", error);
      res.status(500).json({ message: "Failed to fetch bowl" });
    }
  });

  app.get('/api/bowls/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bowl = await storage.getBowl(id);
      if (!bowl) {
        return res.status(404).json({ message: "Bowl not found" });
      }
      res.json(bowl);
    } catch (error) {
      console.error("Error fetching bowl:", error);
      res.status(500).json({ message: "Failed to fetch bowl" });
    }
  });

  app.post('/api/bowls', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bowlData = insertBowlSchema.parse({ ...req.body, createdBy: userId });
      const bowl = await storage.createBowl(bowlData);
      res.status(201).json(bowl);
    } catch (error) {
      console.error("Error creating bowl:", error);
      res.status(500).json({ message: "Failed to create bowl" });
    }
  });

  app.post('/api/bowls/:id/join', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bowlId = parseInt(req.params.id);
      const membership = await storage.joinBowl({ userId, bowlId });
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error joining bowl:", error);
      res.status(500).json({ message: "Failed to join bowl" });
    }
  });

  app.delete('/api/bowls/:id/leave', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bowlId = parseInt(req.params.id);
      await storage.leaveBowl(userId, bowlId);
      res.status(204).send();
    } catch (error) {
      console.error("Error leaving bowl:", error);
      res.status(500).json({ message: "Failed to leave bowl" });
    }
  });

  app.get('/api/user/bowls', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await storage.getUserBowlMemberships(userId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching user bowls:", error);
      res.status(500).json({ message: "Failed to fetch user bowls" });
    }
  });

  // Post routes
  app.get('/api/posts', async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.organizationId) {
        filters.organizationId = parseInt(req.query.organizationId as string);
      }
      if (req.query.bowlId) {
        filters.bowlId = parseInt(req.query.bowlId as string);
      }
      if (req.query.type) {
        filters.type = req.query.type as string;
      }

      const posts = await storage.getPosts(filters);
      
      // Add user votes if authenticated
      if (req.user && posts.length > 0) {
        try {
          const userId = (req as any).user.claims.sub;
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

      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Add user vote if authenticated
      if (req.user) {
        const userId = (req as any).user.claims.sub;
        post.userVote = await storage.getVote(userId, id, 'post');
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post('/api/posts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postData = insertPostSchema.parse({ ...req.body, authorId: userId });
      
      const post = await storage.createPost(postData);
      
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

  // Comment routes
  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPost(postId);

      // Add user votes if authenticated
      if (req.user) {
        const userId = (req as any).user.claims.sub;
        const commentIds = comments.map(c => c.id);
        const userVotes = await storage.getUserVotes(userId, commentIds, 'comment');
        
        comments.forEach(comment => {
          comment.userVote = userVotes.find(v => v.targetId === comment.id);
        });
      }

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/posts/:id/comments', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.id);
      const commentData = insertCommentSchema.parse({ ...req.body, authorId: userId, postId });
      
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Vote routes
  app.post('/api/vote', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const voteData = insertVoteSchema.parse({ ...req.body, userId });
      
      // Check if user already voted
      const existingVote = await storage.getVote(userId, voteData.targetId, voteData.targetType);
      
      if (existingVote) {
        if (existingVote.voteType === voteData.voteType) {
          // Remove vote if same type
          await storage.deleteVote(userId, voteData.targetId, voteData.targetType);
        } else {
          // Delete old vote and create new one
          await storage.deleteVote(userId, voteData.targetId, voteData.targetType);
          await storage.createVote(voteData);
        }
      } else {
        // Create new vote
        await storage.createVote(voteData);
      }

      // Update vote counts and karma
      if (voteData.targetType === 'post') {
        await storage.updatePostVoteCounts(voteData.targetId);
        
        // Update author karma
        const post = await storage.getPost(voteData.targetId);
        if (post) {
          const karmaChange = voteData.voteType === 'up' ? 2 : -2;
          await storage.updateUserKarma(post.authorId, karmaChange);
        }
      } else if (voteData.targetType === 'comment') {
        await storage.updateCommentVoteCounts(voteData.targetId);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error voting:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Trust voting routes
  app.post('/api/organizations/:id/trust-vote', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/organizations/:id/trust-vote', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      const trustVote = await storage.getOrganizationTrustVote(userId, organizationId);
      res.json(trustVote || null);
    } catch (error) {
      console.error("Error fetching trust vote:", error);
      res.status(500).json({ message: "Failed to fetch trust vote" });
    }
  });

  app.delete('/api/organizations/:id/trust-vote', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      await storage.deleteOrganizationTrustVote(userId, organizationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting trust vote:", error);
      res.status(500).json({ message: "Failed to delete trust vote" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
