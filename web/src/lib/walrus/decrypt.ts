/**
 * Content Decryption Module
 *
 * Provides functionality to decrypt Seal-encrypted content stored in Walrus
 * using blobId and on-chain access verification.
 *
 * Flow:
 * 1. Download encrypted data from Walrus using blobId
 * 2. Extract policy ID from encrypted Seal object
 * 3. Get content metadata from Sui blockchain
 * 4. Build transaction proving access via subscription NFT
 * 5. Decrypt content using Seal with transaction proof
 */

import { CONFIG } from '@/lib/config';
import { getEphemeralKeyPair } from '@/lib/zklogin';
import { EncryptedObject, SessionKey } from '@mysten/seal';
import { SignatureWithBytes } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID, fromHex } from '@mysten/sui/utils';
import { client } from './client';
import { getSessionKey, sealClient } from './seal';

/**
 * Options for decrypting content
 */
export interface DecryptContentOptions {
  /** On-chain Content object ID (contains metadata, policy info, and blobId) */
  contentId: string;
  /** User's ActiveSubscription NFT ID (proves access rights) */
  subscriptionId: string;
  /** Walrus blob (patch) ID that stores the encrypted bytes */
  blobId: string;
  /** Active Seal session key (must already be initialized and signed) */
  sessionKey: SessionKey;
  /** Optional: Package ID (defaults to CONFIG.PUBLISHED_AT) */
  packageId?: string;
}

/**
 * Options for decrypting content with zkLogin (no signer function needed)
 */
export interface DecryptContentWithZkLoginOptions {
  /** On-chain Content object ID (contains metadata, policy info, and blobId) */
  contentId: string;
  /** User's ActiveSubscription NFT ID (proves access rights) */
  subscriptionId: string;
  /** User's Sui address (required for session key creation) */
  userAddress: string;
  /** (Optional) Blob ID if already known. If omitted, it will be fetched from on-chain metadata. */
  blobId?: string;
  /** Optional: Package ID (defaults to CONFIG.PUBLISHED_AT) */
  packageId?: string;
  /** Optional: Session key TTL in minutes (default: 10) */
  sessionKeyTtl?: number;
}

/**
 * Result of decryption operation
 */
export interface DecryptContentResult {
  /** Decrypted content as Uint8Array */
  data: Uint8Array;
  /** Original encrypted data size in bytes */
  encryptedSize: number;
  /** Decrypted data size in bytes */
  decryptedSize: number;
}

/**
 * Decrypt Seal-encrypted content from Walrus using contentId
 *
 * This function:
 * 1. Retrieves content metadata from Sui blockchain (includes blobId)
 * 2. Downloads encrypted data from Walrus using blobId from content
 * 3. Extracts the policy ID from the Seal encrypted object
 * 4. Creates a session key for Seal decryption
 * 5. Builds a transaction that proves access via subscription NFT
 * 6. Decrypts the content using Seal with the transaction proof
 *
 * @param options - Decryption options
 * @returns Promise resolving to decrypted content and metadata
 * @throws Error if any step fails (content retrieval, download, metadata retrieval, decryption, access denied)
 *
 * @example
 * ```typescript
 * const sessionKey = await getSessionKey(...); // create & sign session key up-front
 * const blobId = await getBlobIdForContent('0xcontent456...');
 *
 * const result = await decryptContent({
 *   contentId: '0xcontent456...',
 *   subscriptionId: '0xsubscription789...',
 *   blobId,
 *   sessionKey,
 * });
 *
 * // Use decrypted content
 * const text = new TextDecoder('utf-8').decode(result.data);
 * const blob = new Blob([result.data], { type: 'image/png' });
 * ```
 */
