import { SealClient, SessionKey } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { WalrusClient } from '@mysten/walrus';
import dot from 'dotenv';

dot.config();

export const CONFIG = {
  PACKAGE_ID:
    '0x485d07bb4f59ba73dfad9a00bf4cd9c303ed2e18f2df35d6a0e04d17bc1c9b54',
  PUBLISHED_AT:
    '0x485d07bb4f59ba73dfad9a00bf4cd9c303ed2e18f2df35d6a0e04d17bc1c9b54',
  PROFILE_REGISTRY:
    '0xff0c5345711b91e4a817a34df10d65c8e4cbc616403d3c6815722ef0368807c0',
  TIER_REGISTRY:
    '0x31a69051a888504c7069776f11936d23575e453404d426de7155f2ab19f51591',
  CONTENT_REGISTRY:
    '0x23a1da2b82690a6383e085c96099a35a1b866f9953580fcb8bdc9184a25134f3',
  PROFILE_HANDLE:
    '0xcf51a413b4f6f106b19dd90df3155add7b3472eac046f162a643eac71794ebec',
};

export const keypair = Ed25519Keypair.fromSecretKey(
  process.env.PRIVATE_KEY as string
);

export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
});

const sealObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

export const sealClient = new SealClient({
  suiClient,
  serverConfigs: sealObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});

export const sessionKey = await SessionKey.create({
  address: keypair.toSuiAddress(),
  packageId: CONFIG.PACKAGE_ID,
  ttlMin: 10, // TTL of 10 minutes
  suiClient,
});

const message = sessionKey.getPersonalMessage();
const { signature } = await keypair.signPersonalMessage(message); // User confirms in wallet
sessionKey.setPersonalMessageSignature(signature); // Initialization complete
