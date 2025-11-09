import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { CONFIG } from "./config";
import { bowls } from "@shared/schema";
import { sql } from "drizzle-orm";
import { securityHeaders, sanitizeInputs, validateUrlInputs, createRateLimit } from "./middleware/security";
import { 
  encryptPayload, 
  deviceFingerprinting, 
  botDetection, 
  sessionSecurity, 
  advancedBruteForce,
  progressiveSpeedLimit,
  advancedCSP,
  antiTampering
} from "./middleware/advanced-security";
import { WebSocketManager } from "./websocket";

async function seedTestData() {
  // Check if bowls exist
  const bowlsExist = await db.select({ count: sql<number>`count(*)` }).from(bowls);
  if (bowlsExist[0]?.count > 0) {
    console.log("Bowls already exist, skipping seed");
    return;
  }

  console.log("No bowls found, seeding data...");

  // Create test users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    users.push(await storage.upsertUser({
      id: `testuser${i}`,
      username: `testuser${i}`,
      walletAddress: `testWallet${i}`,
      karma: 0,
      postKarma: 0,
      commentKarma: 0,
      awardeeKarma: 0,
      followerCount: 0,
      followingCount: 0,
      isVerified: false,
      isPremium: false,
      isOnline: false,
    } as any));
  }

  // Create organizations
  const orgs = [];
  for (let i = 1; i <= 3; i++) {
    orgs.push(await storage.createOrganization({
      name: `Test Organization ${i}`,
      description: `This is a test organization #${i}.`,
      website: `https://org${i}.com`,
      createdBy: users[0].id,
    }));
  }

  // Create predefined bowls (Web3-focused communities) - no user creator needed
  const createdBowls = [];
  
  // Web3 Industries
  const web3IndustryBowls = [
    { name: "DeFi", description: "Decentralized Finance protocols, yield farming, and DeFi strategies", category: "industries" },
    { name: "NFTs", description: "Non-fungible tokens, digital art, and NFT trading", category: "industries" },
    { name: "Gaming", description: "Web3 gaming, play-to-earn, and blockchain games", category: "industries" },
    { name: "Infrastructure", description: "Blockchain infrastructure, nodes, and developer tools", category: "industries" },
    { name: "Privacy", description: "Privacy-focused blockchain and zero-knowledge proofs", category: "industries" },
    { name: "Layer 2", description: "Layer 2 scaling solutions and rollups", category: "industries" },
    { name: "Cross-Chain", description: "Cross-chain bridges and interoperability", category: "industries" },
    { name: "DAO", description: "Decentralized Autonomous Organizations and governance", category: "industries" },
  ];

  // Web3 Job Groups
  const web3JobGroupBowls = [
    { name: "Smart Contract Development", description: "Solidity, smart contract security, and blockchain development", category: "job-groups" },
    { name: "Frontend Development", description: "Web3 frontend development, dApp interfaces, and wallet integration", category: "job-groups" },
    { name: "Backend Development", description: "Web3 backend, API development, and blockchain integration", category: "job-groups" },
    { name: "DevOps", description: "Web3 infrastructure, deployment, and blockchain operations", category: "job-groups" },
    { name: "Marketing", description: "Web3 marketing, community building, and growth strategies", category: "job-groups" },
    { name: "Sales", description: "Web3 sales, business development, and partnerships", category: "job-groups" },
    { name: "Product Management", description: "Web3 product strategy, roadmap, and user experience", category: "job-groups" },
    { name: "Design", description: "Web3 UX/UI design, dApp interfaces, and brand design", category: "job-groups" },
    { name: "Research", description: "Web3 research, tokenomics, and market analysis", category: "job-groups" },
    { name: "Legal", description: "Web3 legal, compliance, and regulatory discussions", category: "job-groups" },
  ];



  // Web3 Communities
  const web3CommunityBowls = [
    { name: "General", description: "General Web3 discussions and community chat", category: "user-moderated" },
    { name: "Newbies", description: "Web3 beginners and onboarding discussions", category: "user-moderated" },
    { name: "Developers", description: "Web3 developer community and technical discussions", category: "user-moderated" },
    { name: "Investors", description: "Web3 investment strategies and portfolio discussions", category: "user-moderated" },
    { name: "Entrepreneurs", description: "Web3 startups, entrepreneurship, and business ideas", category: "user-moderated" },
    { name: "Artists", description: "Web3 artists, creators, and NFT creators community", category: "user-moderated" },
    { name: "Gamers", description: "Web3 gaming community and play-to-earn discussions", category: "user-moderated" },
    { name: "Traders", description: "Crypto trading community and market discussions", category: "user-moderated" },
    { name: "Researchers", description: "Web3 research community and academic discussions", category: "user-moderated" },
    { name: "Events", description: "Web3 events, conferences, and meetups", category: "user-moderated" },
    { name: "Jobs", description: "Web3 job opportunities and career discussions", category: "user-moderated" },
    { name: "Networking", description: "Web3 professional networking and connections", category: "user-moderated" },
    { name: "Alpha", description: "Alpha calls, insights, and exclusive information", category: "user-moderated" },
    { name: "Shitposting", description: "Web3 shitposting and community humor", category: "user-moderated" },
  ];

  // Create all bowls (predefined - no creator needed)
  const allBowls = [...web3IndustryBowls, ...web3JobGroupBowls, ...web3CommunityBowls];
  
  for (const bowlData of allBowls) {
    // Insert directly into database with SQL
    const [bowl] = await db.insert(bowls).values({
      name: bowlData.name,
      description: bowlData.description,
      category: bowlData.category,
      memberCount: 0,
      createdBy: null, // No creator for predefined bowls
    }).returning();
    createdBowls.push(bowl);
  }

  // Create posts (mix of reviews and discussions)
  for (let i = 1; i <= 10; i++) {
    const isReview = i % 2 === 0;
    const post = await storage.createPost({
      title: isReview ? `Test Review ${i}` : `Test Discussion ${i}`,
      content: isReview ? `This is a review content for post #${i}.` : `This is a discussion content for post #${i}.`,
      type: isReview ? "review" : "discussion",
      authorId: users[i % users.length].id,
      organizationId: isReview ? orgs[i % orgs.length].id : null,
      bowlId: !isReview ? createdBowls[i % createdBowls.length].id : null,
      sentiment: isReview ? (["positive", "neutral", "negative"][(i % 3)] as any) : null,
      isAnonymous: i % 3 === 0,
    });
    // Add comments
    for (let j = 1; j <= 2; j++) {
      await storage.createComment({
        postId: post.id,
        authorId: users[(i + j) % users.length].id,
        content: `Test comment ${j} on post #${i}`,
      });
    }
    // Add votes (likes/dislikes)
    for (let k = 0; k < 3; k++) {
      await storage.createVote({
        targetId: post.id,
        targetType: "post",
        userId: users[(i + k) % users.length].id,
        voteType: k % 2 === 0 ? "up" : "down",
      });
    }
  }
}

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173',
    CONFIG.SERVER.CLOUDFLARE_URL,
    'http://10.10.1.93:3000',
    'http://10.10.1.93:5173',
    ...(Array.isArray(CONFIG.SERVER.CORS_ORIGIN) ? CONFIG.SERVER.CORS_ORIGIN : [CONFIG.SERVER.CORS_ORIGIN])
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Dynamic-Signature'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

