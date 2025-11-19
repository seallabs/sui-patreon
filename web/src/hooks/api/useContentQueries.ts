'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ContentDetailData, fetchContentDetail } from '@/services/content';

type ContentDetailQueryOptions = Omit<
  UseQueryOptions<ContentDetailData, Error, ContentDetailData, unknown[]>,
  'queryKey' | 'queryFn'
>;

/**
 * React Query hook for fetching content detail.
 */
export function useContentDetail(
  contentId?: string,
  userAddress?: string,
  options?: ContentDetailQueryOptions
) {
  return useQuery({
    queryKey: ['contentDetail', contentId, userAddress],
    queryFn: () => fetchContentDetail(contentId!, userAddress),
    enabled: Boolean(contentId),
    ...options,
  });
}
