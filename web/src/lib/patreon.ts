import { bcsCreatorInfo } from '@/types/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { CONFIG, suiClient } from './config';

const createProfile = (info: typeof bcsCreatorInfo.$inferInput) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::profile::create_profile`,
    arguments: [
      tx.object(CONFIG.PROFILE_REGISTRY),
      tx.pure.vector('u8', bcsCreatorInfo.serialize(info).toBytes()),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
};

const createTier = (
  name: string,
  description: string,
  price_monthly: number
) => {
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
  return tx;
};

const purchase = (creator: string, tier: string, payment: string) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::subscription::purchase_subscription`,
    arguments: [
      tx.object(CONFIG.TIER_REGISTRY),
      tx.object(creator),
      tx.pure.id(tier),
      tx.object(payment),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
};

const createContent = (
  nonce: number,
  title: string,
  description: string,
  content_type: string,
  sealed_patch_id: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::content::create_content`,
    arguments: [
      tx.object(CONFIG.CONTENT_REGISTRY),
      tx.pure.u64(nonce),
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.string(content_type),
      tx.pure.string(sealed_patch_id),
      tx.pure.string(sealed_patch_id),
      tx.pure.vector('id', []),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
};

const updateProfile = (info: typeof bcsCreatorInfo.$inferInput) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::profile::update_profile`,
    arguments: [
      tx.object(CONFIG.PROFILE_REGISTRY),
      tx.pure.vector('u8', bcsCreatorInfo.serialize(info).toBytes()),
    ],
  });
  return tx;
};

export const patreon = {
  createProfile,
  createTier,
  purchase,
  createContent,
  updateProfile,
};
