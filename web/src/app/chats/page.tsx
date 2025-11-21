'use client';

import { AdaptiveLayout } from "@/components/layout/adaptive-layout";
import { useState } from "react";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { MessagingStatus } from "@/components/messaging/MessagingStatus";
import { CreateChannel } from "@/components/messaging/CreateChannel";
import { ChannelList } from "@/components/messaging/ChannelList";
import { Channel } from "@/components/messaging/Channel";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { MessageSquare } from "lucide-react";

export default function ChatsPage() {
  const currentAccount = useCurrentAccount();
  const [channelId, setChannelId] = useState<string | null>(null);

  const handleChannelSelect = (id: string) => {
    if (isValidSuiObjectId(id)) {
      setChannelId(id);
    }
  };

  const handleBack = () => {
    setChannelId(null);
  };

  return (
    <AdaptiveLayout>
      <main className="p-6 max-w-8xl mx-auto">
          {currentAccount ? (
            channelId ? (
              <Channel
                channelId={channelId}
                onBack={handleBack}
              />
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Messages</h1>
                  <p className="text-muted-foreground">
                    Secure, encrypted messaging powered by Sui and Seal
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <MessagingStatus />
                    <CreateChannel onChannelCreated={handleChannelSelect} />
                  </div>

                  <div>
                    <ChannelList onChannelSelect={handleChannelSelect} />
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="mb-3 text-3xl font-bold tracking-tight">Connect Your Wallet</h2>
                <p className="text-muted-foreground text-lg">
                  Connect your wallet to start using secure, encrypted messaging on Sui blockchain
                </p>
              </div>
            </div>
          )}
      </main>
    </AdaptiveLayout>
  );
}
