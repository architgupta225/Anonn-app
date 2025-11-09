import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { CONFIG } from './config';
import * as schema from "@shared/schema";

if (!CONFIG.DATABASE.URL) {
  throw new Error(
    "DATABASE_URL must be set. Please set your Supabase database URL in your environment variables.",
  );
}

// Force IPv4 DNS resolution to avoid IPv6 connection issues
import { setDefaultResultOrder } from 'dns';
try {
  setDefaultResultOrder('ipv4first');
} catch (e) {
  console.warn('Could not set DNS resolution order:', e);
}

// Create the connection with optimized settings
const client = postgres(CONFIG.DATABASE.URL, {
  // Connection pool settings
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
  // SSL settings - handle certificate issues
  ssl: {
    rejectUnauthorized: false
  },
  // Transform settings for better performance
  transform: {
    undefined: null,
  },
});

// Create the database instance
export const db = drizzle(client, { 
  schema,
  logger: CONFIG.SERVER.NODE_ENV === 'development',
});

// Export the client for direct use if needed
export { client };