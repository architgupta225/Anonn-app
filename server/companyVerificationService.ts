import { db } from './db';
import { storage } from './storage';
import { users, companyVerifications, companyDomains, type CompanyVerification } from '../shared/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import {
  sendCompanyVerificationEmail,
  generateVerificationCode,
  extractDomain,
  isCompanyDomain,
  isValidEmail
} from './emailService';
import { zkVerificationService } from './zkVerificationService';
import { ZKCircuitHelper } from './zkCircuitHelper';
import { EphemeralKeyService } from './ephemeralKeyService';
// ZK OAuth providers removed - using Phantom wallet only
// import { ZKProviders, googleZKProvider, microsoftZKProvider } from './zkOAuthProviders';
import { EphemeralKey } from '../shared/schema';
import { CONFIG } from './config';
import crypto from 'crypto';

// Temporary empty providers object
const ZKProviders: Record<string, any> = {};

export interface CompanyVerificationRequest {
  userId: string;
  email: string;
  useZKProof?: boolean; // Whether to use ZK proof verification
}

export interface CompanyVerificationConfirm {
  userId: string;
  email: string;
  code: string;
  zkProof?: string; // Optional ZK proof data
}

export interface ZKVerificationRequest {
  userId: string;
  provider: 'google-oauth' | 'microsoft-oauth';
  redirectUrl?: string;
}

export interface ZKVerificationConfirm {
  userId: string;
  ephemeralKeyId: string;
  proof: Uint8Array;
  proofArgs: Record<string, any>;
}

export interface CompanyDomainMapping {
  domain: string;
  companyName: string;
  logo?: string;
}

export class CompanyVerificationService {
  
  // Step 1: Initiate verification by sending email code
  async initiateVerification(request: CompanyVerificationRequest): Promise<{ success: boolean; message: string }> {
    try {
      const { userId, email } = request;

      // Validate email format
      if (!isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Extract domain and validate it's a company domain
      const domain = extractDomain(email);
      if (!isCompanyDomain(domain)) {
        return { success: false, message: 'Personal email domains are not allowed. Please use your company email.' };
      }

      // Check if user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        return { success: false, message: 'User not found' };
      }

      // Check if user already has a verified company email
      if (user[0].isCompanyVerified) {
        return { success: false, message: 'You already have a verified company email' };
      }

      // Check rate limiting - prevent too many attempts
      if (user[0].verificationCodeExpiresAt && user[0].verificationCodeExpiresAt > new Date()) {
        const minutesLeft = Math.ceil((user[0].verificationCodeExpiresAt.getTime() - new Date().getTime()) / (1000 * 60));
        return {
          success: false,
          message: `Please wait ${minutesLeft} minutes before requesting another verification code.`
        };
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + CONFIG.COMPANY_VERIFICATION.CODE_EXPIRY_MINUTES);

      // Get company name from domain mapping
      const companyMapping = await this.getCompanyNameFromDomain(domain);
      const companyName = companyMapping?.companyName || this.generateCompanyNameFromDomain(domain);

      // Store verification code in users table
      await db
        .update(users)
        .set({
          companyEmail: email,
          companyDomain: domain,
          companyName: companyName,
          verificationCode: verificationCode,
          verificationCodeExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Send verification email
      const emailSent = await sendCompanyVerificationEmail(email, verificationCode, companyName);
      
      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email. Please try again later.' };
      }

      return { 
        success: true, 
        message: `Verification code sent to ${email}. Please check your email and enter the code to complete verification.` 
      };

    } catch (error) {
      console.error('Error initiating company verification:', error);
      return { success: false, message: 'An error occurred. Please try again later.' };
    }
  }

  // Step 2: Confirm verification with code and optional ZK proof
  async confirmVerification(request: CompanyVerificationConfirm): Promise<{ success: boolean; message: string; zkProofHash?: string }> {
    try {
      const { userId, email, code, zkProof } = request;

      // Find the user with the verification code
      const userRecord = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.companyEmail, email),
            eq(users.verificationCode, code)
          )
        )
        .limit(1);

      if (userRecord.length === 0) {
        return { success: false, message: 'Invalid verification code or email not found' };
      }

      // Check if code has expired
      if (!userRecord[0].verificationCodeExpiresAt || new Date() > userRecord[0].verificationCodeExpiresAt) {
        // Clear expired verification code
        await db
          .update(users)
          .set({
            verificationCode: null,
            verificationCodeExpiresAt: null
          })
          .where(eq(users.id, userId));

        return { success: false, message: 'Verification code has expired. Please request a new one.' };
      }

      // Get domain from email for verification
      const domain = extractDomain(email);

      // Generate and verify ZK proof
      let zkProofHash: string | undefined;
      let zkProofData: string | undefined;
      
      if (zkProof) {
        try {
          // Parse the ZK proof
          const parsedProof = JSON.parse(zkProof);
          
          // Verify the ZK proof
          const verificationResult = await zkVerificationService.verifyEmailVerificationProof(
            parsedProof,
            domain,
            code
          );

          if (!verificationResult.isValid) {
            return { 
              success: false, 
              message: `ZK proof verification failed: ${verificationResult.errors?.join(', ')}` 
            };
          }

          zkProofHash = verificationResult.proofHash;
          zkProofData = zkProof;
        } catch (error) {
          console.error('Error verifying ZK proof:', error);
          return { success: false, message: 'Invalid ZK proof format' };
        }
      } else {
        // Generate a basic ZK proof for the verification
        try {
          const generatedProof = await zkVerificationService.generateEmailVerificationProof(
            email,
            domain,
            code
          );
          zkProofData = JSON.stringify(generatedProof);
          zkProofHash = zkVerificationService.generateProofHash(generatedProof);
        } catch (error) {
          console.error('Error generating ZK proof:', error);
          // Continue without ZK proof - it's optional
        }
      }

      // Get company name from domain
      const companyMapping = await this.getCompanyNameFromDomain(domain);
      const companyName = companyMapping?.companyName || this.generateCompanyNameFromDomain(domain);

      // Update user record with company information and clear verification code
      await db
        .update(users)
        .set({
          companyEmail: email,
          companyDomain: domain,
          companyName,
          isCompanyVerified: true,
          companyVerifiedAt: new Date(),
          zkProofHash,
          verificationCode: null, // Clear the verification code
          verificationCodeExpiresAt: null, // Clear the expiry
        })
        .where(eq(users.id, userId));

