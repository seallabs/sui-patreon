# Creator Platform CLI

Command-line interface for interacting with Creator Platform smart contracts on Sui blockchain.

## Prerequisites

- **Bun** runtime installed ([https://bun.sh](https://bun.sh))
- **Sui CLI** installed and configured ([https://docs.sui.io/guides/developer/getting-started/sui-install](https://docs.sui.io/guides/developer/getting-started/sui-install))
- A **funded Sui wallet** with testnet SUI tokens
- **USDC tokens** for subscription purchases (testnet USDC)

---

## Setup Guide

### Step 1: Install Dependencies

```bash
cd contracts/scripts
bun install
```

### Step 2: Get Your Private Key

```bash
# List your wallet addresses
sui client addresses

# Export your private key (copy the entire output including 'suiprivkey1' prefix)
sui keytool export --key-identity <your-address>
```

### Step 3: Deploy Contracts

```bash
# Navigate to contracts directory
cd ../creator_platform

# Deploy to testnet
sui client publish --gas-budget 100000000
```

**Save these IDs from the deployment output:**

Look for "Published Objects" section and copy:
- **Package ID** - The main package identifier
- **ProfileRegistry** - Object with type `creator_platform::profile::ProfileRegistry`
- **TierRegistry** - Object with type `creator_platform::subscription::TierRegistry`
- **ContentRegistry** - Object with type `creator_platform::content::ContentRegistry`

### Step 4: Configure Environment

```bash
# Return to scripts directory
cd ../scripts

# Copy the example environment file
cp .env.example .env

# Edit the file
nano .env
```

Fill in your values:

```bash
SUI_NETWORK=testnet
PRIVATE_KEY=suiprivkey1qqqqqqqqqqqqq...  # From Step 2
PACKAGE_ID=0x485d07bb4f59...             # From Step 3
PROFILE_REGISTRY=0xff0c5345711b...       # From Step 3
TIER_REGISTRY=0x31a69051a888...          # From Step 3
CONTENT_REGISTRY=0x23a1da2b8269...       # From Step 3
```

### Step 5: Fund Your Wallet

```bash
# Get testnet SUI tokens
sui client faucet

# Check your balance
sui client balance
```

For USDC tokens, you'll need to use a testnet faucet or DEX.

### Step 6: Test Your Setup

```bash
# View help
bun start --help

# View help for specific command
bun start create-profile --help
```

---

## Available Commands

### Profile Management

#### Create Profile

Create a new creator profile on the platform.

```bash
bun start create-profile "<name>" "<bio>" "<avatar-url>"
```

**Example:**
```bash
bun start create-profile \
  "Alice Artist" \
  "Digital creator specializing in NFT art" \
  "https://example.com/alice-avatar.jpg"
```

**Output:**
- Transaction digest
- ProfileCreated event with ALL profile data (name, bio, avatar_url)
- Profile is stored in the ProfileRegistry

**Note:** Each wallet address can only create one profile.

---

#### Create Subscription Tier

Create a new subscription tier with custom pricing.

```bash
bun start create-tier "<name>" "<description>" <price-in-usdc>
```

**Examples:**

```bash
# Basic tier - 2 USDC/month
bun start create-tier \
  "Basic" \
  "Access to basic content and monthly updates" \
  2000000

# Premium tier - 10 USDC/month
bun start create-tier \
  "Premium" \
  "All basic content + exclusive tutorials + early access" \
  10000000

# VIP tier - 50 USDC/month
bun start create-tier \
  "VIP" \
  "Everything + 1-on-1 sessions and custom requests" \
  50000000
```

**Price Format:** USDC amount with 6 decimals
- 1000000 = 1 USDC
- 5000000 = 5 USDC
- 10000000 = 10 USDC

**Output:**
- Transaction digest
- TierCreated event with full tier details
- Tier object ID (save this for later use)

---

#### Deactivate Tier

Prevent new subscriptions to a tier while keeping existing ones valid.

```bash
bun start deactivate-tier <tier-id>
```

**Example:**
```bash
bun start deactivate-tier 0x31a69051a888504c7069776f11936d23575e453404d426de7155f2ab19f51591
```

**Effect:**
- Sets tier `is_active = false`
- No new subscriptions can be purchased
- Existing subscriptions continue to work

---

### Subscription Purchase

#### Purchase Subscription

Subscribe to a creator's tier using USDC.

```bash
bun start purchase <creator-address> <tier-id> <usdc-coin-id>
```

**Finding Your USDC Coins:**
```bash
# List all your objects
sui client objects

# Look for USDC coin objects
# Copy one with sufficient balance
```

**Example:**
```bash
bun start purchase \
  0xb7758e1461586bf8cc294a65aa10163b4623293b917464dc41eaea9bf25163ae \
  0xc3f03fd51b2965756d91b0d90aea752cdd03d7d01f354e5d87bf233969186954 \
  0x7d16fb30c527690e949bf939bf2b65180347007bf3a7b8bafb7027fbf6180805
```

**Output:**
- Transaction digest
- SubscriptionPurchased event with subscription details
- ActiveSubscription NFT transferred to your wallet

**Duration:** 30 days from purchase

---

### Content Management

#### Register Content

Register content that's already uploaded to Walrus with optional access control.

```bash
bun start create-content <nonce> "<title>" "<description>" "<content-type>" "<sealed-patch-id>" "[preview-patch-id]" "[tier-ids]"
```

**Examples:**

```bash
# Public content (anyone can access)
bun start create-content 1 \
  "Free Tutorial" \
  "Introduction to digital art" \
  "video/mp4" \
  "qhjKu_wiI33Zkvx1QpitD2INc6BphK5KdGits5MuwFcBAQACAA" \
  "phjKu_preview123456789abcdefgh"

# Premium tier only (single tier)
bun start create-content 2 \
  "Advanced Tutorial" \
  "Advanced techniques for subscribers" \
  "video/mp4" \
  "sealed_abc123..." \
  "preview_xyz789..." \
  "0x31a69051a888504c7069776f11936d23575e453404d426de7155f2ab19f51591"

# Multiple tier access (Basic OR Premium subscribers can access)
bun start create-content 3 \
  "Intermediate Tutorial" \
  "For Basic and Premium subscribers" \
  "video/mp4" \
  "sealed_def456..." \
  "preview_uvw012..." \
  "0xBASIC_TIER_ID,0xPREMIUM_TIER_ID"

# Text content without preview, tier-restricted
bun start create-content 4 \
  "Exclusive Article" \
  "VIP-only written content" \
  "text/markdown" \
  "sealed_ghi789..." \
  "" \
  "0xVIP_TIER_ID"
```

**Parameters:**
- **nonce**: Unique number (1, 2, 3...) for content identification
- **title**: Content title
- **description**: Content description
- **content-type**: MIME type (video/mp4, image/jpeg, text/markdown, etc.)
- **sealed-patch-id**: Encrypted content patch ID from Walrus
- **preview-patch-id**: (Optional) Preview/sample patch ID from Walrus
- **tier-ids**: (Optional) Comma-separated tier IDs for access control

**Access Control:**
- **No tier-ids (or empty string)**: Content is **PUBLIC** - anyone can access
- **One tier-id**: Content requires subscription to **that specific tier**
- **Multiple tier-ids**: Content accessible to subscribers of **ANY listed tier**

---

### Walrus Integration (Testing)

#### Create Post with Walrus Upload

Test the complete workflow: upload to Walrus + register on-chain.

```bash
bun start create-post <nonce>
```

**Example:**
```bash
bun start create-post 1
```

**What it does:**
1. Creates sample content
2. Uploads to Walrus (gets sealed and preview patch IDs)
3. Registers content on-chain

---

#### View Post with Access Verification

Verify that a subscription grants access to content.

```bash
bun start view-post <content-id> <subscription-id>
```

**Example:**
```bash
bun start view-post \
  0x24f4546334da8a2252fb11afd5609ebee5b87815028a1b171fd9f31b3fb32839 \
  0xe3606bab539282e8a7e2a19c16a79b4a333869095521756ed8b8ea84f2e72bfb
```

**What it does:**
- Calls `seal_approve()` on-chain
- Verifies subscription is valid and grants access
- If successful, content can be decrypted

---

## Complete Workflow Example

Here's a complete end-to-end example from creator setup to content access.

### As a Creator:

#### 1. Create Your Profile

```bash
bun start create-profile \
  "alice.sui" \
  "Professional photographer sharing exclusive content" \
  "https://cdn.example.com/alice-avatar.jpg"
```

Save the creator address from your wallet (you'll need it later).

#### 2. Create Subscription Tiers

```bash
# Basic tier
bun start create-tier \
  "Basic" \
  "Monthly photo releases" \
  2000000

# Premium tier
bun start create-tier \
  "Premium" \
  "Weekly content + tutorials" \
  5000000
```

**Save the tier IDs** from the TierCreated events in the output.

#### 3. Upload Content to Walrus

```bash
# Upload your content file to Walrus (using Walrus SDK/CLI)
# This is done separately - see Walrus documentation

# You'll get back:
# - sealed_patch_id (encrypted content)
# - preview_patch_id (public sample)
```

#### 4. Register Content On-Chain

```bash
# Create tier-restricted content (Premium tier only)
bun start create-content 1 \
  "Sunset Photography Collection" \
  "Exclusive high-resolution sunset photos - Premium subscribers only" \
  "image/jpeg" \
  "sealed_abc123..." \
  "preview_xyz789..." \
  "0xPREMIUM_TIER_ID"

# Or create public content (no tier restrictions)
bun start create-content 2 \
  "Free Sample" \
  "Free preview for everyone" \
  "image/jpeg" \
  "sealed_sample..." \
  "preview_sample..."
```

### As a Subscriber:

#### 5. Purchase Subscription

First, find a USDC coin:

```bash
# List your objects to find USDC coins
sui client objects

# Look for USDC coin with sufficient balance
# Copy the object ID
```

Then purchase:

```bash
bun start purchase \
  0xALICE_CREATOR_ADDRESS \
  0xPREMIUM_TIER_ID \
  0xYOUR_USDC_COIN_ID
```

**Save the subscription object ID** from the output.

#### 6. Access Content

```bash
bun start view-post \
  0xCONTENT_OBJECT_ID \
  0xYOUR_SUBSCRIPTION_ID
```

If access is granted, you can decrypt and view the content!

---

## Getting Object IDs

After running commands, object IDs are displayed in the output. You can also query them:

### Find Your Objects

```bash
# List all objects owned by your wallet
sui client objects

# Look for:
# - ActiveSubscription objects
# - USDC coin objects
```

### View Transaction Details

```bash
# View transaction by digest
sui client transaction <tx-digest>
```

### Query Shared Objects

```bash
# The registry objects are shared and don't show in "sui client objects"
# Use the IDs from your deployment (stored in .env)
```

---

## Troubleshooting

### "Missing required environment variables"

**Solution:** Create and configure `.env` file

```bash
cp .env.example .env
nano .env
# Fill in all required values
```

### "Failed to load private key"

**Solution:** Export your private key correctly

```bash
# Get your private key
sui keytool export --key-identity <your-address>

# Copy the ENTIRE output including 'suiprivkey1' prefix to .env
```

### "Insufficient gas"

**Solution:** Fund your wallet

```bash
sui client faucet
```

### "Profile already exists"

**Cause:** Each address can only have one profile

**Solution:** Use a different wallet address or update the existing profile (update command not yet implemented in CLI)

### "Tier not found"

**Causes:**
- Tier ID is incorrect
- Tier belongs to a different creator

**Solution:** Verify the tier ID from the TierCreated event when you created it

### "Insufficient funds" (for subscription purchase)

**Causes:**
- USDC coin doesn't have enough balance
- Wrong coin object ID

**Solution:**
```bash
# Check your USDC coins
sui client objects | grep -i usdc

# Use a coin with balance >= tier price
```

### Finding Object IDs

After transactions complete, look for:

**In console output:**
- "Created Objects" section shows new object IDs
- "Events Emitted" section shows event data

**Using Sui CLI:**
```bash
# View recent transaction
sui client transaction <tx-digest>

# List your objects
sui client objects
```

---

## Command Reference

### Quick Reference

| Command | Description | Example |
|---------|-------------|---------|
| `create-profile` | Create creator profile | `bun start create-profile "Alice" "Bio" "URL"` |
| `create-tier` | Create subscription tier | `bun start create-tier "Premium" "Description" 5000000` |
| `deactivate-tier` | Deactivate a tier | `bun start deactivate-tier 0xTIER_ID` |
| `purchase` | Buy subscription | `bun start purchase 0xCREATOR 0xTIER 0xCOIN` |
| `create-content` | Register content (public/restricted) | `bun start create-content 1 "Title" "Desc" "video/mp4" "SEALED" "PREVIEW" "TIER1,TIER2"` |
| `create-post` | Test: Upload & register | `bun start create-post 1` |
| `view-post` | Test: Verify access | `bun start view-post 0xCONTENT 0xSUB` |

### Get Help

```bash
# View all commands
bun start --help

# View help for specific command
bun start create-profile --help
bun start create-tier --help
bun start purchase --help
```

---

## Project Structure

```
contracts/scripts/
├── src/
│   ├── index.ts      # CLI commands and argument parsing
│   ├── builder.ts    # Transaction builders for contract calls
│   ├── config.ts     # Environment configuration and validation
│   └── walrus.ts     # Walrus integration utilities
├── .env.example      # Example environment file with setup guide
├── .env              # Your configuration (gitignored - DO NOT COMMIT)
├── package.json      # Dependencies and npm scripts
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

---

## Development

### Run TypeScript Directly

```bash
bun run src/index.ts <command> <args>
```

### Build for Distribution

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

---

## Security Reminders

⚠️ **NEVER commit your `.env` file** - It contains your private key

⚠️ **Use testnet for development** - Don't risk real funds

⚠️ **Backup your private key** securely offline

⚠️ **Use separate wallets** for testing and production

---

## Additional Resources

- [Creator Platform Contracts Documentation](../creator_platform/README.md)
- [Sui Documentation](https://docs.sui.io)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Walrus Storage Documentation](https://docs.walrus.site)
- [Backend API Documentation](../../backend/src/routes/README.md)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the [contract documentation](../creator_platform/README.md)
3. Consult [Sui documentation](https://docs.sui.io)

---

**Built on Sui Blockchain**
