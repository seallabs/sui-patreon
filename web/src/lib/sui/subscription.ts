/**
 * Subscription-related utilities and transaction builders
 */

import { useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useCallback } from 'react';
import {
  PACKAGE_ID,
  SUI_CLOCK_OBJECT_ID,
  TIER_REGISTRY,
  usdcToSmallestUnit,
} from './constants';
import { selectPaymentCoin } from './coins';
import { useTransaction } from './transactions';

export interface PurchaseSubscriptionParams {
  creatorAddress: string;
  tierId: string;
  priceUsdc: number;
  tierName?: string;
}

/**
 * Custom hook for purchasing subscriptions
 */
export function usePurchaseSubscription() {
  const { execute, isLoading, error } = useTransaction();
  const client = useSuiClient();

  const purchaseSubscription = useCallback(
    async (params: PurchaseSubscriptionParams, currentAddress: string) => {
      const { creatorAddress, tierId, priceUsdc, tierName } = params;

      return execute(
        async (tx: Transaction) => {
          // Convert price to smallest unit
          const amount = usdcToSmallestUnit(priceUsdc);

          // Select and prepare payment coin (merged if necessary)
          const paymentCoinId = await selectPaymentCoin(
            tx,
            client,
            currentAddress,
            amount
          );

          // Call purchase_subscription
          // The Move function takes &mut Coin and splits from it internally
          tx.moveCall({
            target: `${PACKAGE_ID}::subscription::purchase_subscription`,
            arguments: [
              tx.object(TIER_REGISTRY),
              tx.pure.address(creatorAddress),
              tx.pure.id(tierId),
              tx.object(paymentCoinId),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
          });
        },
        {
          successMessage: tierName
            ? `Successfully subscribed to ${tierName}!`
            : 'Subscription purchased successfully!',
          errorMessage: 'Failed to purchase subscription',
        }
      );
    },
    [execute, client]
  );

  return {
    purchaseSubscription,
    isLoading,
    error,
  };
}

/**
 * Build a purchase subscription transaction (without executing)
 * Useful for transaction previews or batch operations
 */
export async function buildPurchaseSubscriptionTx(
  tx: Transaction,
  client: any,
  params: PurchaseSubscriptionParams,
  currentAddress: string
): Promise<void> {
  const { creatorAddress, tierId, priceUsdc } = params;

  // Convert price to smallest unit
  const amount = usdcToSmallestUnit(priceUsdc);

  // Select and prepare payment coin (merged if necessary)
  const paymentCoinId = await selectPaymentCoin(
    tx,
    client,
    currentAddress,
    amount
  );

  // Call purchase_subscription
  // The Move function takes &mut Coin and splits from it internally
  tx.moveCall({
    target: `${PACKAGE_ID}::subscription::purchase_subscription`,
    arguments: [
      tx.object(TIER_REGISTRY),
      tx.pure.address(creatorAddress),
      tx.pure.id(tierId),
      tx.object(paymentCoinId),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
}
