import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { fromHex } from '@mysten/sui/utils';

export function loadKeypairFromPrivateKey(privateKey: string): Ed25519Keypair {
  // Handle Bech32-encoded private keys (suiprivkey1...)
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = decodeSuiPrivateKey(privateKey);
    return Ed25519Keypair.fromSecretKey(decoded.secretKey);
  }

  // Handle hex-encoded private keys
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const secretKey = fromHex(cleanKey);

  return Ed25519Keypair.fromSecretKey(secretKey);
}
