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
import { WalrusFile } from '@mysten/walrus';

export async function createPost(nonce: number) {
  const contents = ['content1', 'content2'];
  const needEncrypt = [true, false];
  let files: WalrusFile[] = [];

  for (let i = 0; i < contents.length; i++) {
    let content = new TextEncoder().encode(contents[i]);
    if (needEncrypt[i]) {
      const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
        threshold: 2,
        packageId: CONFIG.PACKAGE_ID,
        id: computeID(nonce),
        data: content,
      });
      content = encryptedBytes;
    }

    files.push(
      WalrusFile.from({
        contents: content,
        identifier: `content${i}.txt`,
      })
    );
  }

  await createContent(files);
}

async function createContent(files: WalrusFile[]) {
  // Step 1: Create and encode the flow (can be done immediately when file is selected)
  const flow = walrusClient.writeFilesFlow({ files });
  await flow.encode();

  // Step 2: Register the blob (triggered by user clicking a register button after the encode step)
  const registerTx = flow.register({
    epochs: 10,
    owner: keypair.toSuiAddress(),
    deletable: true,
  });

  const { digest } = await suiClient.signAndExecuteTransaction({
    transaction: registerTx,
    signer: keypair,
  });
  await flow.upload({ digest });

  // Step 3: Certify the blob (triggered by user clicking a certify button after the blob is uploaded)
  const certifyTx = flow.certify();
  await suiClient.signAndExecuteTransaction({
    transaction: certifyTx,
    signer: keypair,
  });

  // Step 4: Get the new files
  const newFiles = await flow.listFiles();
  console.log('Uploaded files', newFiles);
}

export async function viewPost(contentId: string, subscription: string) {
  // 1. get the content from Sui
  const content = await suiClient.getObject({
    id: contentId,
    options: { showContent: true },
  });
  if (!content) {
    throw new Error('Content not found in Sui');
  }

  const patchId = (content.data?.content as any).fields.sealed_patch_id;
  if (!patchId) {
    throw new Error('Patch ID not found in Walrus');
  }

  // 2. get the post from walrus
  const [patch] = await walrusClient.getFiles({ ids: [patchId] });
  const encryptedBytes = await patch.bytes();

  // 3. decrypt the content with seal
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::content::seal_approve`,
    arguments: [
      tx.pure.vector('u8', fromHex(EncryptedObject.parse(encryptedBytes).id)),
      tx.object(contentId),
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
