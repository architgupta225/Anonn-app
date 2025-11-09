import { generateInputs } from "noir-jwt";
import { InputMap, type CompiledCircuit } from "@noir-lang/noir_js";
import { BarretenbergVerifier, UltraHonkBackend } from "@aztec/bb.js";
import {
  ZKProofData,
  EphemeralKey,
  ZKVerificationResult,
  ZKJWTInputs,
  ZKProofVerification,
  splitBigIntToLimbs
} from '../shared/schema';
import crypto from 'crypto';

const MAX_DOMAIN_LENGTH = 64;

/**
 * ZK Circuit Helper for Anonn company email verification
 * Adapted from StealthNote's JWT verification circuit
 */
export class ZKCircuitHelper {
  private static readonly version = "1.0.0";
  private static readonly circuitPath = '../../zk-circuits/src/main.nr';

  /**
   * Generate a ZK proof for company email verification
   */
  static async generateProof({
    idToken,
    jwtPubkey,
    ephemeralKey,
    domain,
  }: {
    idToken: string;
    jwtPubkey: JsonWebKey;
    ephemeralKey: EphemeralKey;
    domain: string;
  }): Promise<ZKProofData> {
    if (!idToken || !jwtPubkey) {
      throw new Error(
        "[ZK Circuit] Proof generation failed: idToken and jwtPubkey are required"
      );
    }

    try {
      // Generate JWT inputs using noir-jwt
      const jwtInputs = await generateInputs({
        jwt: idToken,
        pubkey: jwtPubkey,
        shaPrecomputeTillKeys: ["email", "email_verified", "nonce"],
        maxSignedDataLength: 640,
      });

      // Prepare domain as Uint8Array
      const domainUint8Array = new Uint8Array(MAX_DOMAIN_LENGTH);
      domainUint8Array.set(Uint8Array.from(new TextEncoder().encode(domain)));

      // Prepare circuit inputs
      const inputs: ZKJWTInputs = {
        partial_data: jwtInputs.partial_data,
        partial_hash: jwtInputs.partial_hash,
        full_data_length: jwtInputs.full_data_length,
        base64_decode_offset: jwtInputs.base64_decode_offset,
        jwt_pubkey_modulus_limbs: jwtInputs.pubkey_modulus_limbs,
        jwt_pubkey_redc_params_limbs: jwtInputs.redc_params_limbs,
        jwt_signature_limbs: jwtInputs.signature_limbs,
        domain: domain,
        ephemeral_pubkey: (ephemeralKey.publicKey >> 3n).toString(),
        ephemeral_pubkey_salt: ephemeralKey.salt.toString(),
        ephemeral_pubkey_expiry: Math.floor(ephemeralKey.expiry.getTime() / 1000).toString(),
      };

      console.log("ZK circuit inputs prepared", {
        domain,
        ephemeralPubkey: ephemeralKey.publicKey.toString(),
        ephemeralPubkeyExpiry: ephemeralKey.expiry.toISOString(),
      });

      // Load circuit artifacts (these would be compiled from our Noir circuit)
      const circuitArtifact = await this.loadCircuitArtifact();
      const backend = new UltraHonkBackend(circuitArtifact.bytecode, { threads: 8 });
      const noir = new Noir(circuitArtifact as CompiledCircuit);

      // Generate witness and proof
      const startTime = performance.now();
      const { witness } = await noir.execute(inputs as InputMap);
      const proof = await backend.generateProof(witness);
      const provingTime = performance.now() - startTime;

      console.log(`ZK proof generated in ${provingTime}ms`);

      // Prepare public inputs for verification
      const publicInputs = this.preparePublicInputs(
        jwtInputs.pubkey_modulus_limbs,
        domain,
        ephemeralKey.publicKey,
        ephemeralKey.expiry
      );

      return {
        proof: proof.proof,
        publicInputs,
        verificationKey: proof.vk, // Verification key
      };
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      throw new Error('Failed to generate ZK proof');
    }
  }

