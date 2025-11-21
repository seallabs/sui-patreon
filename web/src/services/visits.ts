/**
 * Visit tracking service
 *
 * Handles tracking creator profile visits and fetching recently visited creators.
 */

import { CreatorProfile } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Backend API response for recently visited creators
 */
interface CreatorData {
  id: string;
  address: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  category?: string;
  followerCount: number;
  isVerified?: boolean;
  contentCount?: number;
}

interface VisitedCreatorResponse {
  visitId: string;
  visitedAt: string;
  creator: CreatorData;
}

interface RecentVisitsResponse {
  visits: VisitedCreatorResponse[];
}

/**
 * Track a visit to a creator profile
 *
 * This function is non-blocking and handles errors gracefully.
 * Failures are logged but don't affect the user experience.
 *
 * @param creatorAddress - The Sui address of the creator being visited
 * @param userAddress - The Sui address of the visitor (optional)
 */
export async function trackVisit(
  creatorAddress: string,
  userAddress?: string
): Promise<void> {
  // Validate inputs
  if (!creatorAddress) {
    console.warn("trackVisit: creatorAddress is required");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creatorAddress,
        userAddress,
      }),
    });

    if (!response.ok) {
      // Log error but don't throw - visit tracking is non-critical
      console.warn(
        `Failed to track visit: ${response.status} ${response.statusText}`
      );
      return;
    }

    // Success - no need to process response
  } catch (error) {
    // Network error or other failure - log but don't throw
    console.error("Error tracking visit:", error);
  }
}

/**
 * Fetch recently visited creators for a user
 *
 * @param userAddress - The Sui address of the user
 * @param limit - Maximum number of recent visits to return (default: 10)
 * @returns Array of CreatorProfile objects sorted by visit recency
 */
export async function fetchRecentVisits(
  userAddress: string,
  limit: number = 10
): Promise<CreatorProfile[]> {
  // Validate inputs
  if (!userAddress) {
    console.warn("fetchRecentVisits: userAddress is required");
    return [];
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.append("limit", limit.toString());

    const url = `${API_BASE_URL}/api/visits/recent/${encodeURIComponent(
      userAddress
    )}?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch recent visits: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data: RecentVisitsResponse = await response.json();

    // Map API response to CreatorProfile type
    return data.visits.map((visit) => mapToCreatorProfile(visit));
  } catch (error) {
    console.error("Error fetching recent visits:", error);
    return [];
  }
}

/**
 * Map backend visited creator response to frontend CreatorProfile type
 *
 * Uses the same avatar handling logic as home.ts for consistency
 */
function mapToCreatorProfile(
  visit: VisitedCreatorResponse
): CreatorProfile {
  const creator = visit.creator;

  // Use dicebear avatar for default or invalid URLs
  // Only use creator.avatarUrl if it's from allowed domains
  let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.address}`;

  if (creator.avatarUrl) {
    const allowedDomains = [
      "api.dicebear.com",
      "images.unsplash.com",
      "avatars.githubusercontent.com",
      "minio.7k.ag",
      "sui-patreon-api.up.railway.app", // Backend proxy URLs
      "localhost", // Local development
    ];

    try {
      const url = new URL(creator.avatarUrl);
      if (allowedDomains.some((domain) => url.hostname === domain)) {
        avatarUrl = creator.avatarUrl;
      }
    } catch {
      // Invalid URL, use default
    }
  }

  // Check if name looks like a SuiNS name (ends with .sui)
  const suinsName = creator.name.endsWith(".sui") ? creator.name : undefined;

  return {
    id: creator.id,
    address: creator.address,
    suinsName,
    displayName: creator.name,
    bio: creator.bio,
    avatarUrl,
    category: creator.category || "Creator", // Default to "Creator" if no category
    followerCount: creator.followerCount,
    isVerified: creator.isVerified || false,
    createdAt: new Date(visit.visitedAt), // Use visit time as a reference
  };
}
