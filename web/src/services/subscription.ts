const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Subscription status API response
 */
interface SubscriptionStatusApiResponse {
  isSubscribed: boolean;
  subscription?: {
    id: string;
    tierId: string;
    tierName: string;
    startedAt: string; // ISO date string
    expiresAt: string; // ISO date string
    isActive: boolean;
  };
}

/**
 * Subscription status with parsed dates
 */
export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscription?: {
    id: string;
    tierId: string;
    tierName: string;
    startedAt: Date;
    expiresAt: Date;
    isActive: boolean;
  };
}

/**
 * Fetch subscription status for a subscriber on a creator's profile
 *
 * @param subscriberAddress - Address of the subscriber (current user)
 * @param creatorAddress - Address of the creator whose profile is being viewed
 * @returns Subscription status including active subscription details if any
 * @throws Error if request fails
 */
export async function fetchSubscriptionStatus(
  subscriberAddress: string,
  creatorAddress: string
): Promise<SubscriptionStatus> {
  try {
    const url = `${API_BASE_URL}/api/subscriptions/${subscriberAddress}/creator/${creatorAddress}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Don't cache subscription status
    });

    if (!response.ok) {
      // If 404, assume not subscribed
      if (response.status === 404) {
        return {
          isSubscribed: false,
        };
      }
      throw new Error(`Failed to fetch subscription status: ${response.statusText}`);
    }

    const data: SubscriptionStatusApiResponse = await response.json();

    // Map API response to SubscriptionStatus type
    return mapToSubscriptionStatus(data);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    // On error, fail gracefully and assume not subscribed
    return {
      isSubscribed: false,
    };
  }
}

/**
 * Map API response to SubscriptionStatus type with parsed dates
 */
function mapToSubscriptionStatus(
  data: SubscriptionStatusApiResponse
): SubscriptionStatus {
  if (!data.isSubscribed || !data.subscription) {
    return {
      isSubscribed: false,
    };
  }

  return {
    isSubscribed: true,
    subscription: {
      id: data.subscription.id,
      tierId: data.subscription.tierId,
      tierName: data.subscription.tierName,
      startedAt: new Date(data.subscription.startedAt),
      expiresAt: new Date(data.subscription.expiresAt),
      isActive: data.subscription.isActive,
    },
  };
}
