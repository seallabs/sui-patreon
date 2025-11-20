import { Command } from 'commander';
import { createContent, createProfile, createTier, deactivateTier, extendBlob, purchase, sendCoin } from './builder';
import { createPost, viewPost } from './walrus';
import {
  displayWalletSummary,
  getAllCoins,
  getCoinsByType,
  getTotalBalance,
  sendAllCoins,
  formatBalance,
} from './wallet';

const program = new Command();

program
  .name('creator-platform-cli')
  .description('CLI for interacting with Creator Platform smart contracts on Sui')
  .version('1.0.0');

// =============================================================================
// Profile Commands
// =============================================================================

program
  .command('create-profile')
  .description('Create a new creator profile')
  .argument('<name>', 'Creator name (e.g., "alice.sui" or "Alice Artist")')
  .argument('<bio>', 'Creator bio/description')
  .argument('<avatarUrl>', 'Avatar image URL')
  .argument('<backgroundUrl>', 'Background/banner image URL')
  .action(createProfile)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start create-profile "Alice Artist" "Digital creator" "https://example.com/avatar.jpg" "https://example.com/background.jpg"\n'
  );

// =============================================================================
// Subscription Tier Commands
// =============================================================================

program
  .command('create-tier')
  .description('Create a new subscription tier')
  .argument('<name>', 'Tier name (e.g., "Basic", "Premium", "VIP")')
  .argument('<description>', 'Tier benefits description')
  .argument('<price>', 'Monthly price in USDC with 6 decimals (e.g., 5000000 = 5 USDC)', parseFloat)
  .action(createTier)
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  $ bun start create-tier "Basic" "Access to basic content" 2000000\n' +
      '  $ bun start create-tier "Premium" "All content + exclusive perks" 10000000\n'
  );

program
  .command('deactivate-tier')
  .description('Deactivate a tier (prevents new subscriptions)')
  .argument('<tierId>', 'Tier object ID to deactivate')
  .action(deactivateTier)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start deactivate-tier 0x123abc...\n' +
      '\nNote: Existing subscriptions remain valid after deactivation.\n'
  );

// =============================================================================
// Subscription Purchase Commands
// =============================================================================

program
  .command('purchase')
  .description('Purchase a subscription to a creator\'s tier')
  .argument('<creator>', 'Creator wallet address (0x...)')
  .argument('<tierId>', 'Tier object ID')
  .argument('<payment>', 'USDC coin object ID with sufficient balance')
  .action(purchase)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start purchase 0xCREATOR_ADDRESS 0xTIER_ID 0xUSDC_COIN_ID\n' +
      '\nTip: Use "sui client objects" to find your USDC coin object IDs\n'
  );

// =============================================================================
// Wallet Commands
// =============================================================================

program
  .command('send-coin')
  .description('Send custom coins (non-SUI) to a destination address')
  .argument('<coinObjectId>', 'Coin object ID to send')
  .argument('<amount>', 'Amount to send (in smallest unit, e.g., 5000000 = 5 USDC)', parseFloat)
  .argument('<recipientAddress>', 'Destination wallet address (0x...)')
  .argument('[coinType]', 'Optional: Full coin type (auto-detected if not provided)')
  .action(sendCoin)
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  # Send 5 USDC (6 decimals) - auto-detect coin type\n' +
      '  $ bun start send-coin 0xCOIN_OBJECT_ID 5000000 0xRECIPIENT_ADDRESS\n\n' +
      '  # Send with explicit coin type\n' +
      '  $ bun start send-coin 0xCOIN_ID 1000000 0xRECIPIENT "0x5d4b...::coin::COIN"\n\n' +
      'Tips:\n' +
      '  - Use "sui client objects" to find your coin object IDs\n' +
      '  - Amount is in smallest unit (e.g., USDC has 6 decimals)\n' +
      '  - Coin type is auto-detected from the coin object if not provided\n' +
      '  - Ensure you have enough SUI for gas fees\n'
  );

program
  .command('wallet-summary')
  .description('Display wallet summary with all coin balances')
  .argument('[address]', 'Optional: Wallet address (defaults to configured wallet)')
  .action(async (address?: string) => {
    await displayWalletSummary(address);
  })
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  # Show your wallet\n' +
      '  $ bun start wallet-summary\n\n' +
      '  # Show another wallet\n' +
      '  $ bun start wallet-summary 0xOTHER_ADDRESS\n'
  );

program
  .command('get-balance')
  .description('Get balance of a specific coin type')
  .argument('<coinType>', 'Full coin type (e.g., "0x2::sui::SUI")')
  .argument('[address]', 'Optional: Wallet address (defaults to configured wallet)')
  .action(async (coinType: string, address?: string) => {
    const { keypair: kp } = await import('./config');
    const walletAddress = address || kp.toSuiAddress();
    const balance = await getTotalBalance(walletAddress, coinType);

    console.log(`\n💰 Balance for ${coinType}`);
    console.log(`   Address: ${walletAddress}`);
    console.log(`   Raw Balance: ${balance}`);

    // Try to format based on known decimals
    if (coinType.includes('::sui::SUI')) {
      console.log(`   Formatted: ${formatBalance(balance, 9)} SUI`);
    } else if (coinType.toLowerCase().includes('usdc')) {
      console.log(`   Formatted: ${formatBalance(balance, 6)} USDC`);
    }
    console.log('');
  })
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  $ bun start get-balance "0x2::sui::SUI"\n' +
      '  $ bun start get-balance "0x5d4b...::coin::COIN" 0xADDRESS\n'
  );

