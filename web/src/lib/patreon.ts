import { bcsCreatorInfo } from '@/types/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { CONFIG, suiClient } from './config';

const createProfile = (name: string, bio: string, avatarUrl: string) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::profile::create_profile`,
    arguments: [
      tx.object(CONFIG.PROFILE_REGISTRY),
      tx.pure.string(name),
      tx.pure.string(bio),
      tx.pure.string(avatarUrl),
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
  preview_patch_id: string,
  sealed_patch_id: string,
  tier_ids: string[],
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
      tx.pure.string(preview_patch_id),
      tx.pure.string(sealed_patch_id),
      tx.pure.vector('id', tier_ids),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
};

const updateProfile = (name: string, bio: string, avatarUrl: string) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PUBLISHED_AT}::profile::update_profile`,
    arguments: [
      tx.object(CONFIG.PROFILE_REGISTRY),
      tx.pure.string(name),
      tx.pure.string(bio),
      tx.pure.string(avatarUrl),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
};

const fetchSubscriptions = async (address: string) => {
  suiClient.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${CONFIG.PACKAGE_ID}::subscription::ActiveSubscription`
    }
  })
}

export const patreon = {
  createProfile,
  createTier,
  purchase,
  createContent,
  updateProfile,
};