export async function decryptContent(
  options: DecryptContentOptions
): Promise<DecryptContentResult> {
  const {
    contentId,
    subscriptionId,
    blobId,
    sessionKey,
    packageId = CONFIG.PUBLISHED_AT,
  } = options;

  console.log('🔓 Starting content decryption:', {
    contentId,
    subscriptionId,
    blobId,
  });

  try {
    // Step 1: Download encrypted data from Walrus
    console.log('📥 Step 1: Downloading encrypted data from Walrus...');
    const encryptedData = await downloadFromWalrus(blobId);
    console.log(`✅ Downloaded ${encryptedData.length} bytes from Walrus`);

    // Step 2: Extract policy ID from Seal encrypted object
    console.log('🔍 Step 2: Extracting policy ID from encrypted object...');
    const policyId = extractPolicyIdFromEncryptedData(encryptedData);
    console.log(`✅ Extracted policy ID: ${toHexString(policyId)}`);

    // Step 3: Build transaction to prove access
    console.log('📝 Step 3: Building access verification transaction...');
    console.log({
      policyId,
      contentId,
      subscriptionId,
      packageId
    })
    const txBytes = await buildAccessVerificationTransaction({
      policyId,
      contentId,
      subscriptionId,
      packageId,
    });
    console.log(`✅ Transaction built (${txBytes.length} bytes)`);

    // Step 4: Decrypt with Seal
    console.log('🔓 Step 4: Decrypting with Seal...');
    const decryptedBytes = await sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
    });
    console.log(`✅ Decryption successful: ${decryptedBytes.length} bytes`);

    return {
      data: new Uint8Array(decryptedBytes),
      encryptedSize: encryptedData.length,
      decryptedSize: decryptedBytes.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Decryption failed:', message);
    throw new Error(`Content decryption failed: ${message}`);
  }
}

/**
 * Download encrypted data from Walrus using blob ID (patch ID)
 *
 * Uses the HTTP aggregator endpoint instead of SDK for better performance
 * and to enable blob conversion for decryption.
 *
 * @param blobId - Walrus patch ID (from quilt)
 * @returns Promise resolving to encrypted data as Uint8Array
 * @throws Error if blob not found or download fails
 */
async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    // Use aggregator URL for testnet (same as creator dashboard)
    const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
    const url = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${blobId}`;

    console.log(`📥 Fetching from aggregator: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Blob ${blobId} not found in Walrus`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to download from Walrus: ${message}`);
  }
}

/**
 * Extract policy ID from Seal encrypted object
 *
 * The policy ID is embedded in the encrypted object and is used
 * as the identity for Identity-Based Encryption (IBE).
 *
 * @param encryptedData - Encrypted data from Seal
 * @returns Policy ID as Uint8Array
 * @throws Error if encrypted object cannot be parsed
 */
function extractPolicyIdFromEncryptedData(
  encryptedData: Uint8Array
): Uint8Array {
  try {
    // Parse the Seal encrypted object to extract the policy ID
    const encryptedObject = EncryptedObject.parse(encryptedData);
    const policyIdHex = encryptedObject.id;

    // Convert hex string to Uint8Array
    // Remove '0x' prefix if present
    const hexString = policyIdHex.startsWith('0x')
      ? policyIdHex.slice(2)
      : policyIdHex;
    return fromHex(hexString);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to extract policy ID from encrypted data: ${message}`
    );
  }
}

/**
 * Get content metadata from Sui blockchain
 *
 * @param contentId - On-chain Content object ID
 * @returns Content object data
 * @throws Error if content not found
 */
async function getContentMetadata(contentId: string) {
  try {
    const content = await client.getObject({
      id: contentId,
      options: { showContent: true },
    });

    if (!content.data) {
      throw new Error(`Content object ${contentId} not found`);
    }

    return content.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to retrieve content metadata: ${message}`);
  }
}

/**
 * Extract blobId (sealed_patch_id) from content metadata
 *
 * The blobId is stored in the content object as `sealed_patch_id` field.
 *
 * @param contentData - Content object data from Sui
 * @returns Blob ID (patch ID) as string
 * @throws Error if blobId not found in content
 */
