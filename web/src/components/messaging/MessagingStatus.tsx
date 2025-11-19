'use client';

import { useMessaging } from '@/hooks/useMessaging';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSessionKey } from '@/providers/SessionKeyProvider';
import { Button } from '@/components/ui/button';

export function MessagingStatus() {
  const currentAccount = useCurrentAccount();
  const { client, sessionKey, isInitializing, error, isReady } = useMessaging();
  const { initializeManually } = useSessionKey();

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold">Messaging SDK Status</h3>
        </div>

        <div className="border-t" />

        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-sm">Current Account:</span>
            <div className={`rounded-full px-2 py-1 text-xs ${currentAccount ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
              {currentAccount?.address
                ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
                : 'Not connected'}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm">Session Key:</span>
            <div className={`rounded-full px-2 py-1 text-xs ${
              sessionKey ? 'bg-green-500/10 text-green-500' : 
              isInitializing ? 'bg-yellow-500/10 text-yellow-500' : 
              'bg-gray-500/10 text-gray-500'
            }`}>
              {isInitializing ? 'Initializing...' : sessionKey ? 'Active' : 'Not initialized'}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm">Messaging Client:</span>
            <div className={`rounded-full px-2 py-1 text-xs ${client ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
              {client ? 'Ready' : 'Not initialized'}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm">Overall Status:</span>
            <div className={`rounded-full px-2 py-1 text-xs ${
              isReady ? 'bg-green-500/10 text-green-500' : 
              isInitializing ? 'bg-yellow-500/10 text-yellow-500' : 
              'bg-red-500/10 text-red-500'
            }`}>
              {isReady ? 'Ready to use' : isInitializing ? 'Setting up...' : 'Not ready'}
            </div>
          </div>
        </div>

        {error && (
          <>
            <div className="border-t" />
            <div>
              <p className="text-sm text-red-500">Error: {error.message}</p>
            </div>
          </>
        )}

        {currentAccount && !sessionKey && !isInitializing && (
          <>
            <div className="border-t" />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                The SDK uses Seal for encrypting messages and attachments. The Seal SDK requires a session key,
                which contains a signature from your account and allows the app to retrieve Seal decryption keys
                for a limited time (30 minutes) without requiring repeated confirmations for each message.
              </p>
              <Button
                onClick={initializeManually}
                size="sm"
              >
                Sign Session Key
              </Button>
            </div>
          </>
        )}

        {isReady && (
          <>
            <div className="border-t" />
            <div>
              <p className="text-sm text-green-500">
                ✓ Messaging client is ready! You can now use it to send and receive messages.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

