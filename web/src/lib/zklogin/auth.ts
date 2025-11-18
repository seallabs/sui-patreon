/**
 * zkLogin Authentication Utilities
 *
 * Implements the zkLogin flow for Google OAuth integration
 * Based on: https://docs.sui.io/guides/developer/cryptography/zklogin-integration
 */

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from '@mysten/sui/zklogin';
import { ZKLOGIN_CONFIG } from './config';
import {
  getEphemeralKeyPair,
  getSession,
  getZkProof,
  setSession,
  storeEphemeralKeyPair,
  storeUserAddress,
  storeZkProof,
} from './storage';

/**
 * JWT payload structure from Google OAuth
 */
export interface JwtPayload {
  iss?: string;
  sub?: string; // Subject ID - unique user identifier
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Decoded JWT structure
 */
export interface DecodedJwt extends JwtPayload {
  header: {
    alg: string;
    typ: string;
    kid: string;
  };
}

/**
 * Step 1: Initialize zkLogin flow
 * Creates ephemeral keypair and generates nonce for OAuth
 */
export async function beginZkLogin(): Promise<{ loginUrl: string }> {
  try {
    // Initialize Sui client
    const suiClient = new SuiClient({ url: ZKLOGIN_CONFIG.sui.rpcUrl });

    // Get current epoch info
    const { epoch } = await suiClient.getLatestSuiSystemState();

    // Set ephemeral key to be valid for 2 epochs (~2 days on testnet)
    const maxEpoch = Number(epoch) + 2;

    // Generate ephemeral keypair
    const ephemeralKeyPair = new Ed25519Keypair();

    // Generate randomness for nonce
    const randomness = generateRandomness();

    // Generate nonce from ephemeral public key
    const nonce = generateNonce(
      ephemeralKeyPair.getPublicKey(),
      maxEpoch,
      randomness
    );

    // Store in session for later use
    const secretKey = ephemeralKeyPair.getSecretKey();
    storeEphemeralKeyPair({
      publicKey: ephemeralKeyPair.getPublicKey().toBase64(),
      privateKey: Buffer.from(secretKey).toString('base64'),
      scheme: ephemeralKeyPair.getKeyScheme(),
    });

    setSession(ZKLOGIN_CONFIG.storageKeys.maxEpoch, maxEpoch);
    setSession(ZKLOGIN_CONFIG.storageKeys.randomness, randomness);
    setSession(ZKLOGIN_CONFIG.storageKeys.nonce, nonce);

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: ZKLOGIN_CONFIG.google.clientId,
      redirect_uri: ZKLOGIN_CONFIG.google.redirectUrl,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: nonce,
    });

    const loginUrl = `${ZKLOGIN_CONFIG.google.authUrl}?${params.toString()}`;

    return { loginUrl };
  } catch (error) {
    console.error('Failed to begin zkLogin flow:', error);
    throw new Error('Failed to initialize zkLogin. Please try again.');
  }
}

/**
 * Step 2: Decode JWT from OAuth callback
 */
export function decodeJwt(encodedJwt: string): DecodedJwt {
  try {
    const parts = encodedJwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    return {
      header,
      ...payload,
    };
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    throw new Error('Invalid JWT token');
  }
}

/**
 * Step 3: Get user salt (in production, this should call your backend)
 * For now, we'll use a deterministic salt based on the sub (subject ID)
 */
export async function getUserSalt(
  jwt: string,
  decodedJwt: DecodedJwt
): Promise<string> {
  // IMPORTANT: In production, this should be a backend API call that:
  // 1. Validates the JWT
  // 2. Returns a consistent salt for the user (stored in database)
  // 3. Never exposes the salt generation logic to the client

  // For development/testing, we'll use a deterministic approach
  // This is NOT secure for production use

  try {
    // Check if we already have a salt for this user
    const storedSalt = getSession<string>(ZKLOGIN_CONFIG.storageKeys.userSalt);
    if (storedSalt) {
      return storedSalt;
    }

    // Generate a deterministic salt from the subject ID
    // WARNING: This is for demo purposes only!
    const encoder = new TextEncoder();
    const data = encoder.encode(decodedJwt.sub || '');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Take first 16 bytes and convert to BigInt string
    const saltBytes = hashArray.slice(0, 16);
    let saltBigInt = BigInt(0);
    for (let i = 0; i < saltBytes.length; i++) {
      saltBigInt = saltBigInt + BigInt(saltBytes[i]) * BigInt(256) ** BigInt(i);
    }

    const salt = saltBigInt.toString();

    // Store for this session
    setSession(ZKLOGIN_CONFIG.storageKeys.userSalt, salt);

    return salt;
  } catch (error) {
    console.error('Failed to get user salt:', error);
    throw new Error('Failed to derive user salt');
  }
}

// Track in-flight proof requests to prevent duplicates
const proofRequests = new Map<string, Promise<any>>();