function extractBlobIdFromContent(contentData: any): string {
  try {
    // Extract sealed_patch_id from content object
    // The structure is: content.data.content.fields.sealed_patch_id
    const fields = (contentData.content as any)?.fields;
    if (!fields) {
      throw new Error('Content fields not found');
    }

    const blobId = fields.sealed_patch_id;
    if (!blobId) {
      throw new Error('sealed_patch_id not found in content object');
    }

    return blobId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract blobId from content: ${message}`);
  }
}

/**
 * Convenience helper: fetch blobId for a content object.
 */
export async function getBlobIdForContent(contentId: string): Promise<string> {
  const contentMetadata = await getContentMetadata(contentId);
  return extractBlobIdFromContent(contentMetadata);
}

/**
 * Options for building access verification transaction
 */
interface BuildTransactionOptions {
  /** Policy ID extracted from encrypted object */
  policyId: Uint8Array;
  /** Content object ID */
  contentId: string;
  /** Subscription NFT ID */
  subscriptionId: string;
  /** Package ID */
  packageId: string;
}

/**
 * Build transaction that proves access rights for Seal decryption
 *
 * This transaction calls the `seal_approve` function in the Move contract,
 * which verifies that the subscription NFT grants access to the content.
 * The transaction is built but NOT executed - Seal uses it as proof.
 *
 * @param options - Transaction building options
 * @returns Transaction bytes as Uint8Array
 */
async function buildAccessVerificationTransaction(
  options: BuildTransactionOptions
): Promise<Uint8Array> {
  const { policyId, contentId, subscriptionId, packageId } = options;

  try {
    const tx = new Transaction();

    // Call seal_approve function in Move contract
    // Signature: seal_approve(id: vector<u8>, content: &Content, subscription: &ActiveSubscription, clock: &Clock)
    tx.moveCall({
      target: `${packageId}::content::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(policyId)), // Policy ID from encrypted object
        tx.object(contentId), // Content object
        tx.object(subscriptionId), // User's subscription NFT
        tx.object(SUI_CLOCK_OBJECT_ID), // Sui clock for time verification
      ],
    });

    // Build transaction bytes without executing
    // onlyTransactionKind: true means we only get the transaction kind bytes,
    // not the full transaction with gas and sender info
    const txBytes = await tx.build({
      client,
      onlyTransactionKind: true,
    });

    return txBytes;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to build access verification transaction: ${message}`
    );
  }
}

/**
 * Convert Uint8Array to hex string for logging
 *
 * @param bytes - Bytes to convert
 * @returns Hex string with '0x' prefix
 */
function toHexString(bytes: Uint8Array): string {
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Sign personal message using zkLogin ephemeral keypair
 *
 * This function uses the stored zkLogin ephemeral keypair to sign messages
 * without requiring user interaction (no wallet popup).
 *
 * @param message - Message to sign
 * @returns Signature with bytes
 * @throws Error if zkLogin session is not available
 */
export function signPersonalMessageWithZkLogin(
  message: Uint8Array
): Promise<SignatureWithBytes> {
  const keypair = getEphemeralKeyPair();

  if (!keypair) {
    throw new Error(
      'zkLogin session not found. Please complete zkLogin authentication first.'
    );
  }

  try {
    const signature = keypair.signPersonalMessage(message);
    return Promise.resolve(signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to sign message with zkLogin: ${message}`);
  }
}

/**
 * Decrypt content using zkLogin for signing (no wallet required)
 *
 * This is a convenience wrapper around `decryptContent` that automatically
 * uses the zkLogin ephemeral keypair for signing. No wallet interaction needed!
 *
 * @param options - Decryption options (without signPersonalMessage)
 * @returns Promise resolving to decrypted content and metadata
 * @throws Error if zkLogin session is not available or decryption fails
 *
 * @example
 * ```typescript
 * // No wallet needed - uses zkLogin session
 * const result = await decryptContentWithZkLogin({
 *   contentId: '0xcontent456...',
 *   subscriptionId: '0xsubscription789...',
 *   userAddress: '0xuser123...',
 * });
 *
 * const text = DecryptHelpers.toText(result.data);
 * ```
 */
