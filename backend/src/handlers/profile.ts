// Profile event handlers
import type { SuiEvent } from '@mysten/sui/client';
import { prisma } from '../indexer/checkpoint';
import {
  retryWithBackoff,
  DependencyNotFoundError,
  isDependencyNotFoundError,
} from '../indexer/retry-utils';

/**
 * Handle ProfileCreated event
 * Creates or updates Creator record in database
 */
export async function handleProfileCreated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const { profile_id, creator, name, bio, avatar_url, background_url, topic, timestamp } = event.parsedJson as {
      profile_id: string;
      creator: string;
      name: string;
      bio: string;
      avatar_url: string;
      background_url: string;
      topic: number;
      timestamp: string;
    };

    console.log(`[ProfileCreated] Processing event for creator ${creator}, name: ${name}, topic: ${topic}`);

    // Validate topic is within range 0-9
    const validTopic = typeof topic === 'number' && topic >= 0 && topic <= 9 ? topic : 0;

    // Upsert Creator (idempotent operation)
    await prisma.creator.upsert({
      where: { address: creator },
      update: {
        profileId: profile_id,
        name: name,
        bio: bio,
        avatarUrl: avatar_url || null,
        backgroundUrl: background_url || null,
        topic: validTopic,
      },
      create: {
        address: creator,
        profileId: profile_id,
        name: name,
        bio: bio,
        avatarUrl: avatar_url || null,
        backgroundUrl: background_url || null,
        topic: validTopic,
      },
    });

    console.log(`[ProfileCreated] Successfully indexed creator ${name} (${profile_id}) with topic ${validTopic}`);
  } catch (error) {
    console.error(`[ProfileCreated] Error processing event:`, error);
    throw error;
  }
}

/**
 * Handle ProfileUpdated event
 * Updates Creator record with bio, avatar, and timestamp from event
 * Retries with exponential backoff if profile doesn't exist yet (race condition with ProfileCreated)
 */
export async function handleProfileUpdated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const { profile_id, name, bio, avatar_url, background_url, topic } = event.parsedJson as {
      profile_id: string;
      creator: string;
      name: string;
      bio: string;
      avatar_url: string;
      background_url: string;
      topic: number;
      timestamp: string;
    };

    console.log(`[ProfileUpdated] Processing event for profile ${profile_id}, creator: ${name}, topic: ${topic}`);

    // Validate topic is within range 0-9
    const validTopic = typeof topic === 'number' && topic >= 0 && topic <= 9 ? topic : 0;

    // Retry logic to handle race condition where ProfileUpdated arrives before ProfileCreated
    await retryWithBackoff(
      async () => {
        // Find creator by profileId
        const creatorRecord = await prisma.creator.findUnique({
          where: { profileId: profile_id },
        });

        if (!creatorRecord) {
          // Throw retryable error - ProfileCreated event may not have been processed yet
          throw new DependencyNotFoundError(
            `Creator not found for profileId: ${profile_id}. ProfileCreated event may not have arrived yet.`
          );
        }

        // Update creator with all fields from event
        await prisma.creator.update({
          where: { id: creatorRecord.id },
          data: {
            name: name,
            bio: bio,
            avatarUrl: avatar_url || null,
            backgroundUrl: background_url || null,
            topic: validTopic,
            updatedAt: new Date(),
          },
        });

        console.log(`[ProfileUpdated] Successfully updated profile ${profile_id} for ${name} with topic ${validTopic}`);
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );
  } catch (error) {
    console.error(`[ProfileUpdated] Error processing event:`, error);
    throw error;
  }
}