console.log('🔧 Server Configuration:');
console.log('  Environment:', CONFIG.SERVER.NODE_ENV);
console.log('  Port:', CONFIG.SERVER.PORT);
console.log('  CORS Origins:', corsOptions.origin);
console.log('  Dynamic Environment ID:', CONFIG.DYNAMIC.ENVIRONMENT_ID);
console.log('  Database URL:', CONFIG.DATABASE.URL ? 'Connected' : 'Not configured');

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Enhanced security hardening
app.disable('x-powered-by');

// Apply comprehensive security headers
app.use(securityHeaders);

// Advanced security features
app.use(deviceFingerprinting);

// Apply bot detection only to non-API routes for now
app.use((req, res, next) => {
  if (req.path.startsWith('/api/posts') || req.path.startsWith('/api/users') || req.path.startsWith('/api/bowls') || req.path.startsWith('/api/organizations')) {
    // Skip bot detection for main API endpoints to avoid blocking legitimate requests
    return next();
  }
  botDetection(req, res, next);
});

// app.use(sessionSecurity); // Temporarily disabled for testing
app.use(advancedCSP);
app.use(antiTampering);

// Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: false, // We handle CSP in advancedCSP
  crossOriginEmbedderPolicy: false, // for dev/vite compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Dynamic resources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// Trust proxy for rate limiting and real IPs (needed for Cloudflare and production)
