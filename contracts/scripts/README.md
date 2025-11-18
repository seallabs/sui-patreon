# Creator Platform CLI Scripts

TypeScript-based CLI for testing and interacting with Creator Platform smart contracts on Sui blockchain.

## 📋 Prerequisites

- Node.js 18+ or Bun
- Sui CLI installed and configured
- A funded Sui wallet (testnet/mainnet)
- Deployed Creator Platform smart contracts

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd contracts/scripts
npm install
# or
bun install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Set the following variables:

```bash
SUI_NETWORK=testnet
PRIVATE_KEY=your_private_key_here
PACKAGE_ID=deployed_package_id_here
```

### 3. Get Your Private Key

Export your private key from Sui CLI:

```bash
# List your addresses
sui client addresses

# Export private key for your active address
sui keytool export --key-identity <your-address>
```

Copy the **entire private key** (including the `suiprivkey1` prefix) to `.env`. Both Bech32 format (`suiprivkey1...`) and hex format (`0x...`) are supported.

### 4. Deploy Contracts (if not already deployed)

```bash
cd ../creator_platform
sui client publish --gas-budget 100000000
```

Save the `packageId` from the output and set it in `.env`.

### 5. Fund Your Wallet

Get testnet SUI from the faucet:

```bash
sui client faucet
```

Or use the Discord faucet: https://discord.gg/sui

## 📖 Usage

> **Note for npm users**: When using `npm run cli`, you must add `--` before the command arguments to pass them correctly. For example: `npm run cli -- profile create --name "Alice"`. This is not required when using `bun run cli`.

### Check Configuration

```bash
npm run cli -- info
# or
bun run cli info
```

This displays your network, wallet address, and package ID.

### List Your SUI Coins

```bash
npm run cli -- get-coins
```

This shows all your SUI coins with their IDs and balances (useful for payments).

## 🎭 Profile Commands

### Create a Profile

```bash
npm run cli -- profile create \
  --name "Alice Creator" \
  --bio "Digital artist creating NFT collections" \
  --avatar "https://example.com/avatar.jpg"
```

### List Your Profiles

```bash
npm run cli -- profile list
```

### Get Profile Details

```bash
npm run cli -- profile get --id <profile-object-id>
```

### Update Profile

```bash
npm run cli -- profile update \
  --id <profile-object-id> \
  --bio "Updated bio text" \
  --avatar "https://example.com/new-avatar.jpg"
```

## 💎 Subscription Commands

### Create a Subscription Tier

```bash
npm run cli -- subscription create-tier \
  --name "Gold Tier" \
  --description "Access to exclusive content" \
  --price 5.0
```

The price is in SUI tokens (e.g., `5.0` = 5 SUI/month).

### Get Tier Details

```bash
npm run cli -- subscription get-tier --id <tier-object-id>
```

### Update Tier Price

```bash
npm run cli -- subscription update-tier-price \
  --id <tier-object-id> \
  --price 7.5
```

### Deactivate a Tier

```bash
npm run cli -- subscription deactivate-tier --id <tier-object-id>
```

This prevents new subscriptions but keeps existing ones active.

### Purchase a Subscription

```bash
# First, get your coin IDs
npm run cli -- get-coins

# Then purchase using a coin with sufficient balance
npm run cli -- subscription purchase \
  --tier-id <tier-object-id> \
  --coin-id <sui-coin-object-id>
```

### List Your Subscriptions

```bash
npm run cli -- subscription list
```

### Get Subscription Details

```bash
npm run cli -- subscription get --id <subscription-object-id>
```

## 📝 Content Commands

### Create Content

```bash
npm run cli -- content create \
  --title "Exclusive Tutorial" \
  --description "Advanced techniques for digital art" \
  --type "video/mp4" \
  --blob-id "walrus-blob-id-here" \
  --preview-blob-id "preview-blob-id" \
  --tier-ids "tier1-id,tier2-id" \
  --public
```

Options:
- `--title`: Content title (required)
- `--description`: Content description (required)
- `--type`: MIME type like `video/mp4`, `image/png`, etc. (required)
- `--blob-id`: Walrus blob ID for main content (required)
- `--preview-blob-id`: Walrus blob ID for preview (optional)
- `--tier-ids`: Comma-separated tier IDs that grant access (optional)
- `--public`: Make content publicly accessible (optional flag)

### Get Content Details

```bash
npm run cli -- content get --id <content-object-id>
```

