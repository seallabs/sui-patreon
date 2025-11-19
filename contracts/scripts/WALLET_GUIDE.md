# Wallet Helper Guide

Comprehensive guide for using wallet helper functions to manage custom coins on Sui blockchain.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [CLI Commands](#cli-commands)
- [Programmatic Usage](#programmatic-usage)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Overview

The wallet utilities provide easy-to-use functions for managing custom coins (not SUI) on the Sui blockchain, including:

- Sending coins to other addresses
- Checking balances
- Viewing wallet summaries
- Merging and splitting coins
- Auto-detecting coin types

## Setup

1. **Configure your environment:**

```bash
# Create .env file if not exists
cp .env.example .env

# Add your private key
# PRIVATE_KEY=suiprivkey1...
```

2. **Install dependencies:**

```bash
cd contracts/scripts
bun install
```

3. **Verify setup:**

```bash
bun start wallet-summary
```

## CLI Commands

### 1. Send Coins

Send a specific amount of custom coins to a destination address.

```bash
# Basic usage (auto-detects coin type)
bun start send-coin <coinObjectId> <amount> <recipientAddress>

# With explicit coin type
bun start send-coin <coinObjectId> <amount> <recipientAddress> <coinType>
```

**Examples:**

```bash
# Send 5 USDC (6 decimals = 5,000,000)
bun start send-coin 0xabc123... 5000000 0xdef456...

# Send with explicit type
bun start send-coin 0xabc123... 1000000 0xdef456... "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
```

**Notes:**
- Amount is in the coin's smallest unit (check decimals)
- Common decimals: USDC = 6, SUI = 9
- Coin type is auto-detected if not provided
- You need SUI for gas fees

### 2. Wallet Summary

Display all coin balances in a wallet.

```bash
# Your wallet
bun start wallet-summary

# Another wallet
bun start wallet-summary 0xOTHER_ADDRESS
```

**Output:**
```
💼 Wallet Summary
   Address: 0x123...

   Coin Balances:
   - SUI: 10.500000000
     Type: 0x2::sui::SUI
   - COIN: 100.000000
     Type: 0x5d4b...::coin::COIN
```

### 3. Get Balance

Get balance for a specific coin type.

```bash
# Your wallet
bun start get-balance "0x2::sui::SUI"

# Another wallet
bun start get-balance "0x2::sui::SUI" 0xOTHER_ADDRESS
```

**Example:**
```bash
# Check USDC balance
bun start get-balance "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
```

### 4. Send All Coins

Send all coins of a specific type to a destination (merges multiple coins if needed).

```bash
bun start send-all-coins <coinType> <recipientAddress>
```

**Example:**
```bash
bun start send-all-coins "0x5d4b...::coin::COIN" 0xRECIPIENT_ADDRESS
```

**Note:** This automatically merges all coins of the specified type before sending.

## Programmatic Usage

### Import Functions

```typescript
import {
  sendCoin,
  getCoinsByType,
  getTotalBalance,
  getAllCoins,
  sendAllCoins,
  splitCoin,
  mergeCoins,
  formatBalance,
  parseAmount,
  displayWalletSummary,
} from './wallet';
```

### Send Coins

```typescript
// Send 5 USDC (6 decimals)
const result = await sendCoin(
  '0xCOIN_OBJECT_ID',
  5_000_000,  // 5 USDC with 6 decimals
  '0xRECIPIENT_ADDRESS'
);

console.log(`Transaction: ${result.digest}`);
console.log(`Sent: ${result.amount} to ${result.to}`);
```

### Check Balances

```typescript
// Get total balance
const balance = await getTotalBalance(
  '0xWALLET_ADDRESS',
  '0x2::sui::SUI'
);
console.log(`Balance: ${formatBalance(balance, 9)} SUI`);

// Get all coin objects
const coins = await getCoinsByType(
  '0xWALLET_ADDRESS',
  '0x5d4b...::coin::COIN'
);

coins.forEach(coin => {
  console.log(`Coin: ${coin.objectId}, Balance: ${coin.balance}`);
});

// Get all coin types
const allCoins = await getAllCoins('0xWALLET_ADDRESS');
allCoins.forEach(({ coinType, balance }) => {
  console.log(`${coinType}: ${balance}`);
});
```

### Merge and Split Coins

```typescript
// Split one coin into multiple
const splitResult = await splitCoin(
  '0xCOIN_OBJECT_ID',
  [1_000_000, 2_000_000, 3_000_000]  // Create 3 new coins
);
console.log(`Created coins: ${splitResult.createdCoins}`);

// Merge multiple coins into one
const mergeResult = await mergeCoins([
  '0xCOIN_1',
  '0xCOIN_2',
  '0xCOIN_3'
]);
console.log(`Merged into: ${mergeResult.primaryCoinId}`);
```

### Format and Parse Amounts

```typescript
// Format balance for display
const balance = 5_000_000n;  // 5 USDC (6 decimals)
console.log(formatBalance(balance, 6));  // "5.000000"

const suiBalance = 10_500_000_000n;  // 10.5 SUI (9 decimals)
console.log(formatBalance(suiBalance, 9));  // "10.500000000"

// Parse human-readable to smallest unit
const amount = parseAmount('5.5', 6);  // 5.5 USDC
console.log(amount);  // 5500000n
```

## Common Use Cases

### 1. Send USDC to User

```typescript
import { sendCoin } from './wallet';

async function sendUSDCReward(recipientAddress: string, usdcAmount: number) {
  // Get user's USDC coin objects
  const coins = await getCoinsByType(
    keypair.toSuiAddress(),
    '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
  );

  if (coins.length === 0) {
    throw new Error('No USDC coins found');
  }

  // Convert to smallest unit (6 decimals)
  const amount = parseAmount(usdcAmount.toString(), 6);

  // Send from first coin
  const result = await sendCoin(
    coins[0].objectId,
    amount,
    recipientAddress
  );

  return result;
}

// Usage
await sendUSDCReward('0xUSER_ADDRESS', 10);  // Send 10 USDC
```

### 2. Check if User Has Enough Balance

```typescript
async function hasEnoughBalance(
  userAddress: string,
  requiredAmount: bigint,
  coinType: string
): Promise<boolean> {
  const balance = await getTotalBalance(userAddress, coinType);
  return balance >= requiredAmount;
}

// Usage
const hasEnough = await hasEnoughBalance(
  '0xUSER_ADDRESS',
  parseAmount('5', 6),  // 5 USDC
  '0x5d4b...::coin::COIN'
);
```

### 3. Distribute Coins to Multiple Recipients

```typescript
async function distributeCoins(
  coinObjectId: string,
  recipients: Array<{ address: string; amount: bigint }>
) {
  // Split coin into exact amounts
  const amounts = recipients.map(r => r.amount);
  const splitResult = await splitCoin(coinObjectId, amounts);

  console.log(`Created ${splitResult.createdCoins.length} coins`);

  // Now transfer each coin to respective recipient
  for (let i = 0; i < recipients.length; i++) {
    const tx = new Transaction();
    tx.transferObjects(
      [tx.object(splitResult.createdCoins[i])],
      tx.pure.address(recipients[i].address)
    );

    await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });
  }
}

// Usage
await distributeCoins('0xCOIN_ID', [
  { address: '0xALICE', amount: 1_000_000n },
  { address: '0xBOB', amount: 2_000_000n },
  { address: '0xCHARLIE', amount: 3_000_000n },
]);
```

### 4. Consolidate Scattered Coins

```typescript
async function consolidateCoins(coinType: string) {
  const address = keypair.toSuiAddress();
  const coins = await getCoinsByType(address, coinType);

  if (coins.length <= 1) {
    console.log('No coins to consolidate');
    return;
  }

  console.log(`Consolidating ${coins.length} coins...`);

  const coinIds = coins.map(c => c.objectId);
  const result = await mergeCoins(coinIds);

  console.log(`Merged ${result.mergedCount} coins into ${result.primaryCoinId}`);
  return result;
}

// Usage
await consolidateCoins('0x5d4b...::coin::COIN');
```

## Troubleshooting

### Error: "Could not determine coin type from object"

**Cause:** Invalid coin object ID or object doesn't exist.

**Solution:**
- Verify the coin object ID using `sui client objects`
- Check you're on the correct network (testnet/mainnet)

### Error: "Insufficient balance"

**Cause:** Coin doesn't have enough balance for the requested amount.

**Solution:**
```bash
# Check coin balance
bun start get-balance "COIN_TYPE"

# Or get individual coin balances
sui client objects --json | jq '.[] | select(.data.type | contains("Coin"))'
```

### Error: "Invalid coin object type format"

**Cause:** Object is not a coin type.

**Solution:**
- Ensure the object ID points to a coin object
- Coin objects have type format: `0x2::coin::Coin<TYPE>`

### Gas Fees

All transactions require SUI for gas fees. Ensure your wallet has enough SUI:

```bash
bun start get-balance "0x2::sui::SUI"
```

### Coin Type Format

Full coin types follow this format:
```
<package_id>::<module>::<type>
```

Examples:
- SUI: `0x2::sui::SUI`
- USDC: `0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN`

### Finding Coin Objects

```bash
# List all objects you own
sui client objects

# Filter for coins
sui client objects --json | jq '.[] | select(.data.type | contains("Coin"))'

# Get specific coin type
sui client objects --json | jq '.[] | select(.data.type | contains("YOUR_COIN_TYPE"))'
```

## Best Practices

1. **Always check balances before sending**
   ```typescript
   const balance = await getTotalBalance(address, coinType);
   if (balance < amount) {
     throw new Error('Insufficient balance');
   }
   ```

2. **Use formatBalance for display**
   ```typescript
   // Don't show raw numbers to users
   console.log(formatBalance(balance, 6));  // "5.000000"
   ```

3. **Consolidate coins periodically**
   - Multiple small coins can be inefficient
   - Use `mergeCoins` or `send-all-coins` to consolidate

4. **Handle errors gracefully**
   ```typescript
   try {
     await sendCoin(coinId, amount, recipient);
   } catch (error) {
     console.error('Failed to send coin:', error.message);
     // Handle error appropriately
   }
   ```

5. **Store coin types in constants**
   ```typescript
   const COIN_TYPES = {
     USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
     SUI: '0x2::sui::SUI',
   };
   ```

## Additional Resources

- [Sui TypeScript SDK Documentation](https://sdk.mystenlabs.com/typescript)
- [Sui Documentation](https://docs.sui.io)
- [Coin Standard](https://docs.sui.io/standards/coin)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review transaction on [Sui Explorer](https://suiexplorer.com)
3. Check SDK logs for detailed error messages
