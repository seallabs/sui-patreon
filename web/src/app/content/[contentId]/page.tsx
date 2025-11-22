'use client';

import { AdaptiveLayout } from '@/components/layout/adaptive-layout';
import { Button } from '@/components/ui/button';
import { useContentDetail } from '@/hooks/api/useContentQueries';
import { useUserSubscriptions } from '@/hooks/api/useSubscriptionQueries';
import { useDecryptContent } from '@/hooks/useDecryptContent';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { DecryptHelpers } from '@/lib/walrus/decrypt';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useUser } from '@/contexts/user-context';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Lock,
  Share2,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { patreon } from '@/lib/patreon';
import { Transaction } from '@mysten/sui/transactions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WALRUS_TYPE } from '@/lib/sui/constants';
import { suiClient } from '@/lib/config';

interface PageProps {
  params: Promise<{ contentId: string }>;
}

/**
 * Construct Walrus URL from patch ID
 */
function getWalrusUrl(patchId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/by-quilt-patch-id/${patchId}`;
}

/**
 * Content carousel component for related/popular posts
 */
function ContentCarousel({
  title,
  posts,
}: {
  title: string;
  posts: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    isPublic: boolean;
    likeCount: number;
    viewCount: number;
  }>;
}) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const router = useRouter();

  if (posts.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`carousel-${title}`);
    if (!container) return;

    const scrollAmount = 300;
    const newPosition =
      direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  return (
    <section className='mb-12'>
      <h2 className='mb-6 text-2xl font-semibold'>{title}</h2>
      <div className='relative'>
        {/* Left Arrow */}
        {scrollPosition > 0 && (
          <Button
            variant='outline'
            size='icon'
            className='absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background shadow-lg'
            onClick={() => scroll('left')}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
        )}

        {/* Carousel Container */}
        <div
          id={`carousel-${title}`}
          className='flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide'
          style={{ scrollbarWidth: 'none' }}
        >
          {posts.map((post) => (
            <div
              key={post.id}
              className='group min-w-[280px] cursor-pointer'
              onClick={() => router.push(`/content/${post.id}`)}
            >
              <div className='overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg'>
                {/* Thumbnail */}
                <div className='relative aspect-video w-full overflow-hidden bg-muted'>
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      className='absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center bg-linear-to-br from-primary/20 to-primary/5'>
                      <span className='text-4xl font-bold text-muted-foreground/20'>
                        {post.title[0]}
                      </span>
                    </div>
                  )}

                  {/* Lock icon for private content */}
                  {!post.isPublic && (
                    <div className='absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm'>
                      <Lock className='h-4 w-4' />
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className='p-4'>
                  <h3 className='mb-2 line-clamp-2 font-semibold'>
                    {post.title}
                  </h3>
                  <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                    <span>{formatNumber(post.viewCount)} views</span>
                    <span>{formatNumber(post.likeCount)} likes</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <Button
          variant='outline'
          size='icon'
          className='absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background shadow-lg'
          onClick={() => scroll('right')}
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </section>
  );
}

export default function ContentDetailPage({ params }: PageProps) {
  const { contentId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { data: subscriptions } = useUserSubscriptions(user?.address);
  const {
    data: contentData,
    isLoading,
    error,
  } = useContentDetail(contentId, user?.address);
  const subscription = useMemo(() => {
    return subscriptions?.find(
      (s) => s.tier?.creator?.address === contentData?.creator.address
    );
  }, [subscriptions, contentData?.creator.address]);

  // Only decrypt if content is exclusive AND user has subscription
  const shouldDecrypt = !contentData?.isPublic && contentData?.isSubscribed;
  const { data: decryptContent, isLoading: decrypting } = useDecryptContent(
    shouldDecrypt ? contentData?.contentId : undefined,
    shouldDecrypt ? subscription?.subscriptionId : undefined,
    shouldDecrypt ? contentData?.exclusiveId : undefined
  );
  const decryped = useMemo(
    () =>
      decryptContent?.data
        ? DecryptHelpers.toDataUrl(decryptContent.data, 'image/png')
        : null,
    [decryptContent?.data]
  );

  // Determine which media to show
  // For public content: show exclusive content directly from Walrus (unencrypted)
  // For private content with subscription: show decrypted exclusive content (via Seal)
  // For private content without subscription: show locked state
  const shouldShowContent = contentData?.isPublic || contentData?.isSubscribed;
  const mediaUrl = useMemo(() => {
    // Public content - show exclusive content directly from Walrus (no decryption needed)
    if (contentData?.isPublic) {
      return contentData?.exclusiveId
        ? getWalrusUrl(contentData.exclusiveId)
        : null;
    }

    // Private content with subscription - show decrypted exclusive content
    if (contentData?.isSubscribed && decryped) {
      return decryped;
    }

    // Private content without subscription - show locked state (no URL)
    return null;
  }, [contentData?.isPublic, contentData?.isSubscribed, decryped, contentData?.exclusiveId]);

  useEffect(() => {
    // Reset loading state when mediaUrl changes
    if (mediaUrl) {
      setMediaLoading(true);
    }
  }, [mediaUrl, contentData?.contentType]);

  const [isLiked, setIsLiked] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successEpochs, setSuccessEpochs] = useState(0);
  const [epochs, setEpochs] = useState('10');
  const [isExtending, setIsExtending] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Handle like action
  const handleLike = () => {
    if (!currentAccount) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to like content',
      });
      return;
    }

    setIsLiked(!isLiked);
    toast.success(isLiked ? 'Unliked' : 'Liked!');
    // TODO: Implement actual like mutation
  };

  // Handle share action
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: contentData?.title,
          text: contentData?.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle creator navigation
  const handleCreatorClick = () => {
    if (!contentData) return;
    router.push(`/creator/${contentData.creator.address}`);
  };

  // Handle extend blob
  const handleExtendBlob = async () => {
    if (!currentAccount) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to extend blob storage',
      });
      return;
    }

    if (!contentData) {
      toast.error('Content not loaded', {
        description: 'Please wait for content to load',
      });
      return;
    }

    const epochsNum = parseInt(epochs);
    if (isNaN(epochsNum) || epochsNum < 1) {
      toast.error('Invalid epochs', {
        description: 'Please enter a valid number of epochs (minimum 1)',
      });
      return;
    }

    setIsExtending(true);
    const coins = await suiClient.getCoins({
      owner: currentAccount.address,
      coinType: WALRUS_TYPE,
    });

    try {
      // Create a new transaction and split coins for payment
      const tx = new Transaction();
      if (coins.data.length > 1) {
        tx.mergeCoins(
          tx.object(coins.data[0].coinObjectId),
          coins.data.slice(1).map((coin) => tx.object(coin.coinObjectId))
        );
      }

      // Build the extend blob call using the patreon helper
      // Use contentData.contentId (Sui object ID) instead of contentId (database UUID)
      patreon.extendBlob(tx, contentData.contentId, coins.data[0].coinObjectId, epochsNum);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Extend blob success:', result);
            setSuccessEpochs(epochsNum);
            setShowExtendDialog(false);
            setShowSuccessDialog(true);
            setEpochs('10');
          },
          onError: (error) => {
            console.error('Extend blob error:', error);
            toast.error('Failed to extend blob storage', {
              description: error.message || 'An error occurred',
            });
          },
        }
      );
    } catch (error) {
      console.error('Extend blob error:', error);
      toast.error('Failed to extend blob storage', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsExtending(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AdaptiveLayout>
        <main className='mx-auto max-w-5xl px-6 py-8'>
          <div className='mb-8 h-12 w-3/4 animate-pulse rounded bg-muted' />
          <div className='mb-6 h-96 w-full animate-pulse rounded-lg bg-muted' />
          <div className='space-y-4'>
            <div className='h-4 w-full animate-pulse rounded bg-muted' />
            <div className='h-4 w-5/6 animate-pulse rounded bg-muted' />
          </div>
        </main>
      </AdaptiveLayout>
    );
  }

  // Error state
  if (error || !contentData) {
    return (
      <AdaptiveLayout>
        <main className='flex items-center justify-center p-8'>
          <div className='max-w-md text-center'>
            <div className='mb-4 flex justify-center'>
              <AlertCircle className='h-16 w-16 text-destructive' />
            </div>
            <h1 className='mb-2 text-2xl font-bold'>Content Not Found</h1>
            <p className='mb-6 text-muted-foreground'>
              {error?.message ||
                "The content you're looking for doesn't exist"}
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </main>
      </AdaptiveLayout>
    );
  }

  const {
    title,
    description,
    creator,
    likes,
    views,
    createdAt,
    isPublic,
    isSubscribed,
    contentType,
    relatedPosts,
    popularPosts,
  } = contentData;

  return (
    <AdaptiveLayout>
      <main className='mx-auto max-w-5xl px-6 py-8'>
        {/* Header Section */}
        <section className='mb-8'>
          {/* Title */}
          <h1 className='mb-6 text-4xl font-bold'>{title}</h1>

          {/* Creator Info Bar */}
          <div className='mb-6 flex items-center justify-between'>
            <div
              className='flex cursor-pointer items-center gap-4'
              onClick={handleCreatorClick}
            >
              {/* Avatar */}
              <div className='relative h-12 w-12 overflow-hidden rounded-full'>
                <img
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                  className='h-full w-full object-cover'
                />
              </div>

              {/* Creator Name & Date */}
              <div>
                <p className='font-semibold hover:underline'>
                  {creator.displayName}
                </p>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span>{formatRelativeTime(createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex items-center gap-3'>
              {/* Like Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={handleLike}
                className='gap-2'
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''
                    }`}
                />
                <span>{formatNumber(likes + (isLiked ? 1 : 0))}</span>
              </Button>

              {/* Share Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={handleShare}
                className='gap-2'
              >
                <Share2 className='h-4 w-4' />
                Share
              </Button>

              {/* Extend Blob Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowExtendDialog(true)}
                className='gap-2'
                title='Help extend blob storage for this content'
              >
                <Clock className='h-4 w-4' />
                Extend Storage
              </Button>

              {/* Lock Icon for Exclusive */}
              {!isPublic && !isSubscribed && (
                <div className='flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary'>
                  <Lock className='h-4 w-4' />
                  Exclusive
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className='mb-12'>
          {/* Media Display */}
          {shouldShowContent ? (
            // Show decrypting loader only for exclusive content with subscription
            shouldDecrypt && decrypting ? (
              <div className='mb-6 overflow-hidden rounded-lg border border-border bg-card'>
                <div className='flex aspect-video items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10'>
                  <div className='flex flex-col items-center gap-6'>
                    {/* Seal decrypting GIF */}
                    <img
                      src='/seal.avif'
                      alt='Decrypting with Seal'
                      className='h-40 w-40 object-contain md:h-48 md:w-48'
                    />
                    {/* Decrypting message */}
                    <div className='flex flex-col items-center gap-2'>
                      <p className='text-base font-medium text-muted-foreground md:text-lg'>
                        Decrypting exclusive content...
                      </p>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground/80'>
                        <span>Powered by</span>
                        <span className='font-semibold text-primary'>Seal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='mb-6 overflow-hidden rounded-lg border border-border bg-card'>
                {/* Loading placeholder for media from Walrus */}
                {mediaLoading && (contentType === 'video' || contentType === 'image') && (
                  <div className='flex aspect-video items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10'>
                    <div className='flex flex-col items-center gap-6'>
                      {/* Walrus running GIF */}
                      <img
                        src='/wal-running.gif'
                        alt='Loading from Walrus'
                        className='h-40 w-40 object-contain md:h-48 md:w-48'
                      />
                      {/* Loading message */}
                      <div className='flex flex-col items-center gap-2'>
                        <p className='text-base font-medium text-muted-foreground md:text-lg'>
                          Loading from Walrus...
                        </p>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground/80'>
                          <span>Powered by</span>
                          <span className='font-semibold text-primary'>Walrus</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mediaUrl && contentType === 'video' && (
                  <video
                    controls
                    className='aspect-video w-full'
                    src={mediaUrl}
                    onLoadedData={() => setMediaLoading(false)}
                    onError={() => setMediaLoading(false)}
                    style={{ display: mediaLoading ? 'none' : 'block' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {mediaUrl && contentType === 'audio' && (
                  <div className='p-8'>
                    <audio
                      controls
                      className='w-full'
                      src={mediaUrl}
                      onLoadedData={() => setMediaLoading(false)}
                      onError={() => setMediaLoading(false)}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  </div>
                )}

                {mediaUrl && contentType === 'image' && (
                  <div className='relative w-full flex justify-center'>
                    <img
                      src={mediaUrl}
                      alt={title}
                      className='object-contain'
                      onLoad={() => setMediaLoading(false)}
                      onError={() => setMediaLoading(false)}
                      style={{ display: mediaLoading ? 'none' : 'block' }}
                    />
                  </div>
                )}

                {contentType === 'text' && (
                  <div className='p-8'>
                    <p className='whitespace-pre-wrap text-muted-foreground'>
                      {description}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Locked State
            <div className='mb-6 overflow-hidden rounded-lg border-2 border-dashed border-border bg-gradient-to-br from-muted/30 to-muted/60'>
              <div className='flex min-h-[400px] flex-col items-center gap-8 p-8 md:flex-row md:gap-12 md:p-12'>
                {/* Left Side - Seal Branding */}
                <div className='flex flex-1 flex-col items-center justify-center gap-4'>
                  <div className='relative'>
                    {/* Seal Logo with Glow Effect */}
                    <div className='absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl' />
                    <img
                      src='/seal.avif'
                      alt='Seal'
                      className='relative h-32 w-32 drop-shadow-2xl md:h-40 md:w-40'
                    />
                  </div>
                  <div className='text-center'>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Secured by
                    </p>
                    <p className='text-2xl font-bold text-foreground'>
                      Seal
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Decentralized Encryption
                    </p>
                  </div>
                </div>

                {/* Right Side - Content Info */}
                <div className='flex flex-1 flex-col items-center text-center md:items-start md:text-left'>
                  <Lock className='mb-4 h-12 w-12 text-muted-foreground' />

                  <h3 className='mb-2 text-2xl font-bold md:text-3xl'>
                    Exclusive Content
                  </h3>

                  <p className='mb-6 text-muted-foreground'>
                    Subscribe to {creator.displayName} to unlock this encrypted content
                  </p>

                  {/* Display Required Tiers */}
                  {contentData.allowedTiers && contentData.allowedTiers.length > 0 && (
                    <div className='mb-6 w-full'>
                      <p className='mb-3 text-sm font-medium text-muted-foreground'>
                        Available with these tiers:
                      </p>
                      <div className='flex flex-wrap gap-2 md:justify-start justify-center'>
                        {contentData.allowedTiers.map((tier) => (
                          <div
                            key={tier.id}
                            className='flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md'
                          >
                            <span className='font-semibold text-primary'>
                              {tier.name}
                            </span>
                            <span className='text-sm text-muted-foreground'>
                              ${tier.price}/month
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreatorClick}
                    size='lg'
                    className='w-full md:w-auto'
                  >
                    View Subscription Tiers
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className='rounded-lg border border-border bg-card p-6'>
            <h2 className='mb-4 text-xl font-semibold'>About</h2>
            <p className='whitespace-pre-wrap text-muted-foreground'>
              {description}
            </p>

            {/* Stats */}
            <div className='mt-6 flex items-center gap-6 border-t border-border pt-4 text-sm text-muted-foreground'>
              <span>{formatNumber(views)} views</span>
              <span>{formatNumber(likes)} likes</span>
              <span>Posted {formatRelativeTime(createdAt)}</span>
            </div>
          </div>
        </section>

        {/* Footer Section - Carousels */}
        <ContentCarousel title='Related posts' posts={relatedPosts} />
        <ContentCarousel title='Popular posts' posts={popularPosts} />
      </main>

      {/* Extend Blob Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Blob Storage</DialogTitle>
            <DialogDescription>
              If you like this content, help the creator extend blob storage to
              keep it available longer. Each epoch costs approximately 0.02 WALRUS.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='epochs'>Number of Epochs</Label>
              <Input
                id='epochs'
                type='number'
                min='1'
                value={epochs}
                onChange={(e) => setEpochs(e.target.value)}
                placeholder='Enter number of epochs'
                disabled={isExtending}
              />
              <p className='text-xs text-muted-foreground'>
                Estimated cost: ~{parseInt(epochs) * 0.02 || 0} WAL
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowExtendDialog(false);
                setEpochs('1');
              }}
              disabled={isExtending}
            >
              Cancel
            </Button>
            <Button onClick={handleExtendBlob} disabled={isExtending}>
              {isExtending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Extending...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Fun Walrus Thank You */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className='max-w-lg'>
          <DialogHeader className='text-center'>
            <DialogTitle className='text-center text-2xl font-bold md:text-3xl'>
              🎉 Thanks for Your Support! 🎉
            </DialogTitle>
          </DialogHeader>

          <div className='flex flex-col items-center gap-6 py-6'>
            {/* Walrus GIF */}
            <div className='relative overflow-hidden rounded-2xl border-4 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-2 shadow-2xl'>
              <img
                src='/sui-wal-thank.gif'
                alt='Walrus Thank You'
                className='h-64 w-64 rounded-xl object-cover'
              />
              <div className='absolute inset-0 animate-pulse rounded-2xl bg-primary/5' />
            </div>

            {/* Success Message */}
            <div className='space-y-3 text-center'>
              <p className='text-lg font-semibold text-foreground'>
                You've extended this content for{' '}
                <span className='text-primary'>{successEpochs} epoch{successEpochs > 1 ? 's' : ''}</span>!
              </p>
              <p className='text-sm text-muted-foreground'>
                Your contribution helps keep amazing content available on the decentralized web.
              </p>
            </div>

            {/* Walrus Branding */}
            <div className='flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-6 py-3'>
              <span className='text-sm font-medium text-muted-foreground'>
                Powered by
              </span>
              <span className='text-xl font-bold text-primary'>
                Walrus
              </span>
            </div>
          </div>

          <DialogFooter className='sm:justify-center'>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              size='lg'
              className='w-full sm:w-auto'
            >
              Awesome! 🚀
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdaptiveLayout>
  );
}