  /**
   * Verify a ZK proof for company email verification
   */
  static async verifyProof(
    proof: Uint8Array,
    verification: ZKProofVerification
  ): Promise<ZKVerificationResult> {
    const errors: string[] = [];

    try {
      if (!verification.domain || !verification.jwtPubKey || !verification.ephemeralPubkey || !verification.ephemeralPubkeyExpiry) {
        throw new Error(
          "[ZK Circuit] Proof verification failed: invalid public inputs"
        );
      }

      // Load verification key
      const vkey = await this.loadVerificationKey();

      // Prepare public inputs in the format expected by the verifier
      const publicInputs = this.preparePublicInputs(
        splitBigIntToLimbs(verification.jwtPubKey, 120, 18),
        verification.domain,
        verification.ephemeralPubkey,
        verification.ephemeralPubkeyExpiry
      );

      // Initialize Barretenberg verifier
      const verifier = new BarretenbergVerifier({
        crsPath: process.env.TEMP_DIR || '/tmp',
      });

      const proofData = {
        proof,
        publicInputs,
      };

      const isValid = await verifier.verifyUltraHonkProof(
        proofData,
        Uint8Array.from(vkey)
      );

      // Generate proof hash for storage
      const proofHash = crypto
        .createHash('sha256')
        .update(Buffer.from(proof))
        .digest('hex');

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
        errors: ['ZK proof verification failed'],
      };
    }
  }

  /**
   * Prepare public inputs for the ZK circuit verification
   */
  private static preparePublicInputs(
    jwtPubKeyLimbs: bigint[],
    domain: string,
    ephemeralPubkey: bigint,
    ephemeralPubkeyExpiry: Date
  ): string[] {
    const publicInputs: string[] = [];

    // Add JWT public key modulus limbs (18 limbs)
    publicInputs.push(
      ...jwtPubKeyLimbs.map((limb) => "0x" + limb.toString(16).padStart(64, "0"))
    );

    // Add domain (64 bytes)
    const domainUint8Array = new Uint8Array(64);
    domainUint8Array.set(Uint8Array.from(new TextEncoder().encode(domain)));
    publicInputs.push(
      ...Array.from(domainUint8Array).map(
        (byte) => "0x" + byte.toString(16).padStart(64, "0")
      )
    );

    // Add ephemeral pubkey (1 field)
    publicInputs.push("0x" + (ephemeralPubkey >> 3n).toString(16).padStart(64, "0"));

    // Add ephemeral pubkey expiry (1 field)
    publicInputs.push("0x" + Math.floor(ephemeralPubkeyExpiry.getTime() / 1000).toString(16).padStart(64, "0"));

    return publicInputs;
  }

  /**
   * Load circuit artifact (compiled Noir circuit)
   * In production, this would be the compiled circuit.json file
   */
  private static async loadCircuitArtifact(): Promise<CompiledCircuit> {
    // For development, we'll create a mock circuit artifact
    // In production, this would load the actual compiled circuit
    const mockCircuit: CompiledCircuit = {
      bytecode: new Uint8Array(), // Would contain actual bytecode
      abi: {}, // Would contain actual ABI
      backend: 'ultrahonk',
    };

    // TODO: Load actual compiled circuit from zk-circuits/build
    // const circuitArtifact = await import(`../zk-circuits/build/circuit.json`);

    return mockCircuit;
  }

  /**
   * Load verification key
   * In production, this would be the circuit-vkey.json file
   */
  private static async loadVerificationKey(): Promise<Uint8Array> {
    // For development, we'll create a mock verification key
    // In production, this would load the actual vkey
    const mockVKey = new Uint8Array(32); // Would contain actual verification key

    // TODO: Load actual verification key from zk-circuits/build
    // const vkey = await import(`../zk-circuits/build/circuit-vkey.json`);

    return mockVKey;
  }

  /**
   * Get circuit version
   */
  static getVersion(): string {
    return this.version;
  }

  /**
   * Validate domain for company verification
   */
  static validateCompanyDomain(domain: string): boolean {
    // Block common personal email providers
    const blockedDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'protonmail.com',
      'icloud.com',
      'mail.com',
      'yandex.com',
      'aol.com',
      'zoho.com'
    ];

    // For testing: allow all Gmail domains (regular gmail.com and subdomains)
    if (domain.toLowerCase() === 'gmail.com' || domain.toLowerCase().endsWith('.gmail.com')) {
      return true;
    }

    return !blockedDomains.includes(domain.toLowerCase());
  }

  /**
   * Generate a proof hash for storage
   */
  static generateProofHash(proof: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(proof))
      .digest('hex');
  }
}
