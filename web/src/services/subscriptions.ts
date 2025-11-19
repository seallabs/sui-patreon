const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SubscriptionCreator {
  id: string;
  address: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface SubscriptionTier {
  id: string;
  tierId: string;
  name: string;
  description: string | null;
  price: number;
  benefits: string[];
  subscriberCount?: number;
  isActive: boolean;
  creator: SubscriptionCreator | null;
}

export interface UserSubscription {
  id: string;
  subscriptionId?: string;
  subscriber: string;
  tierId: string;
  startsAt: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
  tier: SubscriptionTier | null;
}

export interface SubscriptionStatusResponse {
  isSubscribed: boolean;
  subscription?: {
    id: string;
    tierId: string;
    tierName: string;
    startedAt: string;
    expiresAt: string;
    isActive: boolean;
  };
}

/**
 * Fetch all active subscriptions for a user.
 */
export async function fetchUserSubscriptions(
  address: string
): Promise<UserSubscription[]> {
  if (!address) {
    throw new Error('address is required');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/subscriptions/${encodeURIComponent(address)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subscriptions: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data ?? data;
}

/**
 * Check if a user is subscribed to a specific creator.
 */
export async function fetchSubscriptionStatus(
  address: string,
  creatorAddress: string
): Promise<SubscriptionStatusResponse> {
  if (!address || !creatorAddress) {
    throw new Error('address and creatorAddress are required');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/subscriptions/${encodeURIComponent(
      address
    )}/creator/${encodeURIComponent(creatorAddress)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subscription status: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return (data.data ?? data) as SubscriptionStatusResponse;
}

