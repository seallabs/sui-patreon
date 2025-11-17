// Sui blockchain indexer
import dotenv from 'dotenv';

dotenv.config();

async function startIndexer() {
  console.log('Sui Indexer starting...');
  console.log('Network:', process.env.SUI_NETWORK || 'testnet');

  // TODO: Implement indexer logic
  // - Connect to Sui RPC
  // - Subscribe to events
  // - Index creator platform transactions
}

startIndexer().catch(console.error);
