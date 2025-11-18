import { Transaction } from '@mysten/sui/transactions';
import {
  keypair,
  suiClient,
  walrusClient,
  sealClient,
  sessionKey,
  CONFIG,
} from './config';
import { fromHex, SUI_CLOCK_OBJECT_ID, toHex } from '@mysten/sui/utils';
import { EncryptedObject } from '@mysten/seal';

export async function createPost(content: string, nonce: number) {
  // 1. encrypt the content with seal
  const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
    threshold: 2,
    packageId: CONFIG.PACKAGE_ID,
    id: computeID(nonce),
    data: new TextEncoder().encode(content),
  });

  // 2. submit encrypted post to walrus
  const { blobId, blobObject } = await walrusClient.writeBlob({
    blob: encryptedBytes,
    deletable: true,
    epochs: 1,
    signer: keypair,
  });

  console.log(blobId, blobObject);
}

export async function viewPost(
  blobId: string,
  content: string,
  subscription: string
) {
  // 1. get the post from walrus
  const blobBytes = await walrusClient.readBlob({ blobId });
  const blob = new Blob([new Uint8Array(blobBytes)]);
  const encryptedBytes = new Uint8Array(await blob.arrayBuffer());
  const encryptedObject = EncryptedObject.parse(encryptedBytes);

  // 2. decrypt the content with seal
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::content::seal_approve`,
    arguments: [
      tx.pure.vector('u8', fromHex(encryptedObject.id)),
      tx.object(content),
      tx.object(subscription),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const txBytes = await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  const decryptedBytes = await sealClient.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes,
  });

  const result = new TextDecoder('utf-8').decode(
    new Uint8Array(decryptedBytes)
  );
  console.log(result);
}

function computeID(nonce: number): string {
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  view.setBigUint64(0, BigInt(nonce), true);

  const addressBytes = fromHex(keypair.toSuiAddress());
  return toHex(new Uint8Array([...addressBytes, ...nonceBytes]));
}
