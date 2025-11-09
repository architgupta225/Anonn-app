import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Validate required environment variables for production
 */
function validateProductionEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = [
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DYNAMIC_API_KEY',
      'DYNAMIC_WEBHOOK_SECRET',
      'JWT_SECRET',
      'SESSION_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(', ')}\n` +
        'Please ensure all required environment variables are set.'
      );
    }
  }
}

// Validate environment on config load
validateProductionEnvironment();

// Centralized Cloudflare URL - update this one place for all instances
const CLOUDFLARE_URL = 'https://regulations-did-firm-qualified.trycloudflare.com';

export const CONFIG = {
  // Dynamic Auth Configuration
  DYNAMIC: {
    ENVIRONMENT_ID: process.env.DYNAMIC_ENVIRONMENT_ID || process.env.VITE_DYNAMIC_ENVIRONMENT_ID || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DYNAMIC_ENVIRONMENT_ID must be set in production');
      }
      console.warn('⚠️  Using default DYNAMIC_ENVIRONMENT_ID for development. Set DYNAMIC_ENVIRONMENT_ID in production.');
      return "064b1464-d122-4fea-a966-f560675236c3";
    })(),
    API_KEY: process.env.DYNAMIC_API_KEY,
    JWKS_URL: process.env.DYNAMIC_JWKS_URL || `https://app.dynamic.xyz/api/v0/environments/${process.env.DYNAMIC_ENVIRONMENT_ID || "064b1464-d122-4fea-a966-f560675236c3"}/jwks`,
    WEBHOOK_SECRET: process.env.DYNAMIC_WEBHOOK_SECRET,
  },

  // Supabase Configuration
  DATABASE: {
    URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Server Configuration
  SERVER: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000'),
    CORS_ORIGIN: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173', CLOUDFLARE_URL],
    CLOUDFLARE_URL: CLOUDFLARE_URL,
  },

  // Security - Enhanced configuration
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      return 'dev-jwt-secret-change-in-production';
    })(),
    SESSION_SECRET: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be set in production');
      }
      return 'dev-session-secret-change-in-production';
    })(),
    // Additional security settings
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    ACCOUNT_LOCKOUT_TIME: parseInt(process.env.ACCOUNT_LOCKOUT_TIME || '900000'), // 15 minutes
  },

  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT || '587'),
    SECURE: process.env.EMAIL_SECURE === 'true',
    USER: process.env.EMAIL_USER,
    PASSWORD: process.env.EMAIL_PASSWORD,
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'Anonn',
    FROM_EMAIL: process.env.EMAIL_FROM_EMAIL,
  },

  // Company Verification Configuration
  COMPANY_VERIFICATION: {
    CODE_EXPIRY_MINUTES: parseInt(process.env.COMPANY_VERIFICATION_CODE_EXPIRY || '10'),
    MAX_ATTEMPTS_PER_DAY: parseInt(process.env.COMPANY_VERIFICATION_MAX_ATTEMPTS || '5'),
  },
} as const;

// Validation
function validateConfig() {
  const required = [
    'DYNAMIC.ENVIRONMENT_ID',
    'DATABASE.URL',
  ];

  for (const key of required) {
    const keys = key.split('.');
    let value = CONFIG as any;
    for (const k of keys) {
      value = value[k];
    }
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

// Validate on import
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}
