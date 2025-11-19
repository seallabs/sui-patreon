# Sui Transaction Utilities

Centralized utilities for handling Sui blockchain transactions with automatic toast notifications and error handling.

## Overview

This library provides a clean, reusable pattern for executing Sui transactions in the frontend with:
- Automatic transaction signing and execution
- Toast notifications at each step (send, confirm, error)
- Coin selection and merging for payments
- Type-safe transaction builders
- Error handling with user-friendly messages

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Component                         │
│  - Call usePurchaseSubscription hook                     │
│  - Pass parameters                                       │
│  - Handle loading state                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│          usePurchaseSubscription Hook                    │
│  - Validates wallet connection                           │
│  - Converts USDC to smallest unit                        │
│  - Calls useTransaction.execute()                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             useTransaction Hook                          │
│  - Builds transaction with provided function             │
│  - Signs via useSignAndExecuteTransaction                │
│  - Shows "Transaction sent" toast with hash              │
│  - Waits for confirmation                                │
│  - Shows success/error toast                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Coin Utilities                              │
│  - Get USDC coins from wallet                            │
│  - Select appropriate coin for payment                   │
│  - Merge coins if necessary                              │
│  - Create exact payment amount                           │
└─────────────────────────────────────────────────────────┘
```

## Files

### `constants.ts`
- Package IDs and registry addresses
- System object constants (CLOCK, etc.)
- USDC configuration and conversion utilities

### `coins.ts`
- `getUsdcCoins()` - Fetch all USDC coins for an address
- `getUsdcBalance()` - Get total USDC balance
- `selectPaymentCoin()` - Smart coin selection with merging
- `createPaymentCoin()` - Split exact payment amount

### `transactions.ts`
- `useTransaction()` - Core hook for executing transactions
- `getCreatedObjectIds()` - Extract created objects from result
- `getEventByType()` - Extract specific event from result

### `subscription.ts`
- `usePurchaseSubscription()` - Hook for purchasing subscriptions
- `buildPurchaseSubscriptionTx()` - Build transaction without executing

## Usage

### Basic Subscription Purchase

```tsx
import { usePurchaseSubscription } from '@/lib/sui/subscription';
import { useCurrentAccount } from '@mysten/dapp-kit';

function TierCard({ tier, creatorAddress }) {
  const currentAccount = useCurrentAccount();
  const { purchaseSubscription, isLoading } = usePurchaseSubscription();

  const handleSubscribe = async () => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet");
      return;
    }

    await purchaseSubscription(
      {
        creatorAddress,
        tierId: tier.id,
        priceUsdc: tier.price,
        tierName: tier.name,
      },
      currentAccount.address
    );
  };

  return (
    <button onClick={handleSubscribe} disabled={isLoading}>
      {isLoading ? "Processing..." : "Subscribe"}
    </button>
  );
}
```

### Custom Transaction with useTransaction

```tsx
import { useTransaction } from '@/lib/sui/transactions';
import { PACKAGE_ID, TIER_REGISTRY } from '@/lib/sui/constants';

function CreateTierForm() {
  const { execute, isLoading } = useTransaction();

  const handleCreateTier = async (name: string, price: number) => {
    await execute(
      (tx) => {
        tx.moveCall({
          target: `${PACKAGE_ID}::subscription::create_tier`,
          arguments: [
            tx.object(TIER_REGISTRY),
            tx.pure.string(name),
            tx.pure.string("Tier description"),
            tx.pure.u64(price * 1_000_000), // Convert to USDC smallest unit
            tx.object(SUI_CLOCK_OBJECT_ID),
          ],
        });
      },
      {
        successMessage: `Created tier: ${name}`,
        errorMessage: "Failed to create tier",
      }
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleCreateTier("Premium", 10);
    }}>
      <button type="submit" disabled={isLoading}>
        Create Tier
      </button>
    </form>
  );
}
```

### Coin Utilities

```tsx
import { getUsdcBalance, selectPaymentCoin } from '@/lib/sui/coins';
import { useSuiClient } from '@mysten/dapp-kit';

