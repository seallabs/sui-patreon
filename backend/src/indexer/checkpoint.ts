// Checkpoint management utilities for resumable event indexing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type EventType =
  | 'ProfileCreated'
  | 'ProfileUpdated'
  | 'TierCreated'
  | 'TierPriceUpdated'
  | 'TierDeactivated'
  | 'SubscriptionPurchased'
  | 'ContentCreated';

/**
 * Retrieve the last checkpoint for a given event type
 */
export async function getCheckpoint(eventType: EventType): Promise<{
  lastEventSeq: string;
  lastTxDigest: string;
} | null> {
  const checkpoint = await prisma.indexerCheckpoint.findUnique({
    where: { eventType },
  });

  if (checkpoint) {
    console.log(
      `[Checkpoint] Resuming ${eventType} from sequence ${checkpoint.lastEventSeq}, tx ${checkpoint.lastTxDigest}`
    );
    return {
      lastEventSeq: checkpoint.lastEventSeq,
      lastTxDigest: checkpoint.lastTxDigest,
    };
  }

  return null;
}

/**
 * Update checkpoint after successfully processing an event
 */
export async function updateCheckpoint(
  eventType: EventType,
  eventSeq: string,
  txDigest: string
): Promise<void> {
  await prisma.indexerCheckpoint.upsert({
    where: { eventType },
    update: {
      lastEventSeq: eventSeq,
      lastTxDigest: txDigest,
    },
    create: {
      eventType,
      lastEventSeq: eventSeq,
      lastTxDigest: txDigest,
    },
  });
}

export { prisma };
