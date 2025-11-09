import { Account, Contract, RpcProvider, CallData, shortString } from 'starknet';

// Garaga Starknet Configuration
const GARAGA_CONFIG = {
  STARKNET_RPC_URL: 'https://free-rpc.nethermind.io/sepolia-juno',
  VERIFIER_CONTRACT_ADDRESS: import.meta.env.VITE_ZK_VERIFIER_CONTRACT_ADDRESS || '',
  NETWORK: 'sepolia-alpha',
};

// Interface for ZK proof data compatible with Garaga
export interface GaragaZKProof {
  proof: Uint8Array;
  publicInputs: string[];
  verificationKey?: Uint8Array;
}

// OAuth verification data structure
export interface OAuthVerificationData {
  idToken: string;
  domain: string;
  email: string;
  ephemeralKeyId: string;
  ephemeralPubkeyHash: string;
}

/**
 * Garaga ZK Verification Service for Starknet
 * This service handles the integration with Garaga-generated verifier contracts
 */
export class GaragaService {
  private provider: RpcProvider;
  private verifierContract: Contract | null = null;

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: GARAGA_CONFIG.STARKNET_RPC_URL,
    });
  }

  /**
   * Initialize the verifier contract
   */
  async initVerifierContract(): Promise<boolean> {
    try {
      if (!GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS) {
        console.warn('ZK Verifier contract address not configured');
        return false;
      }

      // Get the contract ABI from the deployed contract
      const { abi } = await this.provider.getClassAt(GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS);
      
      this.verifierContract = new Contract(
        abi,
        GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS,
        this.provider
      );

      console.log('Garaga verifier contract initialized:', GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS);
      return true;
    } catch (error) {
      console.error('Failed to initialize verifier contract:', error);
      return false;
    }
  }

  /**
   * Generate ZK proof for OAuth verification using client-side proof generation
   */
  async generateOAuthProof(data: OAuthVerificationData): Promise<GaragaZKProof | null> {
    try {
      console.log('Generating ZK proof for OAuth verification...');

      // In a real implementation, this would call the backend to generate the proof
      // For now, we'll simulate the proof generation
      const response = await fetch('/api/zk/generate-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: data.idToken,
          domain: data.domain,
          email: data.email,
          ephemeralKeyId: data.ephemeralKeyId,
          ephemeralPubkeyHash: data.ephemeralPubkeyHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Proof generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Proof generation failed');
      }

      // Convert the proof data to the format expected by Garaga
      const proof: GaragaZKProof = {
        proof: new Uint8Array(result.proof.proof),
        publicInputs: result.proof.publicInputs,
        verificationKey: result.proof.verificationKey ? new Uint8Array(result.proof.verificationKey) : undefined,
      };

      console.log('ZK proof generated successfully');
      return proof;
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      return null;
    }
  }

  /**
   * Verify ZK proof on Starknet using Garaga verifier contract
   */
  async verifyProofOnStarknet(
    proof: GaragaZKProof,
    account: Account
  ): Promise<{ success: boolean; txHash?: string; publicInputs?: any; error?: string }> {
    try {
      if (!this.verifierContract) {
        const initialized = await this.initVerifierContract();
        if (!initialized) {
          return { success: false, error: 'Verifier contract not available' };
        }
      }

      console.log('Verifying proof on Starknet...');

      // Prepare the full_proof_with_hints array for the Garaga verifier
      const fullProofWithHints = this.prepareFullProofWithHints(proof);

      // Call the verify_ultra_keccak_honk_proof function
      const call = this.verifierContract!.populate('verify_ultra_keccak_honk_proof', [fullProofWithHints]);

      // Execute the verification transaction
      const result = await account.execute(call);

      console.log('Verification transaction submitted:', result.transaction_hash);

      // Wait for transaction confirmation
      await this.provider.waitForTransaction(result.transaction_hash);

      // Get the transaction receipt to check the result
      const receipt = await this.provider.getTransactionReceipt(result.transaction_hash);

      // Parse the result from the transaction receipt
      const verificationResult = this.parseVerificationResult(receipt);

      if (verificationResult.success) {
        console.log('ZK proof verified successfully on Starknet');
        return {
          success: true,
          txHash: result.transaction_hash,
          publicInputs: verificationResult.publicInputs,
        };
      } else {
        return {
          success: false,
          error: 'Proof verification failed on Starknet',
          txHash: result.transaction_hash,
        };
      }
    } catch (error) {
      console.error('Error verifying proof on Starknet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Prepare the full_proof_with_hints array for Garaga verifier
   * This format is specific to Garaga's ultra honk verifier
   */
  private prepareFullProofWithHints(proof: GaragaZKProof): string[] {
    // This is a simplified version - in practice, this would need to be generated
    // using Garaga's calldata generation tools
    const hints: string[] = [];

    // Add proof data
    Array.from(proof.proof).forEach(byte => {
      hints.push('0x' + byte.toString(16).padStart(2, '0'));
    });

    // Add public inputs
    proof.publicInputs.forEach(input => {
      hints.push(input);
    });

    // Add MSM hints (would be generated by Garaga's tools)
    // For now, we'll add placeholder hints
    for (let i = 0; i < 10; i++) {
      hints.push('0x0');
    }

    return hints;
  }

  /**
   * Parse verification result from transaction receipt
   */
  private parseVerificationResult(receipt: any): { success: boolean; publicInputs?: any } {
    try {
      // Look for events or return data that indicates successful verification
      // This is contract-specific and would need to be adapted based on the actual contract
      
      if (receipt.execution_status === 'SUCCEEDED') {
        // In a real implementation, we would parse the actual return data
        return {
          success: true,
          publicInputs: [], // Would contain the actual public inputs
        };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('Error parsing verification result:', error);
      return { success: false };
    }
  }

  /**
   * Get the current verifier contract address
   */
  getVerifierContractAddress(): string {
    return GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!GARAGA_CONFIG.VERIFIER_CONTRACT_ADDRESS;
  }

  /**
   * Simulate proof verification for development/testing
   */
  async simulateVerification(proof: GaragaZKProof): Promise<{ success: boolean; message: string }> {
    // For development purposes, simulate the verification
    console.log('Simulating ZK proof verification...');
    
    // Basic validation
    if (!proof.proof || proof.proof.length === 0) {
      return { success: false, message: 'Invalid proof data' };
    }

    if (!proof.publicInputs || proof.publicInputs.length === 0) {
      return { success: false, message: 'Invalid public inputs' };
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true, message: 'Proof verification successful (simulated)' };
  }
}

// Export singleton instance
export const garagaService = new GaragaService();
