'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState } from "react";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { MessagingStatus } from "@/components/messaging/MessagingStatus";
import { CreateChannel } from "@/components/messaging/CreateChannel";
import { ChannelList } from "@/components/messaging/ChannelList";
import { Channel } from "@/components/messaging/Channel";
import { useCurrentAccount } from "@mysten/dapp-kit";

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
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header />

        <main className="p-6">
          {currentAccount ? (
            channelId ? (
              <Channel
                channelId={channelId}
                onBack={handleBack}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <MessagingStatus />
                <CreateChannel />
                <ChannelList onChannelSelect={handleChannelSelect} />
              </div>
            )
          ) : (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-semibold">Please connect your wallet</h2>
                <p className="text-muted-foreground">
                  Connect your wallet to start using the messaging features
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
