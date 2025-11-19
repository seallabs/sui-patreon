'use client';

import { useState } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateChannel() {
  const { createChannel, isCreatingChannel, channelError, isReady } = useMessaging();
  const currentAccount = useCurrentAccount();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Parse and validate addresses
    if (!recipientAddress.trim()) {
      setValidationError('Please enter at least one recipient address');
      return;
    }

    if (!isValidSuiAddress(recipientAddress)) {
      setValidationError(`Invalid Sui address: ${recipientAddress}`);
      return;
    }

    // Check if user is trying to add their own address
    if (currentAccount && currentAccount.address.toLowerCase() === recipientAddress.toLowerCase()) {
      setValidationError('You cannot add your own connected wallet address. You will be automatically included in the channel.');
      return;
    }

    // Create channel
    const result = await createChannel(recipientAddress);

    if (result?.channelId) {
      setSuccessMessage(`Channel created successfully! ID: ${result.channelId.slice(0, 10)}...`);
      setRecipientAddress(''); // Clear input on success

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Create New Channel</h3>
        </div>

        <div className="border-t" />

        <div>
          <p className="text-sm text-muted-foreground">
            Enter one or more Sui addresses separated by commas to create a private messaging channel.
          </p>
        </div>

        <Input
          placeholder="Enter Sui address"
          value={recipientAddress}
          onChange={(e) => {
            setRecipientAddress(e.target.value);
            setValidationError(null);
          }}
          disabled={!isReady || isCreatingChannel}
        />

        {validationError && (
          <p className="text-sm text-red-500">
            {validationError}
          </p>
        )}

        {channelError && (
          <p className="text-sm text-red-500">
            Error: {channelError}
          </p>
        )}

        {successMessage && (
          <p className="text-sm text-green-500">
            {successMessage}
          </p>
        )}

        <Button
          type="submit"
          disabled={!isReady || isCreatingChannel}
        >
          {isCreatingChannel ? 'Creating Channel...' : 'Create Channel'}
        </Button>

        {!isReady && (
          <p className="text-sm text-muted-foreground">
            Waiting for messaging client to initialize...
          </p>
        )}
      </form>
    </div>
  );
}

