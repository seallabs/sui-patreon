'use client';

import { LatestActivity } from '@/components/creator/latest-activity';
import { OverviewSection } from '@/components/creator/overview-section';
import { RecentPosts } from '@/components/creator/recent-posts';
import { AdaptiveLayout } from '@/components/layout/adaptive-layout';
import { useDashboardData } from '@/hooks/api/useDashboardQueries';
import {
  DashboardData,
  DashboardQueryParams,
  fetchDashboardData,
} from '@/services/dashboard';
import { Content } from '@/types';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { CreateProfileModal } from '@/components/creator/create-profile-modal';
import { useRouter } from 'next/navigation';

// Mock wallet address for development
const MOCK_WALLET_ADDRESS =
  '0x1abec7f223edeb5120fab9c0cc133db6167145937fd1261777e5eeab0e87f966';

/**
 * Map MIME type to simplified media type
 */
function mapContentTypeToMediaType(contentType: string): 'video' | 'audio' | 'image' | 'text' {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('image/')) return 'image';
  return 'text';
}

/**
 * Construct Walrus URL from patch ID
 */
function getWalrusUrl(patchId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/by-quilt-patch-id/${patchId}`;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const { hasProfile, isLoading: isLoadingProfile, refetch } = useCreatorProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Use user context address, fallback to mock for development
  const userAddress = user?.address || MOCK_WALLET_ADDRESS;
  const [filters, setFilters] = useState<DashboardQueryParams>({
    creatorAddress: userAddress,
    type: 'all',
    tier: 'all',
    time: 'all',
    search: '',
    limit: 20,
  });

  const queryClient = useQueryClient();
  // Only fetch dashboard data if user has a profile
  const shouldFetchDashboard = user && hasProfile;
  const { data: dashboardData, isLoading, error } = useDashboardData(
    shouldFetchDashboard ? filters : undefined
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Check if user needs to create a profile
  useEffect(() => {
    if (!isLoadingProfile && user && !hasProfile) {
      setShowProfileModal(true);
    }
  }, [isLoadingProfile, user, hasProfile]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<DashboardQueryParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      cursor: undefined, // Reset cursor on filter change
    }));
  };

  // Handle load more (pagination)
  const handleLoadMore = async () => {
    if (isLoadingMore || !dashboardData?.hasMore || !dashboardData.cursor) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await fetchDashboardData({
        ...filters,
        cursor: dashboardData.cursor,
      });

      queryClient.setQueryData<DashboardData>(
        ['dashboardData', filters],
        (prev) =>
          prev
            ? {
                ...nextPage,
                recentPosts: [...prev.recentPosts, ...nextPage.recentPosts],
              }
            : nextPage
      );
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Convert dashboard data to component props
  const analytics = dashboardData
    ? {
        totalSubscribers: dashboardData.overview.totalMembers,
        monthlyRevenue: parseFloat(dashboardData.overview.totalRevenue),
        totalViews: 0, // Not provided by API
        totalLikes: dashboardData.activity.likesCount,
        totalComments: dashboardData.activity.commentsCount,
        totalImpressions: dashboardData.activity.impressionsCount,
      }
    : {
        totalSubscribers: 0,
        monthlyRevenue: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalImpressions: 0,
      };

  // Convert recent post for LatestActivity component
  const recentPost = dashboardData?.recentPost
    ? ({
        id: dashboardData.recentPost.id,
        creatorAddress: MOCK_WALLET_ADDRESS,
        title: dashboardData.recentPost.title,
        description: '',
        thumbnailUrl: dashboardData.recentPost.previewId
          ? getWalrusUrl(dashboardData.recentPost.previewId)
          : undefined,
        contentType: mapContentTypeToMediaType(dashboardData.recentPost.contentType),
        tierIds: [],
        isPublic: dashboardData.recentPost.audience === 'free',
        createdAt: new Date(dashboardData.recentPost.createdAt),
        viewCount: dashboardData.recentPost.viewCount,
        likeCount: dashboardData.recentPost.likeCount,
      } as Content)
    : undefined;

  // Convert recent posts for RecentPosts component
  const posts: Content[] = dashboardData
    ? dashboardData.recentPosts.map((post) => ({
        id: post.id,
        creatorAddress: MOCK_WALLET_ADDRESS,
        title: post.title,
        description: '',
        thumbnailUrl: post.previewId ? getWalrusUrl(post.previewId) : undefined,
        contentType: mapContentTypeToMediaType(post.contentType),
        tierIds: [],
        isPublic: post.audience === 'free',
        createdAt: new Date(post.createdAt),
        viewCount: post.viewCount,
        likeCount: post.likeCount,
      }))
    : [];

  // Handle profile creation success
  const handleProfileCreated = async () => {
    setShowProfileModal(false);
    // Refetch creator profile to update hasProfile state
    await refetch();
    // Dashboard data will automatically refetch when hasProfile becomes true
  };

  useEffect(() => {
    setFilters({ creatorAddress: userAddress });
  }, [userAddress]);

  return (
    <AdaptiveLayout>
      <main className='p-4 sm:p-6 lg:p-8'>
        {/* Page Header */}
        <div className='mb-6 sm:mb-8'>
          <h1 className='text-2xl sm:text-3xl font-bold'>Home</h1>
        </div>

        {/* Error State */}
        {error && (
          <div className='mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-500'>
            <p className='font-medium'>Error loading dashboard</p>
            <p className='text-sm'>{error.message}</p>
          </div>
        )}

        {/* Loading State */}
        {(isLoading || isLoadingProfile) && !dashboardData ? (
          <div className='flex min-h-[400px] items-center justify-center'>
            <div className='text-center'>
              <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
              <p className='text-muted-foreground'>Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Section */}
            <OverviewSection analytics={analytics} />

            {/* Latest Activity */}
            <LatestActivity
              activities={[]} // Not needed anymore since we pass counts
              recentPost={recentPost}
              totalComments={analytics.totalComments}
              totalLikes={analytics.totalLikes}
              totalImpressions={analytics.totalImpressions}
            />

            {/* Recent Posts */}
            <RecentPosts
              posts={posts}
              tiers={[]} // Not needed for filtering with new implementation
              onFilterChange={handleFilterChange}
              onLoadMore={dashboardData?.hasMore ? handleLoadMore : undefined}
              isLoadingMore={isLoadingMore}
            />
          </>
        )}
      </main>

      {/* Profile Creation Modal */}
      <CreateProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        onSuccess={handleProfileCreated}
      />
    </AdaptiveLayout>
  );
}
