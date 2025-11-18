import dot from 'dotenv';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { WalrusClient } from '@mysten/walrus';
import { SealClient, SessionKey } from '@mysten/seal';

dot.config();

export const CONFIG = {
  PACKAGE_ID:
    '0x991435918c36cf32521442f7cb0f50868351f2d0d54071a829079972f734d7f0',
  PUBLISHED_AT:
    '0x991435918c36cf32521442f7cb0f50868351f2d0d54071a829079972f734d7f0',
  PROFILE_REGISTRY:
    '0x25cd0007417f6b85b458597c5bbc8d9a3da20d86e99e4611c7d9907d21d93205',
  TIER_REGISTRY:
    '0xfaf4aa104181b387951620a41a6fc684d23e561fd966e45a69e9fc4854bedbc2',
  CONTENT_REGISTRY:
    '0x265cc7f88f2aca2788155f7c2d2362d43c2ff1dea1c4e97073ccd8ea89972b88',
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
