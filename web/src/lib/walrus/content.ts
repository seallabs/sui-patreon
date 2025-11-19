import { WalrusFile } from '@mysten/walrus';
import { client } from './client';

type Metadata = {
  description: string;
};

export const createContent = async (
  metadata: Metadata,
  file: WalrusFile,
  previewFile: WalrusFile
) => {
  const flow = client.walrus.writeFilesFlow({
    files: [file, previewFile],
  });
  console.time('encode');
  await flow.encode();
  console.timeEnd('encode');

  return flow;
};
type EncryptedContent = {
  ciphertext: Uint8Array;
  key: CryptoKey;
  iv: Uint8Array;
};

const toArrayBuffer = async (
  bytes: Uint8Array | Blob
): Promise<ArrayBuffer> => {
  if (bytes instanceof Blob) {
    return bytes.arrayBuffer();
  }

  const copy = bytes.slice();
  return copy.buffer;
};

export const encryptContent = async (
  bytes: Uint8Array | Blob
): Promise<EncryptedContent> => {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await toArrayBuffer(bytes);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    key,
    iv,
  };
};

/**
 * Encrypt a video file using AES-GCM with a newly generated symmetric key.
 * Returns the encrypted bytes, key, and IV so the caller can store/transmit them.
 *
 * @param file Video file to encrypt (must have a MIME type starting with `video/`)
 */
export const encryptVideoFile = async (
  file: File
): Promise<EncryptedContent> => {
  if (!file.type.startsWith('video/')) {
    throw new Error(
      `encryptVideoFile expected a video file, received ${
        file.type || 'unknown type'
      }`
    );
  }

  const videoBytes = new Uint8Array(await file.arrayBuffer());
  return encryptContent(videoBytes);
};
