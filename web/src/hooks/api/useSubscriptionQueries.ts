'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import {
  fetchSubscriptionStatus,
  fetchUserSubscriptions,
  SubscriptionStatusResponse,
  UserSubscription,
} from '@/services/subscriptions';

type UserSubscriptionsQueryOptions = Omit<
  UseQueryOptions<UserSubscription[], Error, UserSubscription[], unknown[]>,
  'queryKey' | 'queryFn'
>;

type SubscriptionStatusQueryOptions = Omit<
  UseQueryOptions<
    SubscriptionStatusResponse,
    Error,
    SubscriptionStatusResponse,
    unknown[]
  >,
  'queryKey' | 'queryFn'
>;

/**
 * Fetch all active subscriptions for a user.
 */
export function useUserSubscriptions(
  address?: string,
  options?: UserSubscriptionsQueryOptions
) {
  return useQuery({
    queryKey: ['subscriptions', address],
    queryFn: () => fetchUserSubscriptions(address!),
    enabled: Boolean(address),
    ...options,
  });
}

/**
 * Fetch subscription status for a user/creator pair.
 */
export function useSubscriptionStatus(
  address?: string,
  creatorAddress?: string,
  options?: SubscriptionStatusQueryOptions
) {
  return useQuery({
    queryKey: ['subscriptionStatus', address, creatorAddress],
    queryFn: () => fetchSubscriptionStatus(address!, creatorAddress!),
    enabled: Boolean(address && creatorAddress),
    ...options,
  });
}

