'use client';

import { useState } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubscribedCreatorsList } from './SubscribedCreatorsList';

type TabType = 'creators' | 'manual';

interface CreateChannelProps {
  onChannelCreated?: (channelId: string) => void;
}

export function CreateChannel({ onChannelCreated }: CreateChannelProps = {}) {
  const { createChannel, isCreatingChannel, channelError, isReady } = useMessaging();
  const currentAccount = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<TabType>('creators');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreatorSelect = async (creatorAddress: string, creatorName: string) => {
    setValidationError(null);
    setSuccessMessage(null);

    // Create channel with selected creator
    const result = await createChannel(creatorAddress);

    if (result?.channelId) {
      if (result.existingChannel) {
        setSuccessMessage(`Opening existing conversation with ${creatorName}...`);
      } else {
        setSuccessMessage(`Channel created with ${creatorName}! Opening conversation...`);
      }

      // Navigate to channel
      if (onChannelCreated) {
        setTimeout(() => {
          onChannelCreated(result.channelId);
        }, 1500);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleNavigateToChannel = (channelId: string) => {
    if (onChannelCreated) {
      onChannelCreated(channelId);
    }
  };

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
    <div className="rounded-xl border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Create New Channel</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start a private encrypted conversation
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('creators')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'creators'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Subscribed Creators
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Address
          </button>
        </div>

        {/* Error and Success Messages */}
        {validationError && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <p className="text-sm font-medium text-red-600">
              {validationError}
            </p>
          </div>
        )}

        {channelError && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <p className="text-sm font-medium text-red-600">
              Error: {channelError}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
            <p className="text-sm font-medium text-green-600">
              {successMessage}
            </p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'creators' ? (
          <SubscribedCreatorsList
            onCreatorSelect={handleCreatorSelect}
            onNavigateToChannel={handleNavigateToChannel}
            disabled={!isReady || isCreatingChannel}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Recipient Address
              </label>
              <Input
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value);
                  setValidationError(null);
                }}
                disabled={!isReady || isCreatingChannel}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter a Sui address to create a private messaging channel
              </p>
            </div>

            <Button
              type="submit"
              disabled={!isReady || isCreatingChannel}
              className="w-full h-11"
            >
              {isCreatingChannel ? 'Creating Channel...' : 'Create Channel'}
            </Button>
          </form>
        )}

        {!isReady && (
          <p className="text-xs text-center text-muted-foreground">
            Waiting for messaging client to initialize...
          </p>
        )}
      </div>
    </div>
  );
}

