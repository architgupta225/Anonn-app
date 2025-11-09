import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Local development auth setup
export function getLocalSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-not-for-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local development
      maxAge: sessionTtl,
    },
  });
}

// Create a local dev user
const LOCAL_DEV_USER = {
  id: "local-dev-user",
  email: "dev@glassdoor.local",
  firstName: "Dev",
  lastName: "User",
  profileImageUrl: null,
};

export async function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getLocalSession());

  // Ensure local dev user exists
  await storage.upsertUser(LOCAL_DEV_USER);

  // Local login route - auto-login for development
  app.get("/api/login", async (req: any, res) => {
    req.session.user = {
      claims: {
        sub: LOCAL_DEV_USER.id,
        email: LOCAL_DEV_USER.email,
        first_name: LOCAL_DEV_USER.firstName,
        last_name: LOCAL_DEV_USER.lastName,
        profile_image_url: LOCAL_DEV_USER.profileImageUrl,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      }
    };
    res.redirect("/");
  });

  // Local logout route
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isLocalAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Set user for compatibility with existing code
  req.user = req.session.user;
  req.isAuthenticated = () => true;
  
  next();
}; 