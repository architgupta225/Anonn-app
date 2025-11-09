import { Account, Contract, RpcProvider, shortString, hash, ec, CallData } from 'starknet';
import crypto from 'crypto';
import { CONFIG } from './config';

// ZK Proof verification configuration
const ZK_CONFIG = {
  STARKNET_RPC_URL: process.env.STARKNET_RPC_URL || 'https://free-rpc.nethermind.io/sepolia-juno',
  VERIFICATION_CONTRACT_ADDRESS: process.env.ZK_VERIFICATION_CONTRACT_ADDRESS || '', // To be deployed
  NETWORK: process.env.STARKNET_NETWORK || 'sepolia-alpha',
};

// Simple ZK proof structure for company email verification
export interface ZKProof {
  emailHash: string;         // Hash of the email (keeping email private)
  domainHash: string;        // Hash of the domain (keeping domain private in proof but verifiable)
  verificationCode: string;  // Verification code received via email
  timestamp: number;         // When the proof was generated
  signature: string;         // Signature of the proof data
  publicKey: string;         // Public key for signature verification
  starknetSignature?: {      // Optional Starknet signature
    r: string;
    s: string;
  };
}

export interface ZKVerificationResult {
  isValid: boolean;
  proofHash: string;
  starknetTxHash?: string;
  errors?: string[];
}

export class ZKVerificationService {
  private provider: RpcProvider;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: ZK_CONFIG.STARKNET_RPC_URL });
  }

  /**
   * Generate a ZK proof for company email verification
   * This is a simplified version - in production, you'd use a proper ZK proof system
   */
  async generateEmailVerificationProof(
    email: string,
    domain: string,
    verificationCode: string,
    userPrivateKey?: string
  ): Promise<ZKProof> {
    try {
      // Generate cryptographic hashes to hide sensitive data
      const emailHash = this.hashString(email);
      const domainHash = this.hashString(domain);
      const timestamp = Date.now();

      // Create proof data (this would be the public inputs to a ZK circuit)
      const proofData = {
        emailHash,
        domainHash,
        verificationCode,
        timestamp,
      };

      // Generate ephemeral key pair if no private key provided
      const keyPair = userPrivateKey 
        ? ec.starkCurve.getStarkKey(userPrivateKey)
        : ec.starkCurve.utils.randomPrivateKey();
      
      const publicKey = ec.starkCurve.getStarkKey(keyPair);

      // Sign the proof data
      const dataToSign = JSON.stringify(proofData);
      const signature = this.signData(dataToSign, keyPair);

      // Create Starknet signature for on-chain verification
      const messageHash = hash.computeHashOnElements([
        shortString.encodeShortString(emailHash),
        shortString.encodeShortString(domainHash),
        verificationCode,
        timestamp.toString(),
      ]);

      const starknetSignature = ec.starkCurve.sign(messageHash, keyPair);

      return {
        emailHash,
        domainHash,
        verificationCode,
        timestamp,
        signature,
        publicKey: publicKey,
        starknetSignature: {
          r: starknetSignature.r.toString(16),
          s: starknetSignature.s.toString(16),
        },
      };
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      throw new Error('Failed to generate ZK proof');
    }
  }

  /**
   * Verify a ZK proof for company email verification
   */
  async verifyEmailVerificationProof(
    proof: ZKProof,
    expectedDomain: string,
    expectedCode: string
  ): Promise<ZKVerificationResult> {
    const errors: string[] = [];
    let isValid = true;

    try {
      // Verify domain hash matches expected domain
      const expectedDomainHash = this.hashString(expectedDomain);
      if (proof.domainHash !== expectedDomainHash) {
        errors.push('Domain hash mismatch');
        isValid = false;
      }

      // Verify verification code matches
      if (proof.verificationCode !== expectedCode) {
        errors.push('Verification code mismatch');
        isValid = false;
      }

      // Verify timestamp is within acceptable range (e.g., last 15 minutes)
      const now = Date.now();
      const maxAge = 15 * 60 * 1000; // 15 minutes
      if (now - proof.timestamp > maxAge) {
        errors.push('Proof timestamp is too old');
        isValid = false;
      }

      // Verify signature
      const proofData = {
        emailHash: proof.emailHash,
        domainHash: proof.domainHash,
        verificationCode: proof.verificationCode,
        timestamp: proof.timestamp,
      };
      const dataToVerify = JSON.stringify(proofData);
      
      if (!this.verifySignature(dataToVerify, proof.signature, proof.publicKey)) {
        errors.push('Invalid signature');
        isValid = false;
      }

      // Verify Starknet signature if provided
      if (proof.starknetSignature && isValid) {
        const messageHash = hash.computeHashOnElements([
          shortString.encodeShortString(proof.emailHash),
          shortString.encodeShortString(proof.domainHash),
          proof.verificationCode,
          proof.timestamp.toString(),
        ]);

        const isStarknetSignatureValid = ec.starkCurve.verify(
          { r: BigInt('0x' + proof.starknetSignature.r), s: BigInt('0x' + proof.starknetSignature.s) },
          messageHash,
          proof.publicKey
        );

        if (!isStarknetSignatureValid) {
          errors.push('Invalid Starknet signature');
          isValid = false;
        }
      }

      // Generate proof hash for storage
      const proofHash = this.hashString(JSON.stringify(proof));

      return {
        isValid,
        proofHash,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error verifying ZK proof:', error);
      return {
        isValid: false,
        proofHash: '',
        errors: ['Proof verification failed'],
      };
    }
  }

  /**
   * Submit proof to Starknet for on-chain verification (optional)
   */
  async submitProofToStarknet(
    proof: ZKProof,
    account: Account
  ): Promise<string | null> {
    try {
      if (!ZK_CONFIG.VERIFICATION_CONTRACT_ADDRESS) {
        console.warn('ZK verification contract not deployed, skipping on-chain verification');
        return null;
      }

      // This would interact with a deployed smart contract
      // For now, we'll return a mock transaction hash
      const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
      
      console.log('Mock Starknet transaction submitted:', mockTxHash);
      return mockTxHash;
    } catch (error) {
      console.error('Error submitting proof to Starknet:', error);
      return null;
    }
  }

  /**
   * Create a zero-knowledge proof that user owns a company email without revealing the email
   * This is a simplified version - production would use proper ZK circuits like Circom/Noir
   */
  async createPrivacyPreservingProof(
    email: string,
    domain: string,
    verificationCode: string
  ): Promise<{
    proof: string;
    publicSignals: string[];
    verificationKey: string;
  }> {
    // In a real implementation, this would:
    // 1. Generate a ZK circuit that proves email ownership without revealing email
    // 2. Generate witness (private inputs)
    // 3. Generate proof using the circuit and witness
    // 4. Return proof, public signals, and verification key
    
    // For now, we'll create a simplified proof structure
    const witness = {
      email: email,
      domain: domain,
      verificationCode: verificationCode,
      random: crypto.randomBytes(32).toString('hex'),
    };

    // Public signals (what the verifier can see)
    const publicSignals = [
      this.hashString(domain), // Domain hash (verifiable but private)
      this.hashString(verificationCode), // Code hash
      Date.now().toString(), // Timestamp
    ];

    // Generate proof (simplified - would be actual ZK proof in production)
    const proof = crypto
      .createHash('sha256')
      .update(JSON.stringify(witness) + JSON.stringify(publicSignals))
      .digest('hex');

    // Verification key (would be circuit-specific in production)
    const verificationKey = crypto
      .createHash('sha256')
      .update('zk-verification-key-' + domain)
      .digest('hex');

    return {
      proof,
      publicSignals,
      verificationKey,
    };
  }

  /**
   * Verify a privacy-preserving ZK proof
   */
  async verifyPrivacyPreservingProof(
    proof: string,
    publicSignals: string[],
    verificationKey: string,
    expectedDomainHash: string,
    expectedCodeHash: string
  ): Promise<boolean> {
    try {
      // Verify public signals match expected values
      if (publicSignals[0] !== expectedDomainHash) {
        return false;
      }

      if (publicSignals[1] !== expectedCodeHash) {
        return false;
      }

      // Verify timestamp is recent (within last 15 minutes)
      const timestamp = parseInt(publicSignals[2]);
      const now = Date.now();
      const maxAge = 15 * 60 * 1000;
      if (now - timestamp > maxAge) {
        return false;
      }

      // In production, this would verify the actual ZK proof
      // For now, we'll do a simplified verification
      return proof.length === 64 && verificationKey.length === 64;
    } catch (error) {
      console.error('Error verifying privacy-preserving proof:', error);
      return false;
    }
  }

  /**
   * Utility function to hash strings consistently
   */
  private hashString(input: string): string {
    return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
  }

  /**
   * Sign data using ECDSA
   */
  private signData(data: string, privateKey: string): string {
    const hash = crypto.createHash('sha256').update(data).digest();
    // In production, use proper ECDSA signing
    return crypto.createHmac('sha256', privateKey).update(hash).digest('hex');
  }

  /**
   * Verify ECDSA signature
   */
  private verifySignature(data: string, signature: string, publicKey: string): boolean {
    try {
      const hash = crypto.createHash('sha256').update(data).digest();
      // Simplified verification - in production, use proper ECDSA verification
      const expectedSignature = crypto.createHmac('sha256', publicKey).update(hash).digest('hex');
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a deterministic proof hash for storage
   */
  generateProofHash(proof: ZKProof): string {
    const proofString = JSON.stringify({
      emailHash: proof.emailHash,
      domainHash: proof.domainHash,
      timestamp: proof.timestamp,
      signature: proof.signature,
    });
    return this.hashString(proofString);
  }
}

// Export singleton instance
export const zkVerificationService = new ZKVerificationService();
