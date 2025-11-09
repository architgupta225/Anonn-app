import { createHash } from 'crypto';

// Platform-specific salt for additional security
const PLATFORM_SALT = process.env.PLATFORM_SALT || 'anonn_anonymous_platform_2024';
const HASH_ROUNDS = 10000;

// Web3/crypto-themed prefixes and terms for username generation
const WEB3_PREFIXES = [
  'anon', 'crypto', 'defi', 'nft', 'dao', 'web3', 'block', 'chain', 'token', 'coin',
  'wallet', 'miner', 'validator', 'node', 'peer', 'hash', 'key', 'sign', 'verify', 'mint',
  'swap', 'yield', 'stake', 'liquidity', 'governance', 'protocol', 'smart', 'contract', 'dapp', 'metaverse',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'
];

const WEB3_TERMS = [
  'whale', 'diamond', 'hodler', 'shiller', 'fudder', 'degen', 'ape', 'ser', 'wagmi', 'ngmi',
  'moon', 'mars', 'lambo', 'rocket', 'diamond', 'gem', 'based', 'chad', 'virgin', 'normie',
  'maxi', 'fren', 'anon', 'doxxed', 'rekt', 'pump', 'dump', 'fomo', 'fud', 'shill',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'
];

/**
 * Generate a completely random username
 */
export function generateUsername(email: string): string {
  // Use email as seed for consistent generation per user, but make it random
  const seed = email.toLowerCase() + PLATFORM_SALT;
  let hash = seed;
  
  // Multiple hash rounds for security
  for (let i = 0; i < HASH_ROUNDS; i++) {
    hash = createHash('sha256').update(hash).digest('hex');
  }
  
  // Use hash to select random web3 prefix and term
  const prefixIndex = parseInt(hash.substring(0, 8), 16) % WEB3_PREFIXES.length;
  const termIndex = parseInt(hash.substring(8, 16), 16) % WEB3_TERMS.length;
  
  // Add random number for uniqueness
  const randomNum = parseInt(hash.substring(16, 20), 16) % 9999;
  
  const prefix = WEB3_PREFIXES[prefixIndex];
  const term = WEB3_TERMS[termIndex];
  
  return `${prefix}_${term}${randomNum}`;
}

/**
 * Generate first name from email (before @ symbol)
 */
export function generateFirstName(email: string): string {
  const localPart = email.split('@')[0];
  
  // Extract potential name parts
  const nameParts = localPart.split(/[._-]/);
  
  // Take the first part and capitalize it
  const firstName = nameParts[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

/**
 * Generate last name from email (before @ symbol)
 */
export function generateLastName(email: string): string {
  const localPart = email.split('@')[0];
  
  // Extract potential name parts
  const nameParts = localPart.split(/[._-]/);
  
  // Take the second part if it exists, otherwise use first part
  const lastName = nameParts.length > 1 ? nameParts[1] : nameParts[0];
  return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
}

/**
 * Generate all anonymous profile data from email
 */
export function generateAnonymousProfile(email: string) {
  return {
    firstName: generateFirstName(email),
    lastName: generateLastName(email),
    username: generateUsername(email),
  };
}

/**
 * Validate if a username was generated from an email
 */
export function validateUsername(email: string, username: string): boolean {
  const generatedUsername = generateUsername(email);
  return generatedUsername === username;
}