export async function decryptContentWithZkLogin(
  options: DecryptContentWithZkLoginOptions
): Promise<DecryptContentResult> {
  const {
    contentId,
    subscriptionId,
    userAddress,
    blobId: providedBlobId,
    packageId = CONFIG.PUBLISHED_AT,
    sessionKeyTtl = 10,
  } = options;

  if (!userAddress) {
    throw new Error('User address is required for zkLogin decryption.');
  }

  // 1. Resolve blobId (from option or by fetching metadata)
  const blobId = providedBlobId ?? (await getBlobIdForContent(contentId));

  // 2. Create session key using zkLogin signer
  const sessionKey = await getSessionKey(
    packageId,
    userAddress,
    signPersonalMessageWithZkLogin,
    sessionKeyTtl
  );

  // 3. Delegate to base decrypt function
  return decryptContent({
    contentId,
    subscriptionId,
    blobId,
    sessionKey,
    packageId,
  });
}

/**
 * Decrypt content using backend API endpoint
 *
 * Alternative approach: Use the backend API instead of direct Seal decryption.
 * This is useful if you want to offload decryption to the server.
 *
 * @param options - Decryption options (same as decryptContent)
 * @returns Promise resolving to decrypted content
 * @throws Error if API call fails
 */
export interface DecryptContentViaBackendOptions {
  contentId: string;
  subscriptionId: string;
  packageId?: string;
  apiBaseUrl?: string;
}

export async function decryptContentViaBackend(
  options: DecryptContentViaBackendOptions
): Promise<DecryptContentResult> {
  const {
    contentId,
    subscriptionId,
    packageId = CONFIG.PUBLISHED_AT,
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  } = options;

  console.log('🔓 Starting content decryption via backend API...');

  try {
    // Step 1: Get content metadata to extract blobId
    const contentMetadata = await getContentMetadata(contentId);
    const blobId = extractBlobIdFromContent(contentMetadata);

    // Step 2: Download encrypted data to extract policy ID
    const encryptedData = await downloadFromWalrus(blobId);
    const policyId = extractPolicyIdFromEncryptedData(encryptedData);

    // Step 3: Build transaction bytes
    const txBytes = await buildAccessVerificationTransaction({
      policyId,
      contentId,
      subscriptionId,
      packageId,
    });

    // Step 4: Convert transaction bytes to hex string for API
    const txHex = Array.from(txBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Step 5: Call backend API
    const url = `${apiBaseUrl}/api/download/${blobId}?decrypt=true&txDigest=0x${txHex}`;
    console.log('📡 Calling backend API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        error.error || `API request failed: ${response.statusText}`
      );
    }

    // Step 6: Get decrypted data
    const arrayBuffer = await response.arrayBuffer();
    const decryptedData = new Uint8Array(arrayBuffer);

    console.log(
      `✅ Decryption via backend successful: ${decryptedData.length} bytes`
    );

    return {
      data: decryptedData,
      encryptedSize: encryptedData.length,
      decryptedSize: decryptedData.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Backend decryption failed:', message);
    throw new Error(`Content decryption via backend failed: ${message}`);
  }
}

/**
 * Helper: Convert decrypted Uint8Array to various formats
 */
export const DecryptHelpers = {
  /**
   * Convert decrypted data to text
   */
  toText(data: Uint8Array, encoding: BufferEncoding = 'utf-8'): string {
    return new TextDecoder(encoding).decode(data);
  },

  /**
   * Convert decrypted data to Blob
   */
  toBlob(data: Uint8Array, mimeType?: string): Blob {
    // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
    const buffer = new Uint8Array(data).buffer;
    return new Blob([buffer], { type: mimeType });
  },

  /**
   * Convert decrypted data to base64 string
   * Processes in chunks to avoid "Maximum call stack size exceeded" for large data
   */
  toBase64(data: Uint8Array): string {
    // Process in chunks to avoid exceeding maximum argument count
    const chunkSize = 8192; // 8KB chunks
    let binary = '';

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  },

  /**
   * Convert decrypted data to data URL
   */
  toDataUrl(data: Uint8Array, mimeType: string): string {
    const base64 = DecryptHelpers.toBase64(data);
    return `data:${mimeType};base64,${base64}`;
  },

  /**
   * Create download link for decrypted content
   */
  createDownloadLink(
    data: Uint8Array,
    filename: string,
    mimeType?: string
  ): string {
    const blob = DecryptHelpers.toBlob(data, mimeType);
    return URL.createObjectURL(blob);
  },
};
