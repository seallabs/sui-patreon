'use client';

import { AdaptiveLayout } from '@/components/layout/adaptive-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import {
  decryptContent,
  DecryptContentResult,
  DecryptHelpers,
} from '@/lib/walrus/decrypt';
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { FormEvent, useState } from 'react';

export default function DecryptTestPage() {
  const [contentId, setContentId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [result, setResult] = useState<DecryptContentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decryptedContentUrl, setDecryptedContentUrl] = useState<string | null>(
    null
  );
  const [contentType, setContentType] = useState<string>('text/plain');

  const { user } = useUser();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  // Check if logged in - if we have an address, we're logged in
  const userAddress = user?.address;
  const isLoggedIn = !!userAddress;

  const handleDecrypt = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setDecryptedContentUrl(null);

    if (!contentId || !subscriptionId) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLoggedIn) {
      setError('Please log in with zkLogin first');
      return;
    }

    setIsDecrypting(true);

    try {
      if (!userAddress) {
        setError('User address not found. Please log in with zkLogin first.');
        return;
      }

      console.log('Starting decryption...', { contentId, subscriptionId });
      const decryptResult = await decryptContent({
        contentId,
        subscriptionId,
        userAddress,
        signPersonalMessage: async (message) => {
          const result = await signPersonalMessage({ message });
          // dapp-kit returns { signature, bytes } which matches SignatureWithBytes
          return result;
        },
      });

      setResult(decryptResult);

      // Try to detect content type and create preview URL
      try {
        // Try as text first
        const text = DecryptHelpers.toText(decryptResult.data);
        setContentType('text/plain');
        setDecryptedContentUrl(null); // Text will be displayed directly
      } catch {
        // Not text, try as image
        try {
          const blob = DecryptHelpers.toBlob(decryptResult.data, 'image/png');
          const url = URL.createObjectURL(blob);
          setDecryptedContentUrl(url);
          setContentType('image/png');
        } catch {
          // Unknown type, create generic blob
          const blob = DecryptHelpers.toBlob(
            decryptResult.data,
            'application/octet-stream'
          );
          const url = URL.createObjectURL(blob);
          setDecryptedContentUrl(url);
          setContentType('application/octet-stream');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Decryption failed:', err);
      setError(message);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!result || !decryptedContentUrl) return;

    const a = document.createElement('a');
    a.href = decryptedContentUrl;
    a.download = `decrypted-content-${contentId.slice(0, 8)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClear = () => {
    setContentId('');
    setSubscriptionId('');
    setResult(null);
    setError(null);
    if (decryptedContentUrl) {
      URL.revokeObjectURL(decryptedContentUrl);
      setDecryptedContentUrl(null);
    }
  };

  return (
    <AdaptiveLayout>
      <main className='mx-auto flex w-full max-w-4xl flex-col gap-8 p-8'>
        <div>
          <h1 className='text-3xl font-bold'>Content Decryption Test</h1>
          <p className='mt-2 text-muted-foreground'>
            Test decrypting Seal-encrypted content from Walrus using zkLogin
          </p>
        </div>

        {/* zkLogin Status */}
        <div className='rounded-xl border p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>zkLogin Status</h3>
              <p className='text-sm text-muted-foreground'>
                {isLoggedIn ? (
                  <>
                    ✅ Logged in as{' '}
                    <span className='font-mono text-xs'>{userAddress}</span>
                  </>
                ) : (
                  <>❌ Not logged in - Please log in with zkLogin first</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Decryption Form */}
        <form
          onSubmit={handleDecrypt}
          className='space-y-6 rounded-xl border p-6'
        >
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='contentId' className='text-sm font-medium'>
                Content Object ID
              </label>
              <Input
                id='contentId'
                type='text'
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                placeholder='0xcontentId456...'
                required
                className='font-mono text-sm'
              />
              <p className='text-xs text-muted-foreground'>
                The on-chain Content object ID (contains metadata, policy info,
                and blobId)
              </p>
            </div>

            <div className='space-y-2'>
              <label htmlFor='subscriptionId' className='text-sm font-medium'>
                Subscription NFT ID
              </label>
              <Input
                id='subscriptionId'
                type='text'
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                placeholder='0xsubscriptionId789...'
                required
                className='font-mono text-sm'
              />
              <p className='text-xs text-muted-foreground'>
                Your ActiveSubscription NFT ID (proves access rights)
              </p>
            </div>
          </div>

          <div className='flex gap-4'>
            <Button
              type='submit'
              disabled={isDecrypting || !isLoggedIn}
              className='flex-1'
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt Content'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleClear}
              disabled={isDecrypting}
            >
              Clear
            </Button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className='rounded-xl border border-destructive bg-destructive/10 p-4'>
            <h3 className='font-medium text-destructive'>Error</h3>
            <p className='mt-2 text-sm text-destructive'>{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className='space-y-4 rounded-xl border p-6'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-medium'>Decryption Result</h3>
              {decryptedContentUrl && (
                <Button onClick={handleDownload} variant='outline' size='sm'>
                  Download
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className='grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-4'>
              <div>
                <p className='text-xs text-muted-foreground'>Encrypted Size</p>
                <p className='text-sm font-medium'>
                  {(result.encryptedSize / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Decrypted Size</p>
                <p className='text-sm font-medium'>
                  {(result.decryptedSize / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Content Type</p>
                <p className='text-sm font-medium'>{contentType}</p>
              </div>
            </div>

            {/* Content Preview */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium'>Content Preview</h4>
              <div className='rounded-lg border bg-background p-4'>
                {contentType.startsWith('text/') ? (
                  <pre className='max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm'>
                    {DecryptHelpers.toText(result.data)}
                  </pre>
                ) : contentType.startsWith('image/') && decryptedContentUrl ? (
                  <div className='flex items-center justify-center'>
                    <img
                      src={decryptedContentUrl}
                      alt='Decrypted content'
                      className='max-h-96 max-w-full rounded-lg'
                    />
                  </div>
                ) : (
                  <div className='space-y-2'>
                    <p className='text-sm text-muted-foreground'>
                      Binary content ({result.decryptedSize} bytes)
                    </p>
                    {decryptedContentUrl && (
                      <a
                        href={decryptedContentUrl}
                        download
                        className='text-sm text-primary hover:underline'
                      >
                        Download file
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Raw Data Info */}
            <details className='rounded-lg border bg-muted/20 p-4'>
              <summary className='cursor-pointer text-sm font-medium'>
                Raw Data (Base64)
              </summary>
              <pre className='mt-2 max-h-48 overflow-auto text-xs'>
                {DecryptHelpers.toBase64(result.data)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className='rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950'>
          <h3 className='font-medium text-blue-900 dark:text-blue-100'>
            How to Use
          </h3>
          <ol className='mt-4 list-decimal space-y-2 pl-5 text-sm text-blue-800 dark:text-blue-200'>
            <li>
              Make sure you&apos;re logged in with zkLogin (see status above)
            </li>
            <li>
              Enter the <strong>contentId</strong> (on-chain Content object ID -
              blobId will be extracted automatically)
            </li>
            <li>
              Enter your <strong>subscriptionId</strong> (ActiveSubscription NFT
              ID that grants access)
            </li>
            <li>Click &quot;Decrypt Content&quot; to decrypt and preview</li>
            <li>Use the Download button to save the decrypted file</li>
          </ol>
        </div>
      </main>
    </AdaptiveLayout>
  );
}
