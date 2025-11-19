import { Transaction } from '@mysten/sui/transactions';
import { keypair, suiClient } from './config';

/**
 * Wallet utility functions for managing coins on Sui
 */

/**
 * Get all coin objects of a specific type owned by an address
 *
 * @param owner - Wallet address to query
 * @param coinType - Full coin type (e.g., "0x2::sui::SUI")
 * @returns Array of coin objects with their balances
 */
export async function getCoinsByType(owner: string, coinType: string) {
  const coins = await suiClient.getCoins({
    owner,
    coinType,
  });

  return coins.data.map((coin) => ({
    objectId: coin.coinObjectId,
    balance: BigInt(coin.balance),
    digest: coin.digest,
  }));
}

/**
 * Get total balance of a specific coin type
 *
 * @param owner - Wallet address to query
 * @param coinType - Full coin type
 * @returns Total balance as BigInt
 */
export async function getTotalBalance(owner: string, coinType: string): Promise<bigint> {
  const balance = await suiClient.getBalance({
    owner,
    coinType,
  });

  return BigInt(balance.totalBalance);
}

/**
 * Get all coin types owned by an address
 *
 * @param owner - Wallet address to query
 * @returns Array of coin types with their balances
 */
export async function getAllCoins(owner: string) {
  const allCoins = await suiClient.getAllCoins({
    owner,
  });

  // Group by coin type and sum balances
  const coinMap = new Map<string, bigint>();

  for (const coin of allCoins.data) {
    const currentBalance = coinMap.get(coin.coinType) || 0n;
    coinMap.set(coin.coinType, currentBalance + BigInt(coin.balance));
  }

  return Array.from(coinMap.entries()).map(([coinType, balance]) => ({
    coinType,
    balance,
  }));
}

/**
 * Send custom coins to a destination address
 * This is a wrapper around the sendCoin function from builder.ts
 *
 * @param coinObjectId - The coin object ID to send
 * @param amount - Amount to send (in the coin's smallest unit)
 * @param recipientAddress - Destination wallet address
 * @param coinType - Optional: Full coin type string (auto-detected if not provided)
 */
export async function sendCoin(
  coinObjectId: string,
  amount: number | bigint,
  recipientAddress: string,
  coinType?: string
) {
  const tx = new Transaction();

  // If coin type is not provided, fetch it from the coin object
  let finalCoinType = coinType;
  if (!finalCoinType) {
    const coinObject = await suiClient.getObject({
      id: coinObjectId,
      options: { showType: true },
    });

    if (!coinObject.data?.type) {
      throw new Error('Could not determine coin type from object');
    }

    // Extract coin type from object type
    // Format: "0x2::coin::Coin<COIN_TYPE>"
    const match = coinObject.data.type.match(/<(.+)>/);
    if (!match) {
      throw new Error('Invalid coin object type format');
    }
    finalCoinType = match[1];
  }

  // Split the coin to get the exact amount
  const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);

  // Transfer the split coin to recipient
  tx.transferObjects([splitCoin], tx.pure.address(recipientAddress));

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showObjectChanges: true,
      showEffects: true,
      showEvents: true,
    },
  });

  return {
    digest: result.digest,
    from: keypair.toSuiAddress(),
    to: recipientAddress,
    amount: amount.toString(),
    coinType: finalCoinType,
  };
}

/**
 * Send all coins of a specific type to a destination address
 *
 * @param coinType - Full coin type to send
 * @param recipientAddress - Destination wallet address
 * @returns Transaction result with total amount sent
 */
export async function sendAllCoins(coinType: string, recipientAddress: string) {
  const sender = keypair.toSuiAddress();
  const coins = await getCoinsByType(sender, coinType);

  if (coins.length === 0) {
    throw new Error(`No coins of type ${coinType} found`);
  }

  const tx = new Transaction();

  // Merge all coins into the first one
  if (coins.length > 1) {
    const primaryCoin = tx.object(coins[0].objectId);
    const coinsToMerge = coins.slice(1).map((c) => tx.object(c.objectId));
    tx.mergeCoins(primaryCoin, coinsToMerge);
    tx.transferObjects([primaryCoin], tx.pure.address(recipientAddress));
  } else {
    // Just transfer the single coin
    tx.transferObjects([tx.object(coins[0].objectId)], tx.pure.address(recipientAddress));
  }

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showObjectChanges: true,
      showEffects: true,
      showEvents: true,
    },
  });

  const totalAmount = coins.reduce((sum, coin) => sum + coin.balance, 0n);

  return {
    digest: result.digest,
    from: sender,
    to: recipientAddress,
    amount: totalAmount.toString(),
    coinType,
    coinCount: coins.length,
  };
}

