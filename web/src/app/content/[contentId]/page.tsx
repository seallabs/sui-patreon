'use client';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
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
import Image from 'next/image';
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
                    <Image
                      src={post.thumbnailUrl}
                      alt={post.title}
                      fill
                      className='object-cover transition-transform group-hover:scale-105'
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
  console.log(subscriptions, subscription);
  const { data: decryptContent, isLoading: decrypting } = useDecryptContent(
    contentData?.contentId,
    subscription?.subscriptionId,
    contentData?.exclusiveId
  );
  const decryped = useMemo(
    () =>
      decryptContent?.data
        ? DecryptHelpers.toDataUrl(decryptContent.data, 'image/png')
        : null,
    [decryptContent?.data]
  );

  // Determine which media to show
  const shouldShowExclusive =
    contentData?.isPublic || contentData?.isSubscribed;
  const mediaUrl = useMemo(() => {
    return shouldShowExclusive
      ? decryped
      : contentData?.previewId
        ? getWalrusUrl(contentData.previewId)
        : null;
  }, [shouldShowExclusive, decryped, contentData?.previewId]);
  useEffect(() => {
    console.log({ mediaUrl, type: contentData?.contentType });
  }, [mediaUrl, contentData?.contentType]);

  const [isLiked, setIsLiked] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [epochs, setEpochs] = useState('1');
  const [isExtending, setIsExtending] = useState(false);

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
      patreon.extendBlob(tx, contentId, coins.data[0].coinObjectId, epochsNum);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Extend blob success:', result);
            toast.success('Blob storage extended!', {
              description: `Extended for ${epochsNum} epoch${epochsNum > 1 ? 's' : ''}`,
            });
            setShowExtendDialog(false);
            setEpochs('1');
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
      <div className='flex min-h-screen'>
        <Sidebar />
        <div className='flex-1 pl-64'>
          <Header />
          <main className='mx-auto max-w-5xl px-6 py-8'>
            <div className='mb-8 h-12 w-3/4 animate-pulse rounded bg-muted' />
            <div className='mb-6 h-96 w-full animate-pulse rounded-lg bg-muted' />
            <div className='space-y-4'>
              <div className='h-4 w-full animate-pulse rounded bg-muted' />
              <div className='h-4 w-5/6 animate-pulse rounded bg-muted' />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !contentData) {
    return (
      <div className='flex min-h-screen'>
        <Sidebar />
        <div className='flex-1 pl-64'>
          <Header />
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
        </div>
      </div>
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
    previewId,
    exclusiveId,
    contentType,
    relatedPosts,
    popularPosts,
  } = contentData;

  return (
    <div className='flex min-h-screen'>
      <Sidebar />

      <div className='flex-1 pl-64'>
        <Header />

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
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    fill
                    className='object-cover'
                    unoptimized
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
            {shouldShowExclusive ? (
              decrypting ? (
                <div className='mb-6 flex aspect-video items-center justify-center rounded-lg border border-border bg-card'>
                  <div className='flex flex-col items-center gap-3 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin' />
                    <p className='text-sm font-medium text-muted-foreground/80'>
                      Decrypting exclusive content...
                    </p>
                  </div>
                </div>
              ) : (
                <div className='mb-6 overflow-hidden rounded-lg border border-border bg-card'>
                  {mediaUrl && contentType === 'video' && (
                    <video
                      controls
                      className='aspect-video w-full'
                      src={mediaUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}

                  {mediaUrl && contentType === 'audio' && (
                    <div className='p-8'>
                      <audio controls className='w-full' src={mediaUrl}>
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
              <div className='mb-6 flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50'>
                <div className='text-center'>
                  <Lock className='mx-auto mb-4 h-16 w-16 text-muted-foreground' />
                  <h3 className='mb-2 text-xl font-semibold'>
                    Exclusive Content
                  </h3>
                  <p className='mb-4 text-muted-foreground'>
                    Subscribe to {creator.displayName} to unlock this content
                  </p>
                  <Button onClick={handleCreatorClick}>
                    View Subscription Tiers
                  </Button>
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
      </div>

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
    </div>
  );
}
