import dotenv from 'dotenv';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { WalrusClient } from '@mysten/walrus';
import { SealClient, SessionKey } from '@mysten/seal';

// Load environment variables
dotenv.config();

/**
 * Validates required environment variables and provides helpful error messages
 */
function validateEnv(): void {
  const required = [
    'PRIVATE_KEY',
    'PACKAGE_ID',
    'PROFILE_REGISTRY',
    'TIER_REGISTRY',
    'CONTENT_REGISTRY',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables in .env file:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\n📝 Please create a .env file with the following variables:');
    console.error('   cp .env.example .env');
    console.error('   nano .env\n');
    console.error('💡 To get your private key:');
    console.error('   sui keytool export --key-identity <your-address>\n');
    console.error('📦 To deploy contracts and get object IDs:');
    console.error('   cd ../creator_platform');
    console.error('   sui client publish --gas-budget 100000000\n');
    process.exit(1);
  }
}

// Validate environment before proceeding
validateEnv();

/**
 * Network configuration (defaults to testnet)
 */
const NETWORK = (process.env.SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

/**
 * Contract configuration
 * Loaded from environment variables
 */
export const CONFIG = {
  PACKAGE_ID: process.env.PACKAGE_ID!,
  PUBLISHED_AT: process.env.PACKAGE_ID!,
  PROFILE_REGISTRY: process.env.PROFILE_REGISTRY!,
  TIER_REGISTRY: process.env.TIER_REGISTRY!,
  CONTENT_REGISTRY: process.env.CONTENT_REGISTRY!,
  NETWORK,
};

/**
 * Initialize keypair from private key
 * Supports both Bech32 (suiprivkey1...) and hex (0x...) formats
 */
export let keypair: Ed25519Keypair;

try {
  const privateKey = process.env.PRIVATE_KEY!;

  // Check if it's a Bech32 key (starts with 'suiprivkey1')
  if (privateKey.startsWith('suiprivkey1')) {
    keypair = Ed25519Keypair.fromSecretKey(privateKey);
  } else {
    // Assume hex format
    keypair = Ed25519Keypair.fromSecretKey(privateKey);
  }

  console.log(`✅ Wallet loaded: ${keypair.toSuiAddress()}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`📦 Package ID: ${CONFIG.PACKAGE_ID.slice(0, 10)}...`);
} catch (error) {
  console.error('❌ Failed to load private key. Please check your .env file.');
  console.error('💡 Export your key with: sui keytool export --key-identity <address>');
  console.error('   Then copy the entire key (including suiprivkey1 prefix) to .env\n');
  process.exit(1);
}

/**
 * Sui client for blockchain interactions
 */
export const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

/**
 * Walrus client for decentralized storage
 */
export const walrusClient = new WalrusClient({
  network: NETWORK,
  suiClient,
});

/**
 * Seal server configurations for encryption/decryption
 * Uses testnet Seal servers
 */
const sealObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

/**
 * Seal client for access control and encryption
 */
export const sealClient = new SealClient({
  suiClient,
  serverConfigs: sealObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});

/**
 * Session key for Seal operations
 * Automatically created and signed
 */
export const sessionKey = await SessionKey.create({
  address: keypair.toSuiAddress(),
  packageId: CONFIG.PACKAGE_ID,
  ttlMin: 10, // TTL of 10 minutes
  suiClient,
});

const message = sessionKey.getPersonalMessage();
const { signature } = await keypair.signPersonalMessage(message);
sessionKey.setPersonalMessageSignature(signature);

console.log('🔐 Seal session initialized\n');