function WalletBalance({ address }) {
  const client = useSuiClient();
  const [balance, setBalance] = useState<bigint>(0n);

  useEffect(() => {
    getUsdcBalance(client, address).then(setBalance);
  }, [address, client]);

  return (
    <div>
      Balance: {Number(balance) / 1_000_000} USDC
    </div>
  );
}
```

## Toast Notifications

The library automatically shows toast notifications at each step:

1. **Transaction Sent** (info toast)
   - Shows immediately after signing
   - Displays transaction hash (truncated)
   - Duration: 3 seconds

2. **Success** (success toast)
   - Shows after transaction confirmation
   - Custom message based on operation
   - Displays transaction hash
   - Duration: 5 seconds

3. **Error** (error toast)
   - Shows if transaction fails
   - Displays error message
   - Duration: 7 seconds

## Error Handling

Errors are handled at multiple levels:

### Wallet Not Connected
```tsx
if (!currentAccount?.address) {
  toast.error("Wallet not connected", {
    description: "Please connect your wallet to subscribe",
  });
  return;
}
```

### Insufficient Balance
```tsx
// Automatically thrown by selectPaymentCoin()
throw new Error(
  `Insufficient USDC balance. Required: ${amount}, Available: ${totalBalance}`
);
```

### Transaction Failure
```tsx
// Automatically handled by useTransaction
if (txResult.effects?.status?.status !== 'success') {
  const errorMsg = txResult.effects?.status?.error || 'Transaction execution failed';
  throw new Error(errorMsg);
}
```

## USDC Conversion

Use the provided utilities for USDC conversions:

```tsx
import { usdcToSmallestUnit, smallestUnitToUsdc } from '@/lib/sui/constants';

// Convert 5 USDC to smallest unit (6 decimals)
const amount = usdcToSmallestUnit(5); // 5_000_000n

// Convert smallest unit back to USDC
const usdc = smallestUnitToUsdc(5_000_000n); // 5
```

## Configuration

Update constants in `constants.ts` for different environments:

```tsx
// Testnet (default)
export const PACKAGE_ID = '0x485d07bb4f59ba73dfad9a00bf4cd9c303ed2e18f2df35d6a0e04d17bc1c9b54';
export const USDC_TYPE = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN';

// Mainnet
export const PACKAGE_ID = '0x...'; // Update for mainnet
export const USDC_TYPE = '0x...'; // Update for mainnet USDC
```

## Best Practices

1. **Always check wallet connection** before calling transaction hooks
2. **Use provided conversion utilities** for USDC amounts
3. **Let the hooks handle errors** - don't wrap in try/catch unless needed
4. **Provide descriptive success/error messages** for better UX
5. **Use loading states** to disable buttons during transactions
6. **Test with small amounts** on testnet first

## Example: Complete Flow

```tsx
import { usePurchaseSubscription } from '@/lib/sui/subscription';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function SubscribeButton({ tier, creatorAddress }) {
  const currentAccount = useCurrentAccount();
  const { purchaseSubscription, isLoading } = usePurchaseSubscription();

  const handleSubscribe = async () => {
    // 1. Check wallet connection
    if (!currentAccount?.address) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to subscribe",
      });
      return;
    }

    // 2. Execute subscription purchase
    // The hook handles:
    // - USDC conversion
    // - Coin selection/merging
    // - Transaction signing
    // - Toast notifications
    // - Error handling
    await purchaseSubscription(
      {
        creatorAddress,
        tierId: tier.id,
        priceUsdc: tier.price,
        tierName: tier.name,
      },
      currentAccount.address
    );
  };

  return (
    <Button
      onClick={handleSubscribe}
      disabled={isLoading || !currentAccount}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : !currentAccount ? (
        "Connect Wallet"
      ) : (
        `Subscribe for ${tier.price} USDC/mo`
      )}
    </Button>
  );
}
```

## Testing

Before using in production:

1. Test on testnet with test USDC
2. Verify all toast notifications appear correctly
3. Test error scenarios (insufficient balance, etc.)
4. Check transaction appears on Sui Explorer
5. Verify events are emitted correctly

## Troubleshooting

### "Insufficient USDC balance" error
- Ensure wallet has enough USDC for the transaction
- Account for gas fees (requires SUI)
- Check USDC_TYPE matches your network

### Transaction fails silently
- Check browser console for errors
- Verify PACKAGE_ID is correct for your network
- Ensure all registry objects exist

### Toast notifications not appearing
- Verify Toaster component is in layout
- Check sonner package is installed
- Ensure richColors prop is set

## References

- [Sui Move Documentation](https://docs.sui.io/concepts/sui-move-concepts)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Smart Contract README](../../../../../contracts/creator_platform/README.md)
