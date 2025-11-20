import { SealClient, SessionKey } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { SignatureWithBytes } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex, toHex } from '@mysten/sui/utils';
import { WalrusClient } from '@mysten/walrus';
import dot from 'dotenv';

// Only load dotenv on server-side (Node.js environment)
if (typeof window === 'undefined') {
  dot.config();
}

export const CONFIG = {
  PACKAGE_ID:
    '0xcac1eabc44bc10496c5adb8892fd20f242e7e1b08974c097fc6020590d976990',
  PUBLISHED_AT:
    '0xcac1eabc44bc10496c5adb8892fd20f242e7e1b08974c097fc6020590d976990',
  PROFILE_REGISTRY:
    '0xd02a58df3d27e47de49c06fde47156b6306eb4846e9b49ac30503db0b1a0a3f9',
  TIER_REGISTRY:
    '0x8ca897415986fca16690214cc530ccb4f595f57cafb238d27d5d8832136aec45',
  CONTENT_REGISTRY:
    '0x15fa8c2e8dad5f9751eb7abdbfcecf9d5d50097d4e4e49f68e979413340a9f56',
  PROFILE_HANDLE:
    '0xcf51a413b4f6f106b19dd90df3155add7b3472eac046f162a643eac71794ebec',
};

// Server-only exports - only initialize on server-side
let keypair: Ed25519Keypair | undefined;
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
  uploadRelay: {
    host: 'https://upload-relay.testnet.walrus.space',
    sendTip: {
      max: 1_000,
    },
  },
});

const sealObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

const sealClient = new SealClient({
  suiClient,
  serverConfigs: sealObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});
let sessionKey: SessionKey | undefined;

// Initialize server-only code only on server-side
if (typeof window === 'undefined') {
  keypair = Ed25519Keypair.fromSecretKey(process.env.PRIVATE_KEY as string);

  // Initialize session key asynchronously
  (async () => {
    if (keypair && suiClient) {
      sessionKey = await SessionKey.create({
        address: keypair.toSuiAddress(),
        packageId: CONFIG.PACKAGE_ID,
        ttlMin: 10, // TTL of 10 minutes
        suiClient,
      });

      const message = sessionKey.getPersonalMessage();
      const { signature } = await keypair.signPersonalMessage(message); // User confirms in wallet
      sessionKey.setPersonalMessageSignature(signature); // Initialization complete
    }
  })();
}

// Export server-only values (will be undefined on client-side)
export { keypair, sealClient, sessionKey, suiClient, walrusClient };

// Export getSessionKey function for creating session keys with user signing
export const getSessionKey = async (
  packageId: string,
  address: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>,
  ttlMin = 10
) => {
  if (!suiClient) {
    throw new Error(
      'suiClient is not initialized. This function can only be called on the server side.'
    );
  }

  const sessionKey = await SessionKey.create({
    address,
    packageId,
    ttlMin,
    suiClient,
  });
  const message = sessionKey.getPersonalMessage();
  const { signature } = await signPersonalMessage(message); // User confirms in wallet
  sessionKey.setPersonalMessageSignature(signature); // Initialization complete
  return sessionKey;
};

export const computeID = (nonce: number, owner: string): string => {
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  view.setBigUint64(0, BigInt(nonce), true);

  const addressBytes = fromHex(owner);
  return toHex(new Uint8Array([...addressBytes, ...nonceBytes]));
};
