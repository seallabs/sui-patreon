// Content event handlers
import type { SuiEvent } from '@mysten/sui/client';
import type { Prisma } from '@prisma/client';
import { prisma, updateCheckpoint, type EventType } from '../indexer/checkpoint';
import {
  retryWithBackoff,
  DependencyNotFoundError,
  isDependencyNotFoundError,
} from '../indexer/retry-utils';

/**
 * Handle ContentCreated event
 * Creates or updates Content and ContentTier records in database with all event fields
 * Retries with exponential backoff if creator or tiers don't exist yet (race conditions)
 */
export async function handleContentCreated(
  event: SuiEvent,
  txDigest: string,
  eventSeq: string
): Promise<void> {
  try {
    const {
      content_id,
      creator,
      title,
      description,
      content_type,
      walrus_blob_id,
      preview_blob_id,
      tier_ids,
      is_public,
      created_at,
    } = event.parsedJson as {
      content_id: string;
      creator: string;
      title: string;
      description: string;
      content_type: string;
      walrus_blob_id: string;
      preview_blob_id: string;
      tier_ids: string[];
      is_public: boolean;
      created_at: string;
    };

    console.log(
      `[ContentCreated] Processing event for content ${title} by creator ${creator}, type: ${content_type}, public: ${is_public}`
    );

    // Retry logic to handle race conditions with ProfileCreated and TierCreated events
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

        // Use transaction to ensure atomicity
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Create or update Content
          const content = await tx.content.upsert({
            where: { contentId: content_id },
            update: {
              title: title,
              description: description || '',
              contentType: content_type,
              walrusBlobId: walrus_blob_id,
              previewBlobId: preview_blob_id || null,
              isPublic: is_public,
            },
            create: {
              contentId: content_id,
              creatorId: creatorRecord.id,
              title: title,
              description: description || '',
              contentType: content_type,
              walrusBlobId: walrus_blob_id,
              previewBlobId: preview_blob_id || null,
              isPublic: is_public,
              createdAt: new Date(Number(created_at)),
            },
          });

          // Delete existing ContentTier entries (to handle updates)
          await tx.contentTier.deleteMany({
            where: { contentId: content.id },
          });

          // Create ContentTier entries for each tier_id
          if (tier_ids && Array.isArray(tier_ids) && tier_ids.length > 0) {
            const missingTiers: string[] = [];

            for (const tierIdOnChain of tier_ids) {
              // Find tier by on-chain tierId
              const tier = await tx.tier.findUnique({
                where: { tierId: tierIdOnChain },
              });

              if (tier) {
                await tx.contentTier.create({
                  data: {
                    contentId: content.id,
                    tierId: tier.id,
                  },
                });
              } else {
                missingTiers.push(tierIdOnChain);
              }
            }

            // If any tiers are missing, throw retryable error
            if (missingTiers.length > 0) {
              throw new DependencyNotFoundError(
                `Tiers not found for tierIds: ${missingTiers.join(', ')}. TierCreated events may not have arrived yet.`
              );
            }
          }
        });

        console.log(`[ContentCreated] Successfully indexed content ${title} (${content_id})`);
      },
      isDependencyNotFoundError,
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    // Update checkpoint
    await updateCheckpoint('ContentCreated' as EventType, eventSeq, txDigest);
  } catch (error) {
    console.error(`[ContentCreated] Error processing event:`, error);
    throw error;
  }
}
