import { Router, Request, Response } from 'express';
import { companyVerificationService } from './companyVerificationService';
// ZK OAuth providers removed - using Phantom wallet only
// import { ZKProviders } from './zkOAuthProviders';
import { EphemeralKeyService } from './ephemeralKeyService';
import { requireAuth } from './auth';

// Temporary empty providers object
const ZKProviders: Record<string, any> = {};

const router = Router();

// Test route to verify ZK routes are working
router.get('/test', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ZK verification routes are working!',
    timestamp: new Date().toISOString(),
    availableProviders: Object.keys(ZKProviders),
  });
});

// Get available ZK providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = companyVerificationService.getAvailableZKProviders();
    res.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('Error getting ZK providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ZK providers',
    });
  }
});

// Initiate ZK verification (requires auth)
router.post('/initiate', requireAuth, async (req: any, res: Response) => {
  try {
    const { userId, provider, redirectUrl } = req.body;

    console.log('🔍 ZK Verification Debug:', {
      userId,
      provider,
      redirectUrl,
      availableProviders: Object.keys(ZKProviders),
      providerExists: ZKProviders.hasOwnProperty(provider),
      providerValue: ZKProviders[provider]
    });

    if (!userId || !provider) {
      return res.status(400).json({
        success: false,
        message: 'userId and provider are required',
      });
    }

    // Validate provider
    if (!ZKProviders[provider]) {
      console.log('❌ Provider validation failed:', {
        requestedProvider: provider,
        availableProviders: Object.keys(ZKProviders)
      });
      return res.status(400).json({
        success: false,
        message: 'Unsupported ZK provider',
      });
    }

    const result = await companyVerificationService.initiateZKVerification({
      userId,
      provider,
      redirectUrl,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.message,
      ephemeralKeyId: result.ephemeralKeyId,
      ephemeralKey: result.ephemeralKey ? {
        publicKey: result.ephemeralKey.publicKey.toString(),
        ephemeralPubkeyHash: result.ephemeralKey.ephemeralPubkeyHash.toString(),
        expiry: result.ephemeralKey.expiry.toISOString(),
      } : undefined,
    });
  } catch (error) {
    console.error('Error initiating ZK verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate ZK verification',
    });
  }
});

// Legacy confirm ZK verification (server-side flow)
router.post('/confirm-legacy', async (req: Request, res: Response) => {
  try {
    const { userId, ephemeralKeyId, proof, proofArgs } = req.body;

    if (!userId || !ephemeralKeyId || !proof || !proofArgs) {
      return res.status(400).json({
        success: false,
        message: 'userId, ephemeralKeyId, proof, and proofArgs are required',
      });
    }

    // Convert proof from array to Uint8Array if needed
    const proofUint8Array = proof instanceof Uint8Array ? proof : new Uint8Array(proof);

    const result = await companyVerificationService.confirmZKVerification({
      userId,
      ephemeralKeyId,
      proof: proofUint8Array,
      proofArgs,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error confirming ZK verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm ZK verification',
    });
  }
});

// Confirm ZK verification (client-side flow, requires auth)
router.post('/confirm', requireAuth, async (req: any, res: Response) => {
  try {
    const { provider, domain, email, idToken, zkProof } = req.body;
    const userId = req.user?.id; // Use authenticated user's ID

    console.log('ZK confirmation request:', {
      userId,
      authenticatedUserId: req.user?.id,
      userObject: req.user,
      provider,
      domain,
      email,
      hasIdToken: !!idToken,
      hasZkProof: !!zkProof,
      authHeader: req.headers.authorization
    });

    if (!userId || !provider || !domain || !email) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: userId=${!!userId}, provider=${!!provider}, domain=${!!domain}, email=${!!email}`,
      });
    }

    // Verify the ID token (simplified for demo)
    if (idToken) {
      try {
        const [, payloadB64] = idToken.split('.');
        const payload = JSON.parse(atob(payloadB64));
        
        // Basic validation
        // For regular Gmail accounts, hd field is undefined, so we need to be more flexible
        const hdMismatch = payload.hd && payload.hd !== domain;
        const emailMismatch = payload.email !== email;

        if (emailMismatch || hdMismatch) {
          // For Gmail accounts without hd field, validate email domain matches
          if (!payload.hd && domain && (domain === 'gmail.com' || domain.endsWith('.gmail.com'))) {
            const emailDomain = payload.email.split('@')[1]?.toLowerCase();
            if (emailDomain !== domain && emailDomain !== 'gmail.com') {
              return res.status(400).json({
                success: false,
                message: 'ID token validation failed - domain mismatch',
              });
            }
          } else if (hdMismatch || emailMismatch) {
            return res.status(400).json({
              success: false,
              message: 'ID token validation failed',
            });
          }
        }
        
        console.log('ID token validated for:', payload.email);
      } catch (error) {
        console.error('ID token parsing error:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid ID token format',
        });
      }
    }

    // For demo purposes, we'll simulate ZK proof verification
    // In a real implementation, this would verify the actual ZK proof
    console.log('Simulating ZK proof verification...');
    
    // Store verification result
    const result = await companyVerificationService.storeZKVerification({
      userId,
      provider,
      domain,
      email,
      zkProof: zkProof || 'demo-proof',
      verificationMethod: 'zk-proof',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: `Successfully verified company email for ${domain}`,
      domain,
      companyName: domain,
      verificationMethod: 'zk-proof',
    });
  } catch (error) {
    console.error('Error confirming ZK verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm ZK verification',
    });
  }
});

// Check ZK verification availability for a domain
router.get('/availability/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required',
      });
    }

    const isAvailable = await companyVerificationService.isZKVerificationAvailable(domain);

    res.json({
      success: true,
      domain,
      zkVerificationAvailable: isAvailable,
    });
  } catch (error) {
    console.error('Error checking ZK verification availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ZK verification availability',
    });
  }
});

// OAuth callback handler for Google
router.get('/oauth/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect('/settings?zk_error=' + encodeURIComponent(error as string));
    }

    if (!code || !state) {
      return res.redirect('/settings?zk_error=missing_code_or_state');
    }

    // Handle OAuth callback - this would be implemented in the frontend
    // For now, redirect to frontend with the code and state
    const redirectUrl = `/settings?zk_provider=google&code=${code}&state=${state}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    res.redirect('/settings?zk_error=oauth_callback_failed');
  }
});


// Get ephemeral key status
router.get('/ephemeral-key/:keyId/status', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'Key ID is required',
      });
    }

    const ephemeralKey = await EphemeralKeyService.retrieveEphemeralKey(keyId);

    if (!ephemeralKey) {
      return res.json({
        success: true,
        keyExists: false,
        message: 'Ephemeral key not found',
      });
    }

    const keyInfo = EphemeralKeyService.getKeyExpiryInfo(ephemeralKey);

    res.json({
      success: true,
      keyExists: true,
      isValid: keyInfo.isExpired === false,
      expiresAt: keyInfo.expiresAt.toISOString(),
      expiresIn: keyInfo.expiresIn,
      isExpired: keyInfo.isExpired,
    });
  } catch (error) {
    console.error('Error getting ephemeral key status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ephemeral key status',
    });
  }
});

// Health check for ZK services
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if ZK services are available
    const providers = companyVerificationService.getAvailableZKProviders();

    res.json({
      success: true,
      status: 'healthy',
      zkEnabled: true,
      providersCount: providers.length,
      providers: providers.map(p => ({ id: p.id, name: p.name })),
    });
  } catch (error) {
    console.error('ZK health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'ZK services unavailable',
    });
  }
});

export default router;
