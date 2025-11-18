import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { keypair, suiClient, CONFIG } from './config';

export async function createProfile(info: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::profile::create_profile`,
    arguments: [
      tx.object(CONFIG.PROFILE_REGISTRY),
      tx.pure.vector('u8', new TextEncoder().encode(info)),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: callOptions(),
  });
  console.log(result);
}

export async function createTier(
  name: string,
  description: string,
  price_monthly: number
) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::subscription::create_tier`,
    arguments: [
      tx.object(CONFIG.TIER_REGISTRY),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.u64(price_monthly),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: callOptions(),
  });
  console.log(result);
}

export async function purchase(tier: string, payment: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::subscription::purchase_subscription`,
    arguments: [
      tx.object(tier),
      tx.object(payment),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: callOptions(),
  });
  console.log(result);
}

export async function createContent(
  nonce: number,
  title: string,
  description: string,
  content_type: string,
  walrus_blob_id: string,
  required_tier_ids: string,
  is_public: string
) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::content::create_content`,
    arguments: [
      tx.object(CONFIG.CONTENT_REGISTRY),
      tx.pure.u64(nonce),
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.string(content_type),
      tx.pure.string(walrus_blob_id),
      tx.pure.string(walrus_blob_id),
      tx.pure.vector('id', [required_tier_ids]),
      tx.pure.bool(is_public === 'true'),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: callOptions(),
  });
  console.log(result);
}

function callOptions() {
  return {
    showObjectChanges: true,
    showEffects: true,
    showEvents: true,
  };
}
