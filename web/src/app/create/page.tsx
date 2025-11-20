'use client';

import { MediaTypeSelector } from '@/components/content/media-type-selector';
import { SettingsSidebar } from '@/components/content/settings-sidebar';
import { AdaptiveLayout } from '@/components/layout/adaptive-layout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreatorProfile } from '@/hooks/api/useCreatorQueries';
import { computeID, CONFIG, sealClient, walrusClient } from '@/lib/config';
import { patreon } from '@/lib/patreon';
import { validateCreatePost, ValidationError } from '@/lib/validation';
import { CreatePostFormData, MediaType } from '@/types';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { WalrusFile } from '@mysten/walrus';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Retry a transaction with exponential backoff
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @returns The result of the successful function call
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate exponential backoff delay: baseDelay * 2^attempt
      // Attempt 0: 1s, Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s, Attempt 4: 16s
      const delay = baseDelay * Math.pow(2, attempt);
      
      console.warn(
        `Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `Transaction failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

const defaultFormData: CreatePostFormData = {
  title: '',
  content: '',
  mediaType: undefined,
  mediaUrl: undefined,
  audience: 'free',
  tierIds: [],
  enableComments: true,
  tags: [],
  isDrop: false,
  scheduledDate: undefined,
  emailSubscribers: false,
  previewFile: null,
  exclusiveFile: null,
};

export default function CreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreatePostFormData>(defaultFormData);
  const [isPublishing, setIsPublishing] = useState(false);
  const userAddress = useCurrentAccount()?.address;
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const { data: creatorProfile } = useCreatorProfile(userAddress);

  const handleFormChange = (updates: Partial<CreatePostFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleMediaTypeSelect = (type: MediaType | undefined) => {
    handleFormChange({ mediaType: type });
  };

  const handlePreview = () => {
    // Validate before preview
    const validation = validateCreatePost(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      alert('Please fix the errors before previewing');
      return;
    }

    // TODO: Implement preview functionality
    console.log('Preview post:', formData);
  };

  const handlePublish = async () => {
    if (!userAddress) return;
    // Validate form data
    const validation = validateCreatePost(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      // Show first error
      if (validation.errors.length > 0) {
        alert(validation.errors[0].message);
      }
      return;
    }

    setIsPublishing(true);

    try {
      // TODO: Implement actual publish logic with smart contract
      console.log('Publishing post:', formData);

      // Simulate API call
      const nonce = Date.now();
      const encodedExclusiveFile = await sealClient.encrypt({
        threshold: 2,
        packageId: CONFIG.PACKAGE_ID,
        id: computeID(nonce, userAddress),
        data: new Uint8Array(await formData.exclusiveFile!.arrayBuffer()),
      });
      const flow = walrusClient.writeFilesFlow({
        files: [
          WalrusFile.from({
            contents: formData.previewFile!,
            identifier: formData.previewFile!.name,
            tags: { 'content-type': formData.previewFile!.type },
          }),
          WalrusFile.from({
            contents: encodedExclusiveFile.encryptedObject,
            identifier: 'exclusive.enc',
            tags: { 'content-type': 'application/encrypted' },
          }),
        ],
      });
      await flow.encode();
      const tx = flow.register({
        deletable: true,
        epochs: 1,
        owner: userAddress,
      });
      const { digest } = await signAndExecuteTransaction({ transaction: tx });
      await flow.upload({ digest });
      const certifyTx = flow.certify();
      await signAndExecuteTransaction({ transaction: certifyTx });
      const files = await flow.listFiles();
      console.log('Uploaded files:', files);
      const createTx = patreon.createContent(
        nonce,
        formData.title,
        formData.content,
        formData.exclusiveFile?.type!,
        files[0].id,
        files[1].id,
        formData.tierIds,
        files[0].blobObject.id.id
      );
      
      // Retry the final transaction up to 5 times with exponential backoff
      // This handles RPC delays and temporary network issues
      await retryWithBackoff(
        async () => await signAndExecuteTransaction({ transaction: createTx }),
        5,  // maxRetries
        1000 // baseDelay in ms (1s, 2s, 4s, 8s, 16s)
      );
      
      // Success - redirect to creator dashboard or post page
      setTimeout(() => {
        router.push('/creator/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Failed to publish post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // const createProfile = async () => {
  //   const tx = patreon.createProfile('Otis', "I'm a developer", '');
  //   await signAndExecuteTransaction({ transaction: tx });
  // };
  // const createTier = async () => {
  //   const tx = patreon.createTier('Premium', 'Access to premium content', 1000);
  //   await signAndExecuteTransaction({ transaction: tx });
  // }
  return (
    <AdaptiveLayout>
      <div className='flex min-h-screen'>
        {/* Main Content Area */}
        <main className='flex-1 p-8'>
          <div className='mx-auto max-w-4xl space-y-6'>
            {/* Media Type Buttons */}
            {/* <button onClick={createProfile}>Create Profile</button>
            <button onClick={createTier}>Create Tier</button> */}
            <MediaTypeSelector
              selectedType={formData.mediaType}
              onTypeSelect={handleMediaTypeSelect}
              selectedFiles={{
                preview: formData.previewFile,
                exclusive: formData.exclusiveFile,
              }}
              onFilesChanged={(preview, exclusive) =>
                handleFormChange({
                  previewFile: preview,
                  exclusiveFile: exclusive,
                })
              }
            />

            {/* Title Input */}
            <div>
              <Input
                type='text'
                placeholder='Title'
                value={formData.title}
                onChange={(e) => handleFormChange({ title: e.target.value })}
                className='text-3xl font-bold border-none bg-transparent px-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0'
              />
              {validationErrors.find((e) => e.field === 'title') && (
                <p className='mt-2 text-sm text-destructive'>
                  {validationErrors.find((e) => e.field === 'title')?.message}
                </p>
              )}
            </div>

            {/* Rich Text Editor */}
            <div>
              <Textarea
                placeholder='Start writing...'
                value={formData.content}
                onChange={(e) => handleFormChange({ content: e.target.value })}
                className='min-h-[400px] resize-none border-none bg-transparent px-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0'
              />
              {validationErrors.find((e) => e.field === 'content') && (
                <p className='mt-2 text-sm text-destructive'>
                  {validationErrors.find((e) => e.field === 'content')?.message}
                </p>
              )}
            </div>

            {/* Newsletter Template Section */}
            <div className='mt-12 rounded-lg border border-border bg-card p-6'>
              <h3 className='mb-4 text-lg font-semibold'>
                Start creating a...
              </h3>
              <button
                type='button'
                className='flex w-full items-start gap-4 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-accent'
              >
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                  <FileText className='h-5 w-5 text-primary' />
                </div>
                <div className='flex-1'>
                  <h4 className='font-medium'>Newsletter</h4>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    E.g. Weekly updates, journal entries, exclusive deep dives
                  </p>
                </div>
              </button>
            </div>
          </div>
        </main>

        {/* Settings Sidebar */}
        <SettingsSidebar
          formData={formData}
          onFormChange={handleFormChange}
          availableTiers={creatorProfile?.tiers ?? []}
          onPreview={handlePreview}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      </div>
    </AdaptiveLayout>
  );
}
