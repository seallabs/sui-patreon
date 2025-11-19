/**
 * Example Usage: Content Decryption
 *
 * This file demonstrates how to use the decryptContent function
 * to decrypt Seal-encrypted content stored in Walrus.
 *
 * DO NOT import this file in production code - it's for reference only.
 */

import { useUser } from '@/contexts/user-context';
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { SignatureWithBytes } from '@mysten/sui/cryptography';
import {
  decryptContent,
  decryptContentViaBackend,
  decryptContentWithZkLogin,
  DecryptHelpers,
} from './decrypt';

/**
 * Example 1: Basic decryption with React hook
 */
export function Example1_ReactHook() {
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { user } = useUser();

  async function handleDecrypt() {
    if (!user?.address) {
      console.error('User not logged in');
      return;
    }

    try {
      const result = await decryptContent({
        contentId: '0xcontentId456...',
        subscriptionId: '0xsubscriptionId789...',
        userAddress: user.address,
        signPersonalMessage: async (message) => {
          return await signPersonalMessage({ message });
        },
      });

      // Use decrypted content
      const text = DecryptHelpers.toText(result.data);
      console.log('Decrypted text:', text);

      // Or create a blob for images/files
      const blob = DecryptHelpers.toBlob(result.data, 'image/png');
      const imageUrl = URL.createObjectURL(blob);
    } catch (error) {
      console.error('Decryption failed:', error);
    }
  }

  return null; // Component implementation
}

/**
 * Example 2: Decrypt and display image
 */
export async function Example2_DecryptImage(
  contentId: string,
  subscriptionId: string,
  userAddress: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>
) {
  try {
    const result = await decryptContent({
      contentId,
      subscriptionId,
      userAddress,
      signPersonalMessage,
    });

    // Create image data URL
    const imageUrl = DecryptHelpers.toDataUrl(result.data, 'image/png');

    // Use in img tag
    return imageUrl;
  } catch (error) {
    console.error('Failed to decrypt image:', error);
    throw error;
  }
}

/**
 * Example 3: Decrypt and download file
 */
export async function Example3_DecryptAndDownload(
  contentId: string,
  subscriptionId: string,
  userAddress: string,
  filename: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>
) {
  try {
    const result = await decryptContent({
      contentId,
      subscriptionId,
      userAddress,
      signPersonalMessage,
    });

    // Create download link
    const blob = DecryptHelpers.toBlob(result.data);
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to decrypt and download:', error);
    throw error;
  }
}

/**
 * Example 4: Decrypt using backend API
 */
export async function Example4_DecryptViaBackend(
  contentId: string,
  subscriptionId: string,
  userAddress: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>
) {
  try {
    const result = await decryptContentViaBackend({
      contentId,
      subscriptionId,
      userAddress,
      signPersonalMessage,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    });

    return result.data;
  } catch (error) {
    console.error('Backend decryption failed:', error);
    throw error;
  }
}

/**
 * Example 5: Decrypt with error handling and loading states
 */
export async function Example5_WithErrorHandling(
  contentId: string,
  subscriptionId: string,
  userAddress: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>
) {
  try {
    console.log('Starting decryption...');
    const result = await decryptContent({
      contentId,
      subscriptionId,
      userAddress,
      signPersonalMessage,
    });

    console.log('Decryption successful:', {
      encryptedSize: result.encryptedSize,
      decryptedSize: result.decryptedSize,
      compressionRatio:
        ((1 - result.decryptedSize / result.encryptedSize) * 100).toFixed(2) +
        '%',
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('not found')) {
        console.error('Content or blob not found');
      } else if (
        error.message.includes('access denied') ||
        error.message.includes('seal_approve')
      ) {
        console.error('Access denied: Invalid or expired subscription');
      } else if (error.message.includes('session key')) {
        console.error('Session key creation failed');
      } else {
        console.error('Decryption error:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Example 6: Decrypt using zkLogin (NO WALLET NEEDED!)
 *
 * This is the easiest way - uses zkLogin ephemeral keypair
 * No wallet popup, no user interaction needed!
 */
export async function Example6_DecryptWithZkLogin(
  contentId: string,
  subscriptionId: string,
  userAddress: string
) {
  try {
    // No signPersonalMessage needed - uses zkLogin automatically!
    const result = await decryptContentWithZkLogin({
      contentId,
      subscriptionId,
      userAddress,
    });

    // Use decrypted content
    const text = DecryptHelpers.toText(result.data);
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes('zkLogin session')) {
      console.error('Please log in with zkLogin first');
    }
    throw error;
  }
}

/**
 * Example 7: Decrypt multiple files with zkLogin
 */
export async function Example7_DecryptMultipleWithZkLogin(
  userAddress: string,
  items: Array<{
    contentId: string;
    subscriptionId: string;
  }>
) {
  const results = await Promise.allSettled(
    items.map((item) => decryptContentWithZkLogin({ ...item, userAddress }))
  );

  const successful: Array<{ data: Uint8Array }> = [];
  const failed: Array<{ error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({
        error: result.reason?.message || 'Unknown error',
      });
      console.error(`Failed to decrypt item ${index}:`, result.reason);
    }
  });

  return { successful, failed };
}