### Verify Access to Content

```bash
npm run cli -- content verify-access \
  --content-id <content-object-id> \
  --subscription-id <subscription-object-id>
```

This calls the `seal_approve` function to verify if the subscription grants access.

### List Content

```bash
npm run cli -- content list
# or filter by creator
npm run cli -- content list --creator <creator-address>
```

**Note**: Listing requires an indexer. The command provides guidance on using event subscriptions.

## 🔄 Complete Workflow Example

Here's a complete workflow from profile creation to content access:

### Step 1: Creator Setup

```bash
# Create creator profile
npm run cli -- profile create \
  --name "Bob Artist" \
  --bio "Professional photographer" \
  --avatar "https://example.com/bob.jpg"

# Save the profile object ID from output
```

### Step 2: Create Subscription Tiers

```bash
# Create basic tier
npm run cli -- subscription create-tier \
  --name "Basic" \
  --description "Monthly photo releases" \
  --price 2.0

# Create premium tier
npm run cli -- subscription create-tier \
  --name "Premium" \
  --description "Weekly content + behind the scenes" \
  --price 5.0

# Save tier object IDs
```

### Step 3: Upload Content to Walrus (separate process)

```bash
# This would be done separately using Walrus SDK or CLI
# walrus upload photo.jpg
# Save the blob ID
```

### Step 4: Register Content

```bash
npm run cli -- content create \
  --title "Sunset Collection 2024" \
  --description "Exclusive sunset photography" \
  --type "image/jpeg" \
  --blob-id "<walrus-blob-id>" \
  --tier-ids "<premium-tier-id>"
```

### Step 5: Subscriber Purchases Access

```bash
# Check available coins
npm run cli -- get-coins

# Purchase subscription
npm run cli -- subscription purchase \
  --tier-id <premium-tier-id> \
  --coin-id <sui-coin-id>

# Save subscription object ID
```

### Step 6: Verify Access

```bash
npm run cli -- content verify-access \
  --content-id <content-object-id> \
  --subscription-id <subscription-object-id>
```

If successful, the subscriber can decrypt and view the content!

## 🛠️ Development

### Build TypeScript

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev -- <command> <args>
```

Example:

```bash
npm run dev -- profile list
```

### Code Quality

Run linting and formatting checks:

```bash
# Run all checks (typecheck + lint + format)
npm run check

# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without modifying files
npm run format:check
```

## 📁 Project Structure

```
contracts/scripts/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── commands/
│   │   ├── profile.ts        # Profile commands
│   │   ├── subscription.ts   # Subscription commands
│   │   └── content.ts        # Content commands
│   └── utils/
│       ├── config.ts         # Environment configuration
│       ├── client.ts         # Sui client setup
│       ├── keypair.ts        # Keypair loading
│       └── helpers.ts        # Utility functions
├── .env.example              # Example environment file
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## 🔐 Security Notes

1. **Never commit `.env` file** - It contains your private key
2. **Use testnet for development** - Don't risk mainnet funds
3. **Backup your private key** - Store it securely offline
4. **Use separate wallets** - Different keys for testing vs production

## 🐛 Troubleshooting

### "PRIVATE_KEY not found"

Make sure you've created `.env` file and set `PRIVATE_KEY`:

```bash
cp .env.example .env
# Edit .env with your private key
```

### "PACKAGE_ID not set"

Deploy the contracts first and add the package ID to `.env`:

```bash
cd ../creator_platform
sui client publish --gas-budget 100000000
# Copy packageId to .env
```

### "Insufficient gas"

Fund your wallet with testnet SUI:

```bash
sui client faucet
```

### "Transaction failed"

Check:
1. Your wallet has enough SUI for gas
2. Package ID is correct in `.env`
3. Object IDs are valid and owned by you
4. Network is correct (testnet/mainnet)

### Getting object IDs

Most commands return the created object IDs. If you lose them:

```bash
# List profiles
npm run cli -- profile list

# List subscriptions
npm run cli -- subscription list

# List coins
npm run cli -- get-coins
```

## 📚 Additional Resources

- [Sui Documentation](https://docs.sui.io)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Walrus Documentation](https://docs.walrus.site)
- [Creator Platform Contracts](../creator_platform/README.md)

## 🤝 Contributing

This CLI is part of the Creator Platform project. For bugs or feature requests, please open an issue.

## 📄 License

Same as the main Creator Platform project.
