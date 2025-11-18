// Core event indexer logic with polling-based event processing
import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import type { SuiEvent, EventId, SuiEventFilter } from '@mysten/sui/client';
import { getCheckpoint, type EventType, prisma } from './checkpoint';
import { handleProfileCreated, handleProfileUpdated } from '../handlers/profile';
import {
  handleTierCreated,
  handleTierPriceUpdated,
  handleTierDeactivated,
  handleSubscriptionPurchased,
} from '../handlers/subscription';
import { handleContentCreated } from '../handlers/content';

// Configuration from environment
const PACKAGE_ID = process.env.PACKAGE_ID;
const SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 5000;
const QUERY_LIMIT = Number(process.env.QUERY_LIMIT) || 50;

if (!PACKAGE_ID) {
  throw new Error('PACKAGE_ID environment variable is required');
}

// Initialize Sui client
const suiClient = new SuiClient({
  url: getFullnodeUrl(SUI_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'),
});

// Type definitions
type SuiEventsCursor = EventId | null | undefined;

type EventExecutionResult = {
  cursor: SuiEventsCursor;
  hasNextPage: boolean;
  lastProcessedSeq: string | null;
};

type EventTracker = {
  type: EventType;
  filter: SuiEventFilter;
  callback: (event: SuiEvent, txDigest: string, eventSeq: string) => Promise<void>;
};

// Event trackers configuration
const EVENTS_TO_TRACK: EventTracker[] = [
  {
    type: 'ProfileCreated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::profile::ProfileCreated`,
    },
    callback: handleProfileCreated,
  },
  {
    type: 'ProfileUpdated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::profile::ProfileUpdated`,
    },
    callback: handleProfileUpdated,
  },
  {
    type: 'TierCreated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::TierCreated`,
    },
    callback: handleTierCreated,
  },
  {
    type: 'TierPriceUpdated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::TierPriceUpdated`,
    },
    callback: handleTierPriceUpdated,
  },
  {
    type: 'TierDeactivated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::TierDeactivated`,
    },
    callback: handleTierDeactivated,
  },
  {
    type: 'SubscriptionPurchased',
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::SubscriptionPurchased`,
    },
    callback: handleSubscriptionPurchased,
  },
  {
    type: 'ContentCreated',
    filter: {
      MoveEventType: `${PACKAGE_ID}::content::ContentCreated`,
    },
    callback: handleContentCreated,
  },
];

/**
 * Execute a single event query and process results
 */
const executeEventJob = async (
  tracker: EventTracker,
  cursor: SuiEventsCursor,
  lastProcessedSeq: string | null
): Promise<EventExecutionResult> => {
  try {
    const { data, hasNextPage, nextCursor } = await suiClient.queryEvents({
      query: tracker.filter,
      cursor,
      limit: QUERY_LIMIT,
      order: 'ascending',
    });

    let latestProcessedSeq = lastProcessedSeq;

    // Process each event
    for (const event of data) {
      const eventSeq = event.id.eventSeq;
      const txDigest = event.id.txDigest;

      // Skip if already processed (use in-memory tracking, not DB query)
      if (lastProcessedSeq && BigInt(eventSeq) <= BigInt(lastProcessedSeq)) {
        continue;
      }

      console.log(`[${tracker.type}] Processing event seq ${eventSeq}, tx ${txDigest}`);

      try {
        await tracker.callback(event, txDigest, eventSeq);
        latestProcessedSeq = eventSeq; // Update in-memory tracker
      } catch (error) {
        console.error(`[${tracker.type}] Error processing event ${eventSeq}:`, error);
        // Continue processing other events despite errors
      }
    }

    // Return cursor for next iteration
    if (nextCursor && data.length > 0) {
      return {
        cursor: nextCursor,
        hasNextPage,
        lastProcessedSeq: latestProcessedSeq,
      };
    }
  } catch (error) {
    console.error(`[${tracker.type}] Error querying events:`, error);

    // If error is "Invalid params", likely due to invalid cursor - reset and start from beginning
    if (error instanceof Error && error.message.includes('Invalid params')) {
      console.warn(
        `[${tracker.type}] Invalid cursor detected, resetting to start from beginning`
      );
      return {
        cursor: undefined,
        hasNextPage: false,
        lastProcessedSeq: null,
      };
    }
  }

  return {
    cursor,
    hasNextPage: false,
    lastProcessedSeq,
  };
};

/**
 * Run polling job for a specific event type
 */
const runEventJob = async (
  tracker: EventTracker,
  cursor: SuiEventsCursor,
  lastProcessedSeq: string | null
): Promise<void> => {
  const result = await executeEventJob(tracker, cursor, lastProcessedSeq);

  // Schedule next iteration
  setTimeout(
    () => {
      runEventJob(tracker, result.cursor, result.lastProcessedSeq);
    },
    result.hasNextPage ? 0 : POLL_INTERVAL
  );
};

/**
 * Setup event listeners for all tracked events
 * This is the main entry point called from the indexer
 */
export const setupListeners = async (): Promise<void> => {
  console.log('='.repeat(60));
  console.log('[Indexer] Sui Patreon Event Indexer Starting...');
  console.log('[Indexer] Using polling-based queryEvents API');
  console.log('='.repeat(60));
  console.log(`[Indexer] Package ID: ${PACKAGE_ID}`);
  console.log(`[Indexer] Network: ${SUI_NETWORK}`);
  console.log(`[Indexer] Poll Interval: ${POLL_INTERVAL}ms`);
  console.log(`[Indexer] Query Limit: ${QUERY_LIMIT} events per query`);
  console.log('='.repeat(60));

  try {
    // Test database connection
    await prisma.$connect();
    console.log(`[Indexer] Database connection established`);

    console.log(`[Indexer] Indexer is running. Press Ctrl+C to stop.`);
    console.log('='.repeat(60));

    // Start polling for each event type
    for (const tracker of EVENTS_TO_TRACK) {
      const checkpoint = await getCheckpoint(tracker.type);
      // Convert string eventSeq back to EventId cursor format, or use undefined if no checkpoint
      const cursor: SuiEventsCursor = checkpoint
        ? { eventSeq: checkpoint.lastEventSeq, txDigest: checkpoint.lastTxDigest }
        : undefined;

      const lastProcessedSeq = checkpoint?.lastEventSeq ?? null;

      console.log(`[${tracker.type}] Starting event polling...`);
      runEventJob(tracker, cursor, lastProcessedSeq);
    }
  } catch (error) {
    console.error(`[Indexer] Failed to start indexer:`, error);
    await prisma.$disconnect();
    throw error;
  }
};

/**
 * Graceful shutdown handler
 */
export async function shutdown(): Promise<void> {
  console.log(`[Indexer] Shutting down gracefully...`);
  await prisma.$disconnect();
  console.log(`[Indexer] Cleanup complete`);
  process.exit(0);
}