app.set('trust proxy', 1);

// Prevent HTTP parameter pollution (temporarily disabled for testing)
// app.use(hpp());

// Body parsers with strict limits and security
app.use(express.json({ 
  limit: '50kb',
  verify: (req, res, buf) => {
    // Verify JSON doesn't contain null bytes or other suspicious content
    const rawBody = buf.toString();
    if (rawBody.includes('\0')) {
      throw new Error('Invalid JSON: contains null bytes');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '50kb',
  parameterLimit: 100 // Limit number of parameters
}));
app.use(cookieParser());

// Apply input sanitization to all routes
app.use(sanitizeInputs);

// Advanced progressive speed limiting
app.use(progressiveSpeedLimit);

// Apply payload encryption to sensitive routes (excluding /api/auth for wallet authentication)
app.use('/api/users', encryptPayload);
app.use('/api/admin', encryptPayload);

// Enhanced API rate limiting with different tiers
const strictApiLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: CONFIG.SERVER.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
  keyGenerator: (req) => `${req.ip}-${(req as any).user?.id || 'anonymous'}`
});

const generalApiLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: CONFIG.SERVER.NODE_ENV === 'development' ? 2000 : 300, // Higher limit in development
  keyGenerator: (req) => `${req.ip}-general`
});

// Apply brute force protection to auth endpoints
app.use('/api/auth/login', advancedBruteForce.prevent);
app.use('/api/auth/register', advancedBruteForce.prevent);

// Apply strict limits to write operations
app.use('/api/posts', strictApiLimiter);
app.use('/api/comments', strictApiLimiter);
app.use('/api/votes', strictApiLimiter);
app.use('/api/organizations', strictApiLimiter);

// General rate limiting for all API routes
app.use('/api', generalApiLimiter);

// Minimal, privacy-preserving API logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const auth = (req.headers?.authorization || '').slice(0, 24);
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms auth=${auth ? 'yes' : 'no'}`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize WebSocket server
  try {
    const wsManager = new WebSocketManager(server);
    app.set('wss', wsManager.getWss());
    log('WebSocket server attached to app');
    
    // Add error handling for the server
    server.on('error', (error) => {
      log('HTTP server error:', error instanceof Error ? error.message : String(error));
      // Don't crash on server errors
    });
    
    // Add error handling for WebSocket upgrade requests
    server.on('upgrade', (request, socket, head) => {
      // Only allow WebSocket upgrades to our specific path
      if (request.url === '/ws') {
        // Let the WebSocket server handle this
        return;
      }
      
      // Reject other upgrade requests
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
    });
    
  } catch (error) {
    log('Failed to initialize WebSocket server:', error instanceof Error ? error.message : String(error));
    log('Continuing without WebSocket support');
    app.set('wss', null);
  }

  // Enhanced error handling middleware - prevent information disclosure
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log full error details for debugging (server-side only)
    console.error('API Error:', {
      status,
      message: err.message,
      stack: CONFIG.SERVER.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send sanitized error response to client
    let message = "Internal Server Error";
    
    // Only expose specific error types in production
    if (status < 500) {
      // Client errors (4xx) - safe to expose
      message = err.message || "Bad Request";
    } else if (CONFIG.SERVER.NODE_ENV === 'development') {
      // Development mode - show full error
      message = err.message || "Internal Server Error";
    }
    
    // Remove any sensitive information from error messages
    message = message.replace(/password|token|secret|key|private/gi, '[REDACTED]');

    res.status(status).json({ 
      error: message,
      code: status
    });
  });

  // Secure health check endpoint (no sensitive information)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });

  // Seed test data in development only
  if (CONFIG.SERVER.NODE_ENV === "development") {
    try {
      await seedTestData();
      log("Development data seeding completed");
    } catch (error: any) {
      log(`Database connection failed, skipping seed data: ${error.message}`);
    }
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = CONFIG.SERVER.PORT;
  const host = CONFIG.SERVER.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  
  server.listen(port, host, () => {
    log(`🚀 Server running on ${host}:${port} in ${CONFIG.SERVER.NODE_ENV} mode`);
    if (CONFIG.SERVER.NODE_ENV === 'development') {
      log(`📱 Client: http://localhost:${port}`);
      log(`🔗 API: http://localhost:${port}/api`);
    }
  });
})();
