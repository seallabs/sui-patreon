// Main entry point for Sui blockchain event indexer
import { setupListeners, shutdown } from './indexer/event-indexer';

async function main() {
  try {
    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => shutdown());
    process.on('SIGINT', () => shutdown());

    // Start event listeners
    await setupListeners();
  } catch (error) {
    console.error('[Indexer] Fatal error:', error);
    process.exit(1);
  }
}

// Start the indexer
main().catch((error) => {
  console.error('[Indexer] Fatal error:', error);
  process.exit(1);
});
