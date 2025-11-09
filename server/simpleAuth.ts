import { Request, Response, Router } from "express";
import { ethers } from "ethers";
import { nanoid } from "nanoid";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { storage } from "./storage";
import { generateToken } from "./auth";
import type { User } from "@shared/schema";

const router = Router();

/**
 * Generate a nonce for Sign-in with Wallet (SIWW)
 * POST /api/auth/nonce
 * Body: { walletAddress: string }
 * Returns: { nonce: string }
 */
export async function getNonce(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Generate a unique nonce
    const nonce = nanoid(32);

    console.log('[auth/nonce] Generating nonce for wallet:', walletAddress);

    // Check if user exists (try exact match first, then lowercase for Ethereum)
    let user = await storage.getUserByWalletAddress(walletAddress);

    if (!user) {
      // Try lowercase for Ethereum wallets
      const lowerWallet = walletAddress.toLowerCase();
      user = await storage.getUserByWalletAddress(lowerWallet);
    }

    if (!user) {
      // Create new user with this wallet address
      console.log('[auth/nonce] Creating new user for wallet:', walletAddress);
      user = await storage.upsertUser({
        id: nanoid(), // Generate unique user ID
        walletAddress: walletAddress, // Keep original case for Solana
        authNonce: nonce,
        username: null as any,
        allowlisted: true,
        karma: 0,
        postKarma: 0,
        commentKarma: 0,
        awardeeKarma: 0,
        followerCount: 0,
        followingCount: 0,
        isVerified: false,
        isPremium: false,
        isOnline: true,
      } as any);
    } else {
      // Update existing user with new nonce
      console.log('[auth/nonce] Updating nonce for existing user:', user.id);
      user = await storage.upsertUser({
        ...user,
        authNonce: nonce,
      } as any);
    }

    return res.json({ nonce });
  } catch (error) {
    console.error('[auth/nonce] Error:', error);
    console.error('[auth/nonce] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[auth/nonce] Error message:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      error: "Failed to generate nonce",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Verify wallet signature and issue JWT token
 * Supports both Solana (ed25519) and Ethereum (ECDSA) signatures
 * POST /api/auth/verify
 * Body: { walletAddress: string, signature: string, nonce: string }
 * Returns: { token: string, user: User }
 */
export async function verifySignature(req: Request, res: Response) {
  try {
    const { walletAddress, signature, nonce } = req.body;

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({
        error: "Wallet address, signature, and nonce are required"
      });
    }

    console.log('[auth/verify] Verifying signature for wallet:', walletAddress);

    // Get user by wallet address (case-sensitive for Solana, case-insensitive for Ethereum)
    let user = await storage.getUserByWalletAddress(walletAddress);

    // Try lowercase for Ethereum wallets if not found
    if (!user) {
      const lowerWallet = walletAddress.toLowerCase();
      user = await storage.getUserByWalletAddress(lowerWallet);
    }

    if (!user) {
      console.log('[auth/verify] User not found for wallet:', walletAddress);
      return res.status(401).json({ error: "User not found" });
    }

    // Check if nonce matches
    if (!user.authNonce || user.authNonce !== nonce) {
      console.log('[auth/verify] Nonce mismatch for user:', user.id);
      return res.status(401).json({ error: "Invalid or expired nonce" });
    }

    // Construct the message that was signed
    const message = `Sign this message to authenticate with Anonn.\n\nNonce: ${nonce}`;

    try {
      let isValid = false;

      // Try Solana signature verification first (base58 encoded)
      try {
        const publicKey = new PublicKey(walletAddress);
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);

        isValid = nacl.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKey.toBytes()
        );

        if (isValid) {
          console.log('[auth/verify] Solana signature verified successfully for user:', user.id);
        }
      } catch (solanaError) {
        // Not a Solana signature, try Ethereum
        console.log('[auth/verify] Not a Solana signature, trying Ethereum verification');
      }

      // Try Ethereum signature verification if Solana failed
      if (!isValid) {
        try {
          const recoveredAddress = ethers.verifyMessage(message, signature);
          isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();

          if (isValid) {
            console.log('[auth/verify] Ethereum signature verified successfully for user:', user.id);
          }
        } catch (ethError) {
          console.error('[auth/verify] Ethereum verification failed:', ethError);
        }
      }

      if (!isValid) {
        console.log('[auth/verify] Signature verification failed for wallet:', walletAddress);
        return res.status(401).json({ error: "Signature verification failed" });
      }

      // Clear the nonce to prevent replay attacks
      await storage.upsertUser({
        ...user,
        authNonce: null as any,
        isOnline: true, // Mark user as online
      } as any);

      // Generate internal JWT token
      const token = generateToken(user.id);

      // Return token and user info
      return res.json({
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          karma: user.karma,
          isVerified: user.isVerified,
          isPremium: user.isPremium,
        },
      });
    } catch (error) {
      console.error('[auth/verify] Signature verification error:', error);
      return res.status(401).json({ error: "Invalid signature format" });
    }
  } catch (error) {
    console.error('[auth/verify] Error:', error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// Mount route handlers
router.post('/nonce', getNonce);
router.post('/verify', verifySignature);

// Test endpoint to check database connectivity
router.get('/test-db', async (req: Request, res: Response) => {
  try {
    const { storage } = await import('./storage');
    const testWallet = 'test_wallet_' + Date.now();

    console.log('[auth/test-db] Testing database connection...');

    // Try to query a user
    const user = await storage.getUserByWalletAddress(testWallet);
    console.log('[auth/test-db] Query successful, user:', user);

    return res.json({
      success: true,
      message: 'Database connection working',
      userFound: !!user
    });
  } catch (error) {
    console.error('[auth/test-db] Database connection failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

export default router;
