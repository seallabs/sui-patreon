import { Command } from 'commander';
import { createContent, createProfile, createTier, purchase } from './builder';
import { createPost, viewPost } from './walrus';

const program = new Command();

program.name('subscription-cli').description('CLI for Subscription actions');

// bun start create-profile "test profile"
program
  .command('create-profile')
  .description('Create a new profile')
  .argument('<info>', 'Profile information')
  .action(createProfile);

// bun start create-tier "test tier" "test description" 1000000
program
  .command('create-tier')
  .description('Create a new tier')
  .argument('<name>', 'Tier name')
  .argument('<description>', 'Tier description')
  .argument('<price_monthly>', 'Tier price monthly')
  .action(createTier);

// bun start purchase 0xfcbc1b5ea045e3e04188583705adc7f17430dde24474bfd83e75ab2ffe6ef3ba 0x7d16fb30c527690e949bf939bf2b65180347007bf3a7b8bafb7027fbf6180805
program
  .command('purchase')
  .description('Purchase a subscription')
  .argument('<tier>', 'Tier object')
  .argument('<payment>', 'Payment object')
  .action(purchase);

/*
bun start create-content 1 "test content" "test description" "video/mp4" \
  "D2CmUpc6qqNERGTjCRstzA73ErRHE7yPA2Yri6uM7j4" 0xfcbc1b5ea045e3e04188583705adc7f17430dde24474bfd83e75ab2ffe6ef3ba false
*/
program
  .command('create-content')
  .description('Create a new content')
  .argument('<nonce>', 'Nonce')
  .argument('<title>', 'Title')
  .argument('<description>', 'Description')
  .argument('<content_type>', 'Content type')
  .argument('<walrus_blob_id>', 'Walrus blob ID')
  .argument('<required_tier_ids>', 'Required tier IDs')
  .argument('<is_public>', 'Is public')
  .action(createContent);

// bun start create-post "test1" 1
program
  .command('create-post')
  .description('Create a new post')
  .argument('<content>', 'Content')
  .argument('<nonce>', 'Nonce')
  .action(createPost);

/*
bun start view-post "D2CmUpc6qqNERGTjCRstzA73ErRHE7yPA2Yri6uM7j4" 0xb7f3816258249cc90bc008e9e70ebc3a828cb852b31d421d5c49725552bd9f5c \
  0x224c692f2c0da7876a1c4a5a4275d311b815d30b6a06c8267dc548a4d159ed8d
*/
program
  .command('view-post')
  .description('View a post by blob ID')
  .argument('<blob_id>', 'Blob ID')
  .argument('<content>', 'Content')
  .argument('<subscription>', 'Subscription')
  .action(viewPost);

program.parse(process.argv);
