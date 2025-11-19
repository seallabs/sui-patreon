'use client';

import { useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { formatTimestamp, formatAddress } from '@/lib/messaging/formatters';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw } from 'lucide-react';

interface ChannelListProps {
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ onChannelSelect }: ChannelListProps) {
  const { channels, isFetchingChannels, fetchChannels, isReady } = useMessaging();

  useEffect(() => {
    console.log('Channels updated:', channels);
  }, [channels]);

  // Auto-refresh channels every 60 seconds when component is mounted
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      fetchChannels();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isReady, fetchChannels]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Your Channels</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchChannels()}
          disabled={isFetchingChannels || !isReady}
        >
          <RefreshCw className={`h-4 w-4 ${isFetchingChannels ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="p-4">
        {!isReady ? (
          <p className="text-center text-sm text-muted-foreground">
            Waiting for messaging client to initialize...
          </p>
        ) : isFetchingChannels && channels.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Loading channels...
          </p>
        ) : channels.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No channels yet. Create one above to start messaging!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {channels.sort((a, b) => {
              const aTime = a.last_message ? Number(a.last_message.createdAtMs) : Number(a.created_at_ms);
              const bTime = b.last_message ? Number(b.last_message.createdAtMs) : Number(b.created_at_ms);
              return bTime - aTime;
            }).map((channel) => (
              <div
                key={channel.id.id}
                onClick={() => onChannelSelect(channel.id.id)}
                className="cursor-pointer rounded-lg border bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">Channel ID</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.id.id.slice(0, 16)}...{channel.id.id.slice(-4)}
                    </p>
                  </div>
                  <div className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
                    Active
                  </div>
                </div>

                <div className="mt-2 flex gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Messages</p>
                    <p className="text-sm font-medium">{channel.messages_count}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-sm font-medium">{channel.auth.member_permissions.contents.length}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatTimestamp(channel.created_at_ms)}</p>
                  </div>
                </div>

                {channel.last_message && (
                  <>
                    <div className="my-2 border-t" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Message</p>
                      <p className="mt-1 truncate text-sm">
                        {channel.last_message.text.length > 50
                          ? `${channel.last_message.text.slice(0, 50)}...`
                          : channel.last_message.text}
                      </p>
                      <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                        <span>from: {formatAddress(channel.last_message.sender)}</span>
                        <span>• {formatTimestamp(channel.last_message?.createdAtMs)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {channels.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Auto-refreshes every 60 seconds • {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

