/**
 * zkLogin Configuration
 *
 * Environment variables required:
 * - NEXT_PUBLIC_GOOGLE_CLIENT_ID: OAuth Client ID from Google Cloud Console
 * - NEXT_PUBLIC_SUI_NETWORK: Sui network (mainnet, testnet, devnet)
 * - NEXT_PUBLIC_SUI_RPC_URL: Sui RPC endpoint
 * - NEXT_PUBLIC_APP_URL: Application base URL for OAuth redirects
 */

export const ZKLOGIN_CONFIG = {
  // Google OAuth Configuration
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUrl: `${
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }/auth/callback`,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },

  // Sui Network Configuration
  sui: {
    network: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
    rpcUrl:
      process.env.NEXT_PUBLIC_SUI_RPC_URL ||
      'https://fullnode.testnet.sui.io:443',
  },

  // zkLogin Proving Service
  prover: {
    url: 'https://prover-dev.mystenlabs.com/v1',
  },

  // Salt Service (you'll need to implement your own backend for production)
  salt: {
    url: `${
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }/api/zklogin/salt`,
  },

  // Session Storage Keys
  storageKeys: {
    ephemeralKeyPair: 'zklogin_ephemeral_keypair',
    maxEpoch: 'zklogin_max_epoch',
    randomness: 'zklogin_randomness',
    nonce: 'zklogin_nonce',
    zkProof: 'zklogin_proof',
    jwt: 'zklogin_jwt',
    userSalt: 'zklogin_user_salt',
    userAddress: 'zklogin_user_address',
  },
} as const;

/**
 * Validate that all required environment variables are set
 */
export function validateZkLoginConfig(): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!ZKLOGIN_CONFIG.google.clientId) {
    missing.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}
