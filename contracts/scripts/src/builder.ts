import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { keypair, suiClient, CONFIG } from './config';

/**
 * Standard transaction options for consistent output
 */
function callOptions() {
  return {
    showObjectChanges: true,
    showEffects: true,
    showEvents: true,
  };
}

/**
 * Helper to extract object IDs from transaction results
 */
function extractCreatedObjects(result: any): void {
  if (result.objectChanges) {
    const created = result.objectChanges.filter((change: any) => change.type === 'created');
    if (created.length > 0) {
      console.log('\n📦 Created Objects:');
      created.forEach((obj: any) => {
        console.log(`   ${obj.objectType.split('::').pop()}: ${obj.objectId}`);
      });
    }
  }
}

/**
 * Helper to display emitted events
 */
function displayEvents(result: any): void {
  if (result.events && result.events.length > 0) {
    console.log('\n📢 Events Emitted:');
    result.events.forEach((event: any) => {
      const eventType = event.type.split('::').pop();
      console.log(`   ${eventType}:`, JSON.stringify(event.parsedJson, null, 2));
    });
  }
}

/**
 * Create a creator profile with explicit fields
 *
 * @param name - Creator name (e.g., "alice.sui")
 * @param bio - Creator bio/description
 * @param avatarUrl - Avatar image URL
 * @param backgroundUrl - Background/banner image URL
 */
export async function createProfile(name: string, bio: string, avatarUrl: string, backgroundUrl: string) {
  console.log('\n🎭 Creating Profile...');
  console.log(`   Name: ${name}`);
  console.log(`   Bio: ${bio}`);
  console.log(`   Avatar: ${avatarUrl}`);
  console.log(`   Background: ${backgroundUrl}`);

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::profile::create_profile`,
      arguments: [
        tx.object(CONFIG.PROFILE_REGISTRY),
        tx.pure.string(name),
        tx.pure.string(bio),
        tx.pure.string(avatarUrl),
        tx.pure.string(backgroundUrl),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Profile created successfully!');
    console.log(`   Transaction: ${result.digest}`);
    displayEvents(result);
  } catch (error: any) {
    console.error('\n❌ Failed to create profile:');
    console.error(`   ${error.message || error}`);
    throw error;
  }
}

/**
 * Create a subscription tier
 *
 * @param name - Tier name (e.g., "Premium", "Basic")
 * @param description - Tier benefits description
 * @param priceMonthly - Monthly price in USDC (with 6 decimals, e.g., 5000000 = 5 USDC)
 */
export async function createTier(
  name: string,
  description: string,
  priceMonthly: number
) {
  console.log('\n💎 Creating Subscription Tier...');
  console.log(`   Name: ${name}`);
  console.log(`   Description: ${description}`);
  console.log(`   Price: ${priceMonthly / 1_000_000} USDC/month`);

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::subscription::create_tier`,
      arguments: [
        tx.object(CONFIG.TIER_REGISTRY),
        tx.pure.string(name),
        tx.pure.string(description),
        tx.pure.u64(priceMonthly),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Tier created successfully!');
    console.log(`   Transaction: ${result.digest}`);
    displayEvents(result);
    extractCreatedObjects(result);
  } catch (error: any) {
    console.error('\n❌ Failed to create tier:');
    console.error(`   ${error.message || error}`);
    throw error;
  }
}

/**
 * Deactivate a subscription tier
 * Prevents new subscriptions but keeps existing ones valid
 *
 * @param tierId - Tier object ID to deactivate
 */
