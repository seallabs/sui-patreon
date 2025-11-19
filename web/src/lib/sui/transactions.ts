/**
 * Centralized transaction execution utility
 * Handles signing, execution, and toast notifications
 */

import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface TransactionResult {
  digest: string;
  effects?: any;
  events?: any[];
}

export interface TransactionOptions {
  /**
   * Success message to display
   */
  successMessage?: string;
  /**
   * Error message prefix (actual error will be appended)
   */
  errorMessage?: string;
  /**
   * Whether to show transaction hash toast immediately on send
   */
  showTxHashToast?: boolean;
}

export interface UseTransactionResult {
  execute: (
    buildTx: (tx: Transaction) => void | Promise<void>,
    options?: TransactionOptions
  ) => Promise<TransactionResult | null>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for executing Sui transactions with automatic toast notifications
 *
 * @example
 * ```tsx
 * const { execute, isLoading } = useTransaction();
 *
 * const handleSubscribe = async () => {
 *   await execute(
 *     (tx) => {
 *       tx.moveCall({
 *         target: `${PACKAGE_ID}::subscription::purchase_subscription`,
 *         arguments: [...]
 *       });
 *     },
 *     {
 *       successMessage: 'Successfully subscribed!',
 *       errorMessage: 'Failed to subscribe',
 *     }
 *   );
 * };
 * ```
 */
export function useTransaction(): UseTransactionResult {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const client = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (
      buildTx: (tx: Transaction) => void | Promise<void>,
      options: TransactionOptions = {}
    ): Promise<TransactionResult | null> => {
      const {
        successMessage = 'Transaction successful',
        errorMessage = 'Transaction failed',
        showTxHashToast = true,
      } = options;

      setIsLoading(true);
      setError(null);

      try {
        // Build the transaction
        const tx = new Transaction();
        await buildTx(tx);

        // Sign and execute
        const result = await signAndExecuteTransaction({
          transaction: tx,
        });

        // Show transaction hash toast immediately
        if (showTxHashToast) {
          toast.info('Transaction sent', {
            description: `Hash: ${result.digest.slice(0, 10)}...`,
            duration: 3000,
          });
        }

        // Wait for transaction to be confirmed
        const txResult = await client.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        // Check if transaction succeeded
        if (txResult.effects?.status?.status !== 'success') {
          const errorMsg =
            txResult.effects?.status?.error || 'Transaction execution failed';
          throw new Error(errorMsg);
        }

        // Show success toast
        toast.success(successMessage, {
          description: `Transaction: ${result.digest.slice(0, 10)}...`,
          duration: 5000,
        });

        setIsLoading(false);
        return {
          digest: result.digest,
          effects: txResult.effects,
          events: txResult.events,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Show error toast
        toast.error(errorMessage, {
          description: error.message,
          duration: 7000,
        });

        setIsLoading(false);
        return null;
      }
    },
    [signAndExecuteTransaction, client]
  );

  return { execute, isLoading, error };
}

/**
 * Helper function to extract created object IDs from transaction result
 */
export function getCreatedObjectIds(result: TransactionResult): string[] {
  if (!result.effects?.created) return [];

  return result.effects.created.map(
    (obj: any) => obj.reference?.objectId || obj.objectId
  );
}

/**
 * Helper function to extract specific event by type
 */
export function getEventByType<T = any>(
  result: TransactionResult,
  eventType: string
): T | null {
  if (!result.events) return null;

  const event = result.events.find((e: any) => e.type.includes(eventType));
  return event ? (event.parsedJson as T) : null;
}