/**
 * Split a coin into multiple smaller coins
 *
 * @param coinObjectId - Coin object to split
 * @param amounts - Array of amounts for each new coin
 * @returns Transaction result with created coin IDs
 */
export async function splitCoin(coinObjectId: string, amounts: (number | bigint)[]) {
  const tx = new Transaction();

  const splitCoins = tx.splitCoins(
    tx.object(coinObjectId),
    amounts.map((amt) => tx.pure.u64(amt))
  );

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showObjectChanges: true,
      showEffects: true,
    },
  });

  // Extract created coin IDs
  const createdCoins =
    result.objectChanges
      ?.filter((change) => change.type === 'created' && change.objectType.includes('::coin::Coin'))
      .map((change: any) => change.objectId) || [];

  return {
    digest: result.digest,
    createdCoins,
    amounts: amounts.map((a) => a.toString()),
  };
}

/**
 * Merge multiple coins into one
 *
 * @param coinObjectIds - Array of coin object IDs to merge (must be same type)
 * @returns Transaction result with the primary coin ID
 */
export async function mergeCoins(coinObjectIds: string[]) {
  if (coinObjectIds.length < 2) {
    throw new Error('Need at least 2 coins to merge');
  }

  const tx = new Transaction();

  const primaryCoin = tx.object(coinObjectIds[0]);
  const coinsToMerge = coinObjectIds.slice(1).map((id) => tx.object(id));

  tx.mergeCoins(primaryCoin, coinsToMerge);

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showObjectChanges: true,
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
    primaryCoinId: coinObjectIds[0],
    mergedCount: coinObjectIds.length - 1,
  };
}

/**
 * Format balance with decimals for display
 *
 * @param balance - Balance in smallest unit
 * @param decimals - Number of decimals (e.g., 6 for USDC, 9 for SUI)
 * @returns Formatted string
 */
export function formatBalance(balance: bigint | string, decimals: number): string {
  const balanceBigInt = typeof balance === 'string' ? BigInt(balance) : balance;
  const divisor = 10n ** BigInt(decimals);
  const whole = balanceBigInt / divisor;
  const fraction = balanceBigInt % divisor;

  // Pad fraction with leading zeros
  const fractionStr = fraction.toString().padStart(decimals, '0');

  return `${whole}.${fractionStr}`;
}

/**
 * Parse amount from human-readable format to smallest unit
 *
 * @param amount - Amount in human-readable format (e.g., "5.5")
 * @param decimals - Number of decimals
 * @returns Amount in smallest unit as bigint
 */
export function parseAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');

  // Pad or truncate fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);

  const wholeUnits = BigInt(whole || '0') * 10n ** BigInt(decimals);
  const fractionalUnits = BigInt(paddedFraction);

  return wholeUnits + fractionalUnits;
}

/**
 * Display wallet summary with all coin balances
 *
 * @param address - Optional: Wallet address (defaults to current keypair)
 */
export async function displayWalletSummary(address?: string) {
  const walletAddress = address || keypair.toSuiAddress();

  console.log('\n💼 Wallet Summary');
  console.log(`   Address: ${walletAddress}\n`);

  const coins = await getAllCoins(walletAddress);

  if (coins.length === 0) {
    console.log('   No coins found in wallet\n');
    return;
  }

  console.log('   Coin Balances:');
  for (const { coinType, balance } of coins) {
    // Try to extract a readable name from coin type
    const parts = coinType.split('::');
    const coinName = parts[parts.length - 1] || coinType;

    // Format based on known decimals (SUI = 9, USDC = 6)
    let formattedBalance: string;
    if (coinType.includes('::sui::SUI')) {
      formattedBalance = formatBalance(balance, 9);
    } else if (coinType.toLowerCase().includes('usdc')) {
      formattedBalance = formatBalance(balance, 6);
    } else {
      formattedBalance = balance.toString();
    }

    console.log(`   - ${coinName}: ${formattedBalance}`);
    console.log(`     Type: ${coinType}`);
  }
  console.log('');
}
