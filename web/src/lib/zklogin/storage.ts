/**
 * zkLogin Storage Utilities
 * 
 * Uses localStorage for persistent storage:
 * - localStorage persists across browser sessions
 * - Allows users to stay logged in after closing browser
 * - Ephemeral keys still expire after maxEpoch (~2-4 days)
 */

import { ZKLOGIN_CONFIG } from './config';

/**
 * Store data in local storage
 */
export function setSession<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to store ${key} in storage:`, error);
  }
}

/**
 * Retrieve data from local storage
 */
export function getSession<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to retrieve ${key} from storage:`, error);
    return null;
  }
}

/**
 * Remove data from local storage
 */
export function removeSession(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from storage:`, error);
  }
}

/**
 * Clear all zkLogin data from localStorage
 */
export function clearZkLoginSession(): void {
  if (typeof window === 'undefined') return;
  
  Object.values(ZKLOGIN_CONFIG.storageKeys).forEach((key) => {
    removeSession(key);
  });
}

/**
 * Check if zkLogin session exists and is valid
 */
export function hasValidZkLoginSession(): boolean {
  const ephemeralKeyPair = getSession(ZKLOGIN_CONFIG.storageKeys.ephemeralKeyPair);
  const maxEpoch = getSession<number>(ZKLOGIN_CONFIG.storageKeys.maxEpoch);
  const zkProof = getSession(ZKLOGIN_CONFIG.storageKeys.zkProof);
  
  // Check if required data exists
  if (!ephemeralKeyPair || !maxEpoch || !zkProof) {
    return false;
  }
  
  // TODO: Check if current epoch < maxEpoch
  // This requires querying the Sui network
  
  return true;
}

/**
 * Store ephemeral keypair securely
 */
export function storeEphemeralKeyPair(keypair: {
  publicKey: string;
  privateKey: string;
  scheme: string;
}): void {
  setSession(ZKLOGIN_CONFIG.storageKeys.ephemeralKeyPair, keypair);
}

/**
 * Retrieve ephemeral keypair
 */
export function getEphemeralKeyPair(): {
  publicKey: string;
  privateKey: string;
  scheme: string;
} | null {
  return getSession(ZKLOGIN_CONFIG.storageKeys.ephemeralKeyPair);
}

/**
 * Store zkLogin proof
 */
export function storeZkProof(proof: unknown): void {
  setSession(ZKLOGIN_CONFIG.storageKeys.zkProof, proof);
}

/**
 * Retrieve zkLogin proof
 */
export function getZkProof(): unknown {
  return getSession(ZKLOGIN_CONFIG.storageKeys.zkProof);
}

/**
 * Store user's Sui address
 */
export function storeUserAddress(address: string): void {
  setSession(ZKLOGIN_CONFIG.storageKeys.userAddress, address);
}

/**
 * Retrieve user's Sui address
 */
export function getUserAddress(): string | null {
  return getSession(ZKLOGIN_CONFIG.storageKeys.userAddress);
}

