// Subscription and tier event handlers
import type { SuiEvent } from '@mysten/sui/client';
import { prisma, updateCheckpoint, type EventType } from '../indexer/checkpoint';
import {
  retryWithBackoff,
  DependencyNotFoundError,
  isDependencyNotFoundError,
} from '../indexer/retry-utils';

/**
 * Handle TierCreated event
 * Creates or updates Tier record in database
 * Retries with exponential backoff if creator doesn't exist yet (race condition with ProfileCreated)
 */
export async function handleTierCreated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const { tier_id, creator, name, description, price, is_active, created_at } =
      event.parsedJson as {
        tier_id: string;
        creator: string;
        name: string;
        description: string;
        price: string;
        is_active: boolean;
        created_at: string;
      };

    console.log(`[TierCreated] Processing event for tier ${name} by creator ${creator}`);

    // Retry logic to handle race condition where TierCreated arrives before ProfileCreated
    await retryWithBackoff(
      async () => {
        // Find creator by address
        const creatorRecord = await prisma.creator.findUnique({
          where: { address: creator },
        });

        if (!creatorRecord) {
          // Throw retryable error - ProfileCreated event may not have been processed yet
          throw new DependencyNotFoundError(
            `Creator not found for address: ${creator}. ProfileCreated event may not have arrived yet.`
          );
        }

        // Create Tier (idempotent via unique constraint on tierId)
        await prisma.tier.upsert({
          where: { tierId: tier_id },
          update: {
            name: name,
            description: description || '',
            price: BigInt(price),
            isActive: is_active,
          },
          create: {
            tierId: tier_id,
            creatorId: creatorRecord.id,
            name: name,
            description: description || '',
            price: BigInt(price),
            isActive: is_active,
            createdAt: new Date(Number(created_at)),
          },
        });

        console.log(`[TierCreated] Successfully indexed tier ${name} (${tier_id})`);
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    // Update checkpoint
    await updateCheckpoint('TierCreated' as EventType, eventSeq, txDigest);
  } catch (error) {
    console.error(`[TierCreated] Error processing event:`, error);
    throw error;
  }
}

/**
 * Handle TierPriceUpdated event
 * Updates Tier price in database
 * Retries with exponential backoff if tier doesn't exist yet (race condition with TierCreated)
 */
export async function handleTierPriceUpdated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const { tier_id, old_price, new_price } = event.parsedJson as {
      tier_id: string;
      old_price: string;
      new_price: string;
      timestamp: string;
    };

    console.log(
      `[TierPriceUpdated] Processing event for tier ${tier_id}: ${old_price} -> ${new_price}`
    );

    // Retry logic to handle race condition where TierPriceUpdated arrives before TierCreated
    await retryWithBackoff(
      async () => {
        // Find tier by tierId
        const tier = await prisma.tier.findUnique({
          where: { tierId: tier_id },
        });

        if (!tier) {
          // Throw retryable error - TierCreated event may not have been processed yet
          throw new DependencyNotFoundError(
            `Tier not found for tierId: ${tier_id}. TierCreated event may not have arrived yet.`
          );
        }

        // Update tier price
        await prisma.tier.update({
          where: { id: tier.id },
          data: {
            price: BigInt(new_price),
          },
        });

        console.log(`[TierPriceUpdated] Successfully updated tier ${tier_id} price to ${new_price}`);
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    // Update checkpoint
    await updateCheckpoint('TierPriceUpdated' as EventType, eventSeq, txDigest);
  } catch (error) {
    console.error(`[TierPriceUpdated] Error processing event:`, error);
    throw error;
  }
}

/**
 * Handle TierDeactivated event
 * Sets Tier isActive to false in database with full event context
 * Retries with exponential backoff if tier doesn't exist yet (race condition with TierCreated)
 */
export async function handleTierDeactivated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const { tier_id, creator, name, description, price } = event.parsedJson as {
      tier_id: string;
      creator: string;
      name: string;
      description: string;
      price: string;
      timestamp: string;
    };

    console.log(
      `[TierDeactivated] Processing event for tier ${name} (${tier_id}) by creator ${creator}`
    );

    // Retry logic to handle race condition where TierDeactivated arrives before TierCreated
    await retryWithBackoff(
      async () => {
        // Find tier by tierId
        const tier = await prisma.tier.findUnique({
          where: { tierId: tier_id },
        });

        if (!tier) {
          // Throw retryable error - TierCreated event may not have been processed yet
          throw new DependencyNotFoundError(
            `Tier not found for tierId: ${tier_id}. TierCreated event may not have arrived yet.`
          );
        }

        // Deactivate tier and ensure data is up-to-date from event
        await prisma.tier.update({
          where: { id: tier.id },
          data: {
            isActive: false,
            name: name,
            description: description || '',
            price: BigInt(price),
          },
        });

        console.log(`[TierDeactivated] Successfully deactivated tier ${name} (${tier_id})`);
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    // Update checkpoint
    await updateCheckpoint('TierDeactivated' as EventType, eventSeq, txDigest);
  } catch (error) {
    console.error(`[TierDeactivated] Error processing event:`, error);
    throw error;
  }
}

/**
 * Handle SubscriptionPurchased event
 * Creates or updates Subscription record in database with all event fields
 * Retries with exponential backoff if tier doesn't exist yet (race condition with TierCreated)
 */
export async function handleSubscriptionPurchased(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const {
      subscription_id,
      subscriber,
      creator,
      tier_id,
      tier_name,
      amount,
      started_at,
      expires_at,
    } = event.parsedJson as {
      subscription_id: string;
      subscriber: string;
      creator: string;
      tier_id: string;
      tier_name: string;
      amount: string;
      started_at: string;
      expires_at: string;
    };

    console.log(
      `[SubscriptionPurchased] Processing subscription for ${subscriber} to tier ${tier_name} (${tier_id}) by creator ${creator}, amount: ${amount} MIST`
    );

    // Retry logic to handle race condition where SubscriptionPurchased arrives before TierCreated
    await retryWithBackoff(
      async () => {
        // Find tier by tierId
        const tier = await prisma.tier.findUnique({
          where: { tierId: tier_id },
        });

        if (!tier) {
          // Throw retryable error - TierCreated event may not have been processed yet
          throw new DependencyNotFoundError(
            `Tier not found for tierId: ${tier_id}. TierCreated event may not have arrived yet.`
          );
        }

        // Convert timestamps (in milliseconds)
        const startsAtDate = new Date(Number(started_at));
        const expiresAtDate = new Date(Number(expires_at));

        // Create Subscription (idempotent via unique constraint on subscriptionId)
        await prisma.subscription.upsert({
          where: { subscriptionId: subscription_id },
          update: {
            subscriber: subscriber,
            startsAt: startsAtDate,
            expiresAt: expiresAtDate,
            isActive: expiresAtDate > new Date(),
          },
          create: {
            subscriptionId: subscription_id,
            subscriber: subscriber,
            tierId: tier.id,
            startsAt: startsAtDate,
            expiresAt: expiresAtDate,
            isActive: expiresAtDate > new Date(),
          },
        });

        console.log(
          `[SubscriptionPurchased] Successfully indexed subscription ${subscription_id}: ${subscriber} -> ${tier_name} (${amount} MIST)`
        );
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    // Update checkpoint
    await updateCheckpoint('SubscriptionPurchased' as EventType, eventSeq, txDigest);
  } catch (error) {
    console.error(`[SubscriptionPurchased] Error processing event:`, error);
    throw error;
  }
}