export async function deactivateTier(tierId: string) {
  console.log('\n🚫 Deactivating Tier...');
  console.log(`   Tier ID: ${tierId}`);

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::subscription::deactivate_tier`,
      arguments: [
        tx.object(CONFIG.TIER_REGISTRY),
        tx.pure.id(tierId),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Tier deactivated successfully!');
    console.log(`   Transaction: ${result.digest}`);
    console.log('   ⚠️  No new subscriptions can be purchased for this tier');
    console.log('   ✅ Existing subscriptions remain valid');
    displayEvents(result);
  } catch (error: any) {
    console.error('\n❌ Failed to deactivate tier:');
    console.error(`   ${error.message || error}`);
    throw error;
  }
}

/**
 * Purchase a subscription to a creator's tier
 *
 * @param creator - Creator wallet address
 * @param tierId - Tier ID to subscribe to
 * @param payment - USDC coin object ID with sufficient balance
 */
export async function purchase(creator: string, tierId: string, payment: string) {
  console.log('\n💳 Purchasing Subscription...');
  console.log(`   Creator: ${creator}`);
  console.log(`   Tier ID: ${tierId}`);
  console.log(`   Payment Coin: ${payment}`);

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::subscription::purchase_subscription`,
      arguments: [
        tx.object(CONFIG.TIER_REGISTRY),
        tx.pure.address(creator),
        tx.pure.id(tierId),
        tx.object(payment),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Subscription purchased successfully!');
    console.log(`   Transaction: ${result.digest}`);
    console.log('   📅 Duration: 30 days');
    displayEvents(result);
    extractCreatedObjects(result);
  } catch (error: any) {
    console.error('\n❌ Failed to purchase subscription:');
    console.error(`   ${error.message || error}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Ensure payment coin has sufficient USDC balance');
    console.error('   - Verify tier is active');
    console.error('   - Check creator address is correct');
    throw error;
  }
}

/**
 * Send custom coins (non-SUI) to a destination address
 *
 * @param coinObjectId - The coin object ID to send
 * @param amount - Amount to send (in the coin's smallest unit)
 * @param recipientAddress - Destination wallet address
 * @param coinType - Full coin type string (e.g., "0x2::sui::SUI" for SUI, or custom coin type)
 *
 * @example
 * // Send 5 USDC (6 decimals: 5 * 1_000_000)
 * await sendCoin(
 *   "0xCOIN_OBJECT_ID",
 *   5_000_000,
 *   "0xRECIPIENT_ADDRESS",
 *   "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
 * );
 */
export async function sendCoin(
  coinObjectId: string,
  amount: number | bigint,
  recipientAddress: string,
  coinType?: string
) {
  console.log('\n💸 Sending Coin...');
  console.log(`   From: ${keypair.toSuiAddress()}`);
  console.log(`   To: ${recipientAddress}`);
  console.log(`   Amount: ${amount}`);
  console.log(`   Coin Object: ${coinObjectId}`);
  if (coinType) {
    console.log(`   Coin Type: ${coinType}`);
  }

  try {
    const tx = new Transaction();

    // If coin type is not provided, fetch it from the coin object
    if (!coinType) {
      console.log('\n🔍 Fetching coin type...');
      const coinObject = await suiClient.getObject({
        id: coinObjectId,
        options: { showType: true },
      });

      if (!coinObject.data?.type) {
        throw new Error('Could not determine coin type from object');
      }

      // Extract coin type from object type
      // Format: "0x2::coin::Coin<COIN_TYPE>"
      const match = coinObject.data.type.match(/<(.+)>/);
      if (!match) {
        throw new Error('Invalid coin object type format');
      }
      coinType = match[1];
      console.log(`   Detected Coin Type: ${coinType}`);
    }

    // Split the coin to get the exact amount
    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);

    // Transfer the split coin to recipient
    tx.transferObjects([splitCoin], tx.pure.address(recipientAddress));

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Coin sent successfully!');
    console.log(`   Transaction: ${result.digest}`);
    console.log(`   From: ${keypair.toSuiAddress()}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${amount}`);
    displayEvents(result);
  } catch (error: any) {
    console.error('\n❌ Failed to send coin:');
    console.error(`   ${error.message || error}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Ensure coin object ID is correct');
    console.error('   - Verify sufficient coin balance');
    console.error('   - Check recipient address format (must start with 0x)');
    console.error('   - Ensure you have enough SUI for gas fees');
    throw error;
  }
}

/**
 * Create content and register on-chain
 *
 * @param nonce - Unique nonce for this content
 * @param title - Content title
 * @param description - Content description
 * @param contentType - MIME type (e.g., "video/mp4", "image/jpeg")
 * @param sealedPatchId - Sealed (encrypted) patch ID from Walrus
 * @param previewPatchId - Optional preview patch ID (defaults to sealed if not provided)
 * @param tierIds - Optional array of tier IDs that grant access (empty = public)
 */
export async function createContent(
  nonce: number,
  title: string,
  description: string,
  contentType: string,
  sealedPatchId: string,
  blobObjectId: string,
  previewPatchId?: string,
  tierIds?: string[]
) {
  const isPublic = !tierIds || tierIds.length === 0;

  console.log('\n📝 Creating Content...');
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Title: ${title}`);
  console.log(`   Type: ${contentType}`);
  console.log(`   Sealed Patch: ${sealedPatchId.substring(0, 20)}...`);
  console.log(`   Preview Patch: ${(previewPatchId || sealedPatchId).substring(0, 20)}...`);
  console.log(`   Access Control: ${isPublic ? '🌐 Public (no restrictions)' : '🔒 Tier-restricted'}`);

  if (!isPublic) {
    console.log(`   Required Tiers (${tierIds!.length}):`);
    tierIds!.forEach((id, idx) => {
      console.log(`     ${idx + 1}. ${id}`);
    });
  }

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::content::create_content`,
      arguments: [
        tx.object(CONFIG.CONTENT_REGISTRY),
        tx.pure.u64(nonce),
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.string(contentType),
        tx.pure.string(previewPatchId || sealedPatchId),
        tx.pure.string(sealedPatchId),
        tx.pure.vector('id', tierIds || []),
        tx.object(blobObjectId),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Content created successfully!');
    console.log(`   Transaction: ${result.digest}`);

    if (isPublic) {
      console.log('   🌐 Content is PUBLIC - accessible to everyone');
    } else {
      console.log(`   🔒 Content is RESTRICTED - requires subscription to one of ${tierIds!.length} tier(s)`);
    }

    displayEvents(result);
    extractCreatedObjects(result);
  } catch (error: any) {
    console.error('\n❌ Failed to create content:');
    console.error(`   ${error.message || error}`);
    throw error;
  }
}

/**
 * Extend the blob of a content
 *
 * @param contentId - Content object ID
 * @param payment - Payment coin object ID
 * @param epochs - Number of epochs to extend the blob
 */
export async function extendBlob(
  contentId: string,
  payment: string,
  epochs: number
) {
  console.log('\n📝 Extending Blob...');
  console.log(`   Content ID: ${contentId}`);
  console.log(`   Payment Coin: ${payment}`);
  console.log(`   Epochs: ${epochs}`);

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PUBLISHED_AT}::content::extend_blob`,
      arguments: [
        tx.object(contentId),
        tx.object('0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af'),
        tx.object(payment),
        tx.pure.u32(epochs),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: callOptions(),
    });

    console.log('\n✅ Blob extended successfully!');
    console.log(`   Transaction: ${result.digest}`);

    displayEvents(result);
    extractCreatedObjects(result);
  } catch (error: any) {
    console.error('\n❌ Failed to extend blob:');
    console.error(`   ${error.message || error}`);
    throw error;
  }
}
