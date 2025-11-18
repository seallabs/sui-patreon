import { SealClient, SessionKey } from '@mysten/seal';
import { SignatureWithBytes } from '@mysten/sui/cryptography';
import { client } from './client';
const serverObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

export const sealClient = new SealClient({
  suiClient: client,
  serverConfigs: serverObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});

export const getSessionKey = async (
  packageId: string,
  address: string,
  signPersonalMessage: (message: Uint8Array) => Promise<SignatureWithBytes>,
  ttlMin = 10
) => {
  const sessionKey = await SessionKey.create({
    address,
    packageId,
    ttlMin,
    suiClient: client,
  });
  const message = sessionKey.getPersonalMessage();
  const { signature } = await signPersonalMessage(message); // User confirms in wallet
  sessionKey.setPersonalMessageSignature(signature); // Initialization complete
  return sessionKey;
};
