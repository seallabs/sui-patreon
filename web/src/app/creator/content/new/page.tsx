'use client';

import { WalrusFile } from '@mysten/walrus';
import { FormEvent, useState } from 'react';

import { AdaptiveLayout } from '@/components/layout/adaptive-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createContent } from '@/lib/walrus';
import {
  getUserAddress,
  signAndExecuteZkLoginTransaction,
} from '@/lib/zklogin';

const epochsToStore = 3;

const fileToWalrusFile = async (file: File, tags: Record<string, string>) => {
    const type = file.type;
  const buffer = await file.arrayBuffer();

  return WalrusFile.from({
    contents: new Uint8Array(buffer),
    identifier: file.name,
    tags: { ...tags, 'content-type': type },
  });
};

export default function NewCreatorContentPage() {
  const [description, setDescription] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [exclusiveFile, setExclusiveFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState<
    string[]
  >([]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setUploadedFileIdentifiers([]);

    if (!previewFile || !exclusiveFile) {
      setErrorMessage('Please select both preview and exclusive files.');
      return;
    }

    const userAddress = getUserAddress();
    if (!userAddress) {
      setErrorMessage('Please complete zkLogin before uploading content.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('Preparing Walrus files...');

      const [exclusiveWalrusFile, previewWalrusFile] = await Promise.all([
        fileToWalrusFile(exclusiveFile, { role: 'exclusive' }),
        fileToWalrusFile(previewFile, { role: 'preview' }),
      ]);

      setStatusMessage('Encoding files...');
      const flow = await createContent(
        { description },
        exclusiveWalrusFile,
        previewWalrusFile
      );

      setStatusMessage('Registering blob on-chain...');
      const registerTx = flow.register({
        epochs: epochsToStore,
        owner: userAddress,
        deletable: true,
      });
      const registerDigest = await signAndExecuteZkLoginTransaction(
        registerTx,
        userAddress
      );

      setStatusMessage('Uploading data to Walrus storage nodes...');
      await flow.upload({ digest: registerDigest });

      setStatusMessage('Certifying blob availability...');
      const certifyTx = flow.certify();
      await signAndExecuteZkLoginTransaction(certifyTx, userAddress);

      const files = await flow.listFiles();
      const identifiers = await Promise.all(
        files.map(async (file) => {
          try {
            const identifier = await file.getIdentifier?.();
            return identifier ?? 'Unnamed file';
          } catch {
            return 'Unnamed file';
          }
        })
      );

      setUploadedFileIdentifiers(identifiers);
      setStatusMessage('Content uploaded successfully.');
      setDescription('');
      setPreviewFile(null);
      setExclusiveFile(null);
    } catch (error) {
      console.error('Failed to upload content', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to upload content.'
      );
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdaptiveLayout>
      <main className='mx-auto flex w-full max-w-2xl flex-col gap-8 p-8'>
        <div>
          <h1 className='text-3xl font-bold'>Share New Content</h1>
          <p className='mt-2 text-muted-foreground'>
            Describe your drop, attach a premium file, and add a preview so fans
            know what they&apos;ll unlock.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className='space-y-6 rounded-xl border p-6'
        >
          <div className='space-y-2'>
            <label htmlFor='description' className='text-sm font-medium'>
              Description
            </label>
            <textarea
              id='description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              required
              placeholder='Give your supporters the context they need...'
              className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </div>

          <div className='space-y-2'>
            <label htmlFor='preview-file' className='text-sm font-medium'>
              Preview file
            </label>
            <Input
              id='preview-file'
              type='file'
              required
              onChange={(event) =>
                setPreviewFile(event.target.files?.[0] ?? null)
              }
            />
            {previewFile && (
              <p className='text-sm text-muted-foreground'>
                Selected: {previewFile.name}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <label htmlFor='exclusive-file' className='text-sm font-medium'>
              Exclusive file
            </label>
            <Input
              id='exclusive-file'
              type='file'
              required
              onChange={(event) =>
                setExclusiveFile(event.target.files?.[0] ?? null)
              }
            />
            {exclusiveFile && (
              <p className='text-sm text-muted-foreground'>
                Selected: {exclusiveFile.name}
              </p>
            )}
          </div>

          <Button type='submit' className='w-full' disabled={isSubmitting}>
            {isSubmitting ? 'Uploading...' : 'Create content'}
          </Button>

          {statusMessage && (
            <p className='text-sm text-primary'>{statusMessage}</p>
          )}
          {errorMessage && (
            <p className='text-sm text-destructive'>{errorMessage}</p>
          )}
          {uploadedFileIdentifiers.length > 0 && (
            <div className='rounded-md border border-border bg-muted/40 p-4 text-sm'>
              <p className='font-medium'>Uploaded files</p>
              <ul className='mt-2 list-disc space-y-1 pl-5'>
                {uploadedFileIdentifiers.map((identifier) => (
                  <li key={identifier}>{identifier}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </main>
    </AdaptiveLayout>
  );
}
