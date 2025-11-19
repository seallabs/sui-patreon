/**
 * Coin utilities for handling USDC and other tokens
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { USDC_TYPE } from './constants';

export interface CoinObject {
  coinObjectId: string;
  balance: bigint;
}

/**
 * Get all USDC coins owned by an address
 */
export async function getUsdcCoins(
  client: SuiClient,
  owner: string
): Promise<CoinObject[]> {
  const coins = await client.getCoins({
    owner,
    coinType: USDC_TYPE,
  });

  return coins.data.map((coin) => ({
    coinObjectId: coin.coinObjectId,
    balance: BigInt(coin.balance),
  }));
}

/**
 * Get total USDC balance for an address
 */
export async function getUsdcBalance(
  client: SuiClient,
  owner: string
): Promise<bigint> {
  const coins = await getUsdcCoins(client, owner);
  return coins.reduce((total, coin) => total + coin.balance, 0n);
}

/**
 * Select coins for payment, merging if necessary
 * Returns the coin object ID to use for payment
 */
export async function selectPaymentCoin(
  tx: Transaction,
  client: SuiClient,
  owner: string,
  amount: bigint
): Promise<string> {
  const coins = await getUsdcCoins(client, owner);

  if (coins.length === 0) {
    throw new Error('No USDC coins found in wallet');
  }

  const totalBalance = coins.reduce((sum, coin) => sum + coin.balance, 0n);

  if (totalBalance < amount) {
    throw new Error(
      `Insufficient USDC balance. Required: ${amount}, Available: ${totalBalance}`
    );
  }

  // If we have a single coin with enough balance, use it directly
  if (coins.length === 1 && coins[0].balance >= amount) {
    return coins[0].coinObjectId;
  }

  // If we have a coin with exact amount, use it
  const exactCoin = coins.find((coin) => coin.balance === amount);
  if (exactCoin) {
    return exactCoin.coinObjectId;
  }

  // If we have a coin with more than required amount, use it
  const sufficientCoin = coins.find((coin) => coin.balance >= amount);
  if (sufficientCoin) {
    return sufficientCoin.coinObjectId;
  }

  // Otherwise, merge coins
  // Sort by balance descending to use largest coins first
  const sortedCoins = [...coins].sort((a, b) =>
    a.balance > b.balance ? -1 : 1
  );

  // Take the first coin as primary
  const primaryCoin = sortedCoins[0];
  const coinsToMerge = sortedCoins.slice(1).map((c) => c.coinObjectId);

  // Merge all coins into the primary coin
  if (coinsToMerge.length > 0) {
    tx.mergeCoins(
      tx.object(primaryCoin.coinObjectId),
      coinsToMerge.map((id) => tx.object(id))
    );
  }

  return primaryCoin.coinObjectId;
}

/**
 * Create a split coin for exact payment amount
 * This ensures we don't consume more than necessary
 */
export function createPaymentCoin(
  tx: Transaction,
  sourceCoinId: string,
  amount: bigint
) {
  const [paymentCoin] = tx.splitCoins(tx.object(sourceCoinId), [
    tx.pure.u64(amount),
  ]);
  return paymentCoin;
}
