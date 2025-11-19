'use client';

import { useSessionKey } from '@/providers/SessionKeyProvider';
import { Button } from '@/components/ui/button';

interface SessionExpirationModalProps {
  isOpen: boolean;
}

export function SessionExpirationModal({ isOpen }: SessionExpirationModalProps) {
  const { initializeManually, isInitializing } = useSessionKey();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        {/* Modal content */}
        <div className="z-50 w-[90%] max-w-md rounded-lg border bg-card p-6 shadow-lg">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">
              Session Expired
            </h2>

            <p className="text-sm">
              Your session key has expired. The SDK uses Seal for encrypting messages and attachments. 
              The Seal SDK requires a session key, which contains a signature from your account and allows 
              the app to retrieve Seal decryption keys for a limited time (30 minutes) without requiring 
              repeated confirmations for each message.
            </p>

            <p className="text-sm text-muted-foreground">
              Please sign a new session key to continue using the messaging features.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                onClick={initializeManually}
                disabled={isInitializing}
              >
                {isInitializing ? 'Signing...' : 'Sign Session Key'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