      return { 
        success: true, 
        message: `Company email verified successfully! Your posts will now show you as verified from ${companyName}.`,
        zkProofHash 
      };

    } catch (error) {
      console.error('Error confirming company verification:', error);
      return { success: false, message: 'An error occurred during verification. Please try again.' };
    }
  }

  // Get company name from domain mapping table
  async getCompanyNameFromDomain(domain: string): Promise<CompanyDomainMapping | null> {
    try {
      const mapping = await db
        .select()
        .from(companyDomains)
        .where(eq(companyDomains.domain, domain))
        .limit(1);

      if (mapping.length === 0) {
        return null;
      }

      return {
        domain: mapping[0].domain,
        companyName: mapping[0].companyName,
        logo: mapping[0].logo || undefined,
      };
    } catch (error) {
      console.error('Error fetching company domain mapping:', error);
      return null;
    }
  }

  // Add/update company domain mapping
  async addCompanyDomainMapping(mapping: CompanyDomainMapping): Promise<boolean> {
    try {
      const { domain, companyName, logo } = mapping;

      // Check if mapping already exists
      const existing = await db
        .select()
        .from(companyDomains)
        .where(eq(companyDomains.domain, domain))
        .limit(1);

      if (existing.length > 0) {
        // Update existing mapping
        await db
          .update(companyDomains)
          .set({
            companyName,
            logo,
            updatedAt: new Date(),
          })
          .where(eq(companyDomains.domain, domain));
      } else {
        // Insert new mapping
        await db.insert(companyDomains).values({
          domain,
          companyName,
          logo,
          isVerified: true,
        });
      }

      return true;
    } catch (error) {
      console.error('Error adding company domain mapping:', error);
      return false;
    }
  }

  // Generate company name from domain (fallback)
  private generateCompanyNameFromDomain(domain: string): string {
    // Simple heuristic to generate company name from domain
    const parts = domain.split('.');
    const mainPart = parts[0];
    
    // Capitalize first letter and remove common suffixes
    let companyName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    
    // Handle some common cases
    const commonMappings: Record<string, string> = {
      'google': 'Google',
      'microsoft': 'Microsoft',
      'apple': 'Apple',
      'amazon': 'Amazon',
      'meta': 'Meta',
      'netflix': 'Netflix',
      'uber': 'Uber',
      'airbnb': 'Airbnb',
      'spotify': 'Spotify',
      'tesla': 'Tesla',
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
    };

    return commonMappings[mainPart.toLowerCase()] || companyName;
  }

  // Get user's verification status
  async getVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    companyName?: string;
    companyDomain?: string;
    verifiedAt?: Date;
  }> {
    try {
      const user = await db
        .select({
          isCompanyVerified: users.isCompanyVerified,
          companyName: users.companyName,
          companyDomain: users.companyDomain,
          companyVerifiedAt: users.companyVerifiedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return { isVerified: false };
      }

      const userData = user[0];
      return {
        isVerified: userData.isCompanyVerified,
        companyName: userData.companyName || undefined,
        companyDomain: userData.companyDomain || undefined,
        verifiedAt: userData.companyVerifiedAt || undefined,
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { isVerified: false };
    }
  }

  // Remove company verification (for admin or user request)
  async removeVerification(userId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          companyEmail: null,
          companyDomain: null,
          companyName: null,
          isCompanyVerified: false,
          companyVerifiedAt: null,
          zkProofHash: null,
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('Error removing company verification:', error);
      return false;
    }
  }

  // ZK Proof-based verification methods

  /**
   * Initiate ZK-based company verification
   */
  async initiateZKVerification(request: ZKVerificationRequest): Promise<{
    success: boolean;
    message: string;
    ephemeralKeyId?: string;
    ephemeralKey?: EphemeralKey;
  }> {
    try {
      const { userId, provider } = request;

      // Check if user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        return { success: false, message: 'User not found' };
      }

      // Check if user already has a verified company email
      if (user[0].isCompanyVerified) {
        return { success: false, message: 'You already have a verified company email' };
      }

      // Generate ephemeral key for ZK proof
      const ephemeralKey = await EphemeralKeyService.generateEphemeralKey();
      const ephemeralKeyId = EphemeralKeyService.generateKeyId(userId);

      // Store ephemeral key securely
      await EphemeralKeyService.storeEphemeralKey(ephemeralKeyId, ephemeralKey);

      // Get the appropriate ZK provider
      const zkProvider = ZKProviders[provider];
      if (!zkProvider) {
        return { success: false, message: 'Unsupported ZK provider' };
      }

      return {
        success: true,
        message: `ZK verification initiated with ${provider}. Please complete the OAuth flow.`,
        ephemeralKeyId,
        ephemeralKey,
      };
    } catch (error) {
      console.error('Error initiating ZK verification:', error);
      return { success: false, message: 'Failed to initiate ZK verification' };
    }
  }

  /**
   * Confirm ZK-based company verification
   */
  async confirmZKVerification(request: ZKVerificationConfirm): Promise<{
    success: boolean;
    message: string;
    companyName?: string;
    zkProofHash?: string;
  }> {
    try {
      const { userId, ephemeralKeyId, proof, proofArgs } = request;

      // Retrieve ephemeral key
      const ephemeralKey = await EphemeralKeyService.retrieveEphemeralKey(ephemeralKeyId);
      if (!ephemeralKey) {
        return { success: false, message: 'Ephemeral key not found or expired' };
      }

      // Validate ephemeral key is still valid
      if (!EphemeralKeyService.isEphemeralKeyValid(ephemeralKey)) {
        return { success: false, message: 'Ephemeral key has expired. Please restart the verification process.' };
      }

      // Get the ZK provider
      const provider = ZKProviders[proofArgs.provider];
      if (!provider) {
        return { success: false, message: 'Unsupported ZK provider' };
      }

      // Verify the ZK proof
      const isValid = await provider.verifyProof(
        proof,
        proofArgs.anonGroupId || '', // Domain from proof
        ephemeralKey.publicKey,
        ephemeralKey.expiry,
        proofArgs
      );

      if (!isValid) {
        return { success: false, message: 'ZK proof verification failed' };
      }

      // Extract domain and company info from proof args
      const domain = proofArgs.anonGroupId;
      const companyMapping = await this.getCompanyNameFromDomain(domain);
      const companyName = companyMapping?.companyName || this.generateCompanyNameFromDomain(domain);

      // Generate proof hash for storage
      const zkProofHash = ZKCircuitHelper.generateProofHash(proof);

      // Store verification result
      await db.insert(companyVerifications).values({
        userId,
        email: `${userId}@${domain}`, // Placeholder email for ZK verification
        domain,
        verificationCode: 'ZK_VERIFIED', // Special code for ZK verification
        zkProof: JSON.stringify({
          proof: Array.from(proof),
          proofArgs,
          ephemeralKeyId,
        }),
        zkProofHash,
        status: 'verified',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      });

      // Update user record
      await db
        .update(users)
        .set({
          companyDomain: domain,
          companyName,
          isCompanyVerified: true,
          companyVerifiedAt: new Date(),
          zkProofHash,
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: `Company email verified successfully using ZK proof! Your posts will now show you as verified from ${companyName}.`,
        companyName,
        zkProofHash,
      };
    } catch (error) {
      console.error('Error confirming ZK verification:', error);
      return { success: false, message: 'Failed to confirm ZK verification' };
    }
  }

  /**
   * Get available ZK providers
   */
  getAvailableZKProviders(): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    return [
      {
        id: 'google-oauth',
        name: 'Google Workspace',
        description: 'Verify using your Google Workspace account',
      },
    ];
  }

  /**
   * Check if ZK verification is available for a domain
   */
  async isZKVerificationAvailable(domain: string): Promise<boolean> {
    try {
      // Check if domain supports OAuth-based verification
      // For now, we'll allow all company domains
      return ZKCircuitHelper.validateCompanyDomain(domain);
    } catch (error) {
      console.error('Error checking ZK verification availability:', error);
      return false;
    }
  }

  /**
   * Store ZK verification result (client-side flow)
   */
  async storeZKVerification(params: {
    userId: string;
    provider: string;
    domain: string;
    email: string;
    zkProof: string;
    verificationMethod: string;
  }): Promise<{
    success: boolean;
    message: string;
    domain?: string;
    companyName?: string;
  }> {
    try {
      const { userId, provider, domain, email, zkProof, verificationMethod } = params;

      console.log('Storing ZK verification:', { userId, provider, domain, email, verificationMethod });

      // Validate domain
      if (!ZKCircuitHelper.validateCompanyDomain(domain)) {
        return {
          success: false,
          message: 'Invalid company domain',
        };
      }

      // Get or create company domain mapping
      let companyName = domain;
      try {
        const existingMapping = await this.getCompanyNameFromDomain(domain);
        if (existingMapping) {
          companyName = existingMapping.companyName;
        }
      } catch (error) {
        console.log('No existing company mapping found, using domain as company name');
      }

      // Check if user already exists and is not already verified
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (existingUser.length === 0) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (existingUser[0].isCompanyVerified) {
        return {
          success: false,
          message: 'User already has verified company email',
        };
      }

      // Update user's verification status in users table
      console.log('Updating user verification status for userId:', userId);
      try {
        const updateResult = await db
          .update(users)
          .set({
            isCompanyVerified: true,
            companyEmail: email,
            companyDomain: domain,
            companyName: companyName,
            companyVerifiedAt: new Date(),
            zkProofHash: zkProof,
          })
          .where(eq(users.id, userId));

        console.log('User update result:', updateResult);

        // Verify the update was successful
        const verifyUser = await db
          .select({
            id: users.id,
            email: users.email,
            isCompanyVerified: users.isCompanyVerified,
            companyDomain: users.companyDomain,
            companyName: users.companyName
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (verifyUser.length > 0 && verifyUser[0].isCompanyVerified) {
          console.log('✅ User verification status confirmed updated');
        } else {
          console.error('❌ User verification status update failed - user not found or not updated');
          return {
            success: false,
            message: 'Failed to update user verification status',
          };
        }

      } catch (updateError) {
        console.error('❌ Error updating user verification status:', updateError);
        return {
          success: false,
          message: 'Failed to update user verification status',
        };
      }

      console.log('✅ ZK verification stored successfully for user:', userId);
      console.log('✅ User verification status updated in users table');

      return {
        success: true,
        message: `Successfully verified company email for ${domain}`,
        domain,
        companyName,
      };
    } catch (error) {
      console.error('Error storing ZK verification:', error);
      return {
        success: false,
        message: 'Failed to store verification',
      };
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    companyName?: string;
    companyDomain?: string;
    verificationDate?: string;
    verificationMethod?: string;
  }> {
    try {
      // First check traditional email verification in users table
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length > 0 && user[0].isCompanyVerified && user[0].companyDomain) {
        return {
          isVerified: true,
          companyName: user[0].companyName || user[0].companyDomain,
          companyDomain: user[0].companyDomain,
          verificationDate: user[0].companyVerifiedAt?.toISOString() || user[0].updatedAt?.toISOString(),
          verificationMethod: user[0].zkProofHash ? 'zk-proof' : 'email',
        };
      }

      // ZK proof verification is handled in the main condition above

      return { isVerified: false };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { isVerified: false };
    }
  }
}

// Export singleton instance
export const companyVerificationService = new CompanyVerificationService();