/**
 * Step 4: Get zero-knowledge proof from Mysten Labs prover
 * Includes deduplication to prevent "Too Many Requests" errors
 */
export async function getZkLoginProof(
  jwt: string,
  userSalt: string
): Promise<any> {
  try {
    // Check if we already have a cached proof for this JWT
    const cachedProof = getZkProof();
    if (cachedProof) {
      console.log('Using cached ZK proof');
      return cachedProof;
    }

    // Create a unique key for this request
    const requestKey = `${jwt}-${userSalt}`;

    // Check if there's already a request in flight for this JWT
    if (proofRequests.has(requestKey)) {
      console.log('Waiting for existing proof request...');
      return await proofRequests.get(requestKey);
    }

    // Create new proof request
    const proofPromise = (async () => {
      const keypair = getEphemeralKeyPair();
      if (!keypair) {
        throw new Error('No ephemeral key pair found');
      }
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());
      const response = await fetch(ZKLOGIN_CONFIG.prover.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwt,
          extendedEphemeralPublicKey,
          maxEpoch:
            getSession<number>(ZKLOGIN_CONFIG.storageKeys.maxEpoch) || 0,
          jwtRandomness:
            getSession<string>(ZKLOGIN_CONFIG.storageKeys.randomness) || '',
          salt: userSalt,
          keyClaimName: 'sub',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting specifically
        if (response.status === 429) {
          throw new Error(
            'Too many proof requests. Please wait a few seconds and try logging in again.'
          );
        }

        throw new Error(`Prover returned ${response.status}: ${errorText}`);
      }

      const proof = await response.json();
      storeZkProof(proof);

      return proof;
    })();

    // Store the promise to prevent duplicate requests
    proofRequests.set(requestKey, proofPromise);

    try {
      const proof = await proofPromise;
      return proof;
    } finally {
      // Clean up the request tracker after completion
      proofRequests.delete(requestKey);
    }
  } catch (error) {
    console.error('Failed to get ZK proof:', error);

    if (
      error instanceof Error &&
      error.message.includes('Too many proof requests')
    ) {
      throw error; // Re-throw with specific message
    }

    throw new Error(
      'Failed to generate zero-knowledge proof. Please try again.'
    );
  }
}

/**
 * Step 5: Complete zkLogin flow after OAuth callback
 * Retrieves ZK proof and derives Sui address
 */
export async function completeZkLogin(jwt: string): Promise<{
  address: string;
  decodedJwt: DecodedJwt;
}> {
  try {
    // Decode JWT
    const decodedJwt = decodeJwt(jwt);

    // Store JWT
    setSession(ZKLOGIN_CONFIG.storageKeys.jwt, jwt);

    // Get user salt
    const userSalt = await getUserSalt(jwt, decodedJwt);

    // Get ZK proof from Mysten Labs prover
    await getZkLoginProof(jwt, userSalt);

    // Derive Sui address from JWT
    const address = jwtToAddress(jwt, userSalt);

    // Store address
    storeUserAddress(address);

    return {
      address,
      decodedJwt,
    };
  } catch (error) {
    console.error('Failed to complete zkLogin:', error);
    throw error;
  }
}

/**
 * Sign and execute a transaction with zkLogin
 */
export async function signAndExecuteZkLoginTransaction(
  transaction: Transaction,
  userAddress: string
): Promise<string> {
  try {
    const suiClient = new SuiClient({ url: ZKLOGIN_CONFIG.sui.rpcUrl });

    // Get stored data
    const ephemeralKeyPair = getEphemeralKeyPair();
    const zkProof = getZkProof();
    const maxEpoch = getSession<number>(ZKLOGIN_CONFIG.storageKeys.maxEpoch);
    const jwt = getSession<string>(ZKLOGIN_CONFIG.storageKeys.jwt);
    const userSalt = getSession<string>(ZKLOGIN_CONFIG.storageKeys.userSalt);

    if (!ephemeralKeyPair || !zkProof || !maxEpoch || !jwt || !userSalt) {
      throw new Error('Missing zkLogin session data');
    }

    // Set transaction sender
    transaction.setSender(userAddress);
    console.log(ephemeralKeyPair.toSuiAddress());

    // Sign with ephemeral key
    const { bytes, signature: userSignature } = await transaction.sign({
      client: suiClient,
      signer: ephemeralKeyPair,
    });

    // Decode JWT to get addressSeed parameters
    const decodedJwt = decodeJwt(jwt);

    // Generate address seed using SDK function
    const addressSeed = genAddressSeed(
      BigInt(userSalt),
      'sub',
      decodedJwt.sub!,
      decodedJwt.aud as string
    ).toString();

    // Assemble zkLogin signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...(zkProof as any),
        addressSeed,
      },
      maxEpoch,
      userSignature,
    });

    // Execute transaction
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    });

    return result.digest;
  } catch (error) {
    console.error('Failed to execute zkLogin transaction:', error);
    throw new Error('Failed to execute transaction. Please try again.');
  }
}
