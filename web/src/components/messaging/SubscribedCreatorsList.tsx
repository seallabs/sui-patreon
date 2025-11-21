'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { fetchUserSubscriptions, UserSubscription } from '@/services/subscriptions';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, CheckCircle2 } from 'lucide-react';
import { ChannelProgressIndicator } from './ChannelProgressIndicator';
import { checkChannelExists } from '@/services/messaging';

interface SubscribedCreatorsListProps {
  onCreatorSelect: (creatorAddress: string, creatorName: string) => void;
  onNavigateToChannel: (channelId: string) => void;
  disabled?: boolean;
}

export function SubscribedCreatorsList({ onCreatorSelect, onNavigateToChannel, disabled }: SubscribedCreatorsListProps) {
  const currentAccount = useCurrentAccount();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingChannelFor, setCreatingChannelFor] = useState<string | null>(null);
  const [channelComplete, setChannelComplete] = useState<string | null>(null);
  const [existingChannels, setExistingChannels] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!currentAccount?.address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchUserSubscriptions(currentAccount.address);

        // Filter to unique creators and active subscriptions
        const uniqueCreators = data
          .filter(sub => sub.isActive && sub.tier?.creator)
          .reduce((acc, sub) => {
            const creatorAddress = sub.tier?.creator?.address;
            if (creatorAddress && !acc.find(s => s.tier?.creator?.address === creatorAddress)) {
              acc.push(sub);
            }
            return acc;
          }, [] as UserSubscription[]);

        setSubscriptions(uniqueCreators);

        // Check for existing channels
        const channelMap = new Map<string, string>();
        await Promise.all(
          uniqueCreators.map(async (sub) => {
            const creatorAddress = sub.tier?.creator?.address;
            if (creatorAddress) {
              const result = await checkChannelExists(currentAccount.address, creatorAddress);
              if (result.exists && result.channelId) {
                channelMap.set(creatorAddress, result.channelId);
              }
            }
          })
        );
        setExistingChannels(channelMap);
      } catch (err) {
        console.error('Failed to fetch subscriptions:', err);
        setError('Failed to load subscribed creators');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptions();
  }, [currentAccount?.address]);

  const handleCreatorClick = async (creatorAddress: string, creatorName: string) => {
    if (disabled) return;

    // Check if channel already exists
    const existingChannelId = existingChannels.get(creatorAddress);
    if (existingChannelId) {
      // Navigate to existing channel
      onNavigateToChannel(existingChannelId);
      return;
    }

    // Create new channel
    setCreatingChannelFor(creatorAddress);
    setChannelComplete(null);

    try {
      await onCreatorSelect(creatorAddress, creatorName);
      setChannelComplete(creatorAddress);

      // Clear after 2 seconds
      setTimeout(() => {
        setChannelComplete(null);
        setCreatingChannelFor(null);
      }, 2000);
    } catch (err) {
      console.error('Error creating channel:', err);
      setCreatingChannelFor(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading your subscribed creators...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm font-medium text-red-600">{error}</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="mb-1 text-base font-medium">No subscribed creators yet</p>
        <p className="text-sm text-muted-foreground">
          Subscribe to creators to start messaging them
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select a creator to start a conversation ({subscriptions.length} subscribed)
      </p>

      {/* Progress indicator */}
      {creatingChannelFor && (
        <ChannelProgressIndicator
          isCreating={true}
          isComplete={!!channelComplete}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {subscriptions.map((subscription) => {
          const creator = subscription.tier?.creator;
          if (!creator) return null;

          const hasExistingChannel = existingChannels.has(creator.address);
          const isCreating = creatingChannelFor === creator.address;
          const isComplete = channelComplete === creator.address;

          return (
            <button
              key={creator.address}
              onClick={() => handleCreatorClick(creator.address, creator.name || 'Unknown Creator')}
              disabled={disabled || isCreating}
              className="group relative flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition-all hover:border-primary/50 hover:bg-background hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* Avatar */}
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-background">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name || 'Creator'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-lg font-bold text-muted-foreground">
                      {(creator.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Creator Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-semibold">
                    {creator.name || 'Unknown Creator'}
                  </h4>
                  {hasExistingChannel ? (
                    <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Active</span>
                    </div>
                  ) : (
                    <div className="rounded-full bg-green-500/10 px-1.5 py-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Message Icon */}
              <MessageSquare className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