program
  .command('send-all-coins')
  .description('Send all coins of a specific type to a destination')
  .argument('<coinType>', 'Full coin type to send')
  .argument('<recipientAddress>', 'Destination wallet address (0x...)')
  .action(async (coinType: string, recipientAddress: string) => {
    console.log('\n💸 Sending all coins...');
    console.log(`   Coin Type: ${coinType}`);
    console.log(`   To: ${recipientAddress}`);

    try {
      const result = await sendAllCoins(coinType, recipientAddress);

      console.log('\n✅ All coins sent successfully!');
      console.log(`   Transaction: ${result.digest}`);
      console.log(`   From: ${result.from}`);
      console.log(`   To: ${result.to}`);
      console.log(`   Total Amount: ${result.amount}`);
      console.log(`   Coins Merged: ${result.coinCount}`);
    } catch (error: any) {
      console.error('\n❌ Failed to send coins:');
      console.error(`   ${error.message || error}`);
      throw error;
    }
  })
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start send-all-coins "0x5d4b...::coin::COIN" 0xRECIPIENT_ADDRESS\n\n' +
      'Note: This will merge all coins of the specified type and send them\n'
  );

// =============================================================================
// Content Commands
// =============================================================================

program
  .command('create-content')
  .description('Register content with Walrus patch IDs')
  .argument('<nonce>', 'Unique nonce (use incrementing number: 1, 2, 3...)', parseInt)
  .argument('<title>', 'Content title')
  .argument('<description>', 'Content description')
  .argument('<contentType>', 'MIME type (e.g., "video/mp4", "image/jpeg")')
  .argument('<sealedPatchId>', 'Sealed (encrypted) patch ID from Walrus')
  .argument('<blobObjectId>', 'Blob object ID from Walrus')
  .argument('[previewPatchId]', 'Preview patch ID from Walrus (optional)')
  .argument('[tierIds]', 'Comma-separated tier IDs for access control (optional, empty = public)')
  .action((nonce, title, description, contentType, sealedPatchId, blobObjectId, previewPatchId, tierIds) => {
    const tierIdArray = tierIds ? tierIds.split(',').map((id: string) => id.trim()) : undefined;
    return createContent(nonce, title, description, contentType, sealedPatchId, blobObjectId, previewPatchId, tierIdArray);
  })
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  # Public content (no tier restrictions)\n' +
      '  $ bun start create-content 1 "Tutorial" "How to..." "video/mp4" "SEALED_ID" "BLOB_ID" "PREVIEW_ID"\n\n' +
      '  # Tier-restricted content (Premium tier only)\n' +
      '  $ bun start create-content 2 "Exclusive" "Premium content" "video/mp4" "SEALED_ID" "BLOB_ID" "PREVIEW_ID" "0xTIER_ID"\n\n' +
      '  # Multiple tier access (Basic OR Premium)\n' +
      '  $ bun start create-content 3 "Article" "Content" "text/markdown" "SEALED_ID" "BLOB_ID" "" "0xTIER1,0xTIER2"\n\n' +
      'Access Control:\n' +
      '  - No tierIds (or empty) = Public content (anyone can access)\n' +
      '  - With tierIds = Restricted (requires subscription to ANY listed tier)\n'
  );

program
  .command('extend-blob')
  .description('Extend the blob of a content')
  .argument('<contentId>', 'Content object ID')
  .argument('<payment>', 'Payment coin object ID')
  .argument('<epochs>', 'Number of epochs to extend the blob', parseInt)
  .action(extendBlob)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start extend-blob 0xCONTENT_ID 0xPAYMENT_COIN_ID 1\n' +
      '\nThis extends the blob of the content by 1 epoch.\n'
  );

// =============================================================================
// Walrus Integration Commands
// =============================================================================

program
  .command('create-post')
  .description('Create sample post with Walrus upload (for testing)')
  .argument('<nonce>', 'Unique nonce for this post', parseInt)
  .action(createPost)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start create-post 1\n' +
      '\nThis command:\n' +
      '  1. Creates sample content\n' +
      '  2. Uploads to Walrus\n' +
      '  3. Registers on-chain with patch IDs\n'
  );

program
  .command('view-post')
  .description('Verify access and view post content')
  .argument('<contentId>', 'Content object ID')
  .argument('<subscriptionId>', 'ActiveSubscription object ID')
  .action(viewPost)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start view-post 0xCONTENT_ID 0xSUBSCRIPTION_ID\n' +
      '\nThis verifies the subscription grants access to the content.\n'
  );

// Parse and execute
program.parse(process.argv);
