import { Command } from 'commander';
import { createContent, createProfile, createTier, deactivateTier, purchase } from './builder';
import { createPost, viewPost } from './walrus';

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
  .action(createProfile)
  .addHelpText(
    'after',
    '\nExample:\n' +
      '  $ bun start create-profile "Alice Artist" "Digital creator" "https://example.com/avatar.jpg"\n'
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
  .argument('[previewPatchId]', 'Preview patch ID from Walrus (optional)')
  .argument('[tierIds]', 'Comma-separated tier IDs for access control (optional, empty = public)')
  .action((nonce, title, description, contentType, sealedPatchId, previewPatchId, tierIds) => {
    const tierIdArray = tierIds ? tierIds.split(',').map((id: string) => id.trim()) : undefined;
    return createContent(nonce, title, description, contentType, sealedPatchId, previewPatchId, tierIdArray);
  })
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  # Public content (no tier restrictions)\n' +
      '  $ bun start create-content 1 "Tutorial" "How to..." "video/mp4" "SEALED_ID" "PREVIEW_ID"\n\n' +
      '  # Tier-restricted content (Premium tier only)\n' +
      '  $ bun start create-content 2 "Exclusive" "Premium content" "video/mp4" "SEALED_ID" "PREVIEW_ID" "0xTIER_ID"\n\n' +
      '  # Multiple tier access (Basic OR Premium)\n' +
      '  $ bun start create-content 3 "Article" "Content" "text/markdown" "SEALED_ID" "" "0xTIER1,0xTIER2"\n\n' +
      'Access Control:\n' +
      '  - No tierIds (or empty) = Public content (anyone can access)\n' +
      '  - With tierIds = Restricted (requires subscription to ANY listed tier)\n'
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
