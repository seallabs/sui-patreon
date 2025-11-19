import { CreatorProfile, SubscriptionTier, Content } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * API response types for creator profile endpoint
 */
interface CreatorProfileApiResponse {
  creator: {
    id: string;
    address: string;
    name: string;
    bio: string;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    followerCount: number;
    joinedDate: string; // ISO date string
    category: string;
    isVerified: boolean;
    suinsName?: string;
  };
  tiers: Array<{
    id: string;
    tierId: string;
    name: string;
    description: string;
    price: number; // In SUI
    benefits: string[];
    subscriberCount: number;
    isActive: boolean;
  }>;
  recentPosts: Array<{
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    publishedAt: string; // ISO date string
    viewCount: number;
    likeCount: number;
    contentType: string;
    isPublic: boolean;
  }>;
}

/**
 * Full creator profile data including tiers and posts
 */
export interface CreatorProfileData {
  creator: CreatorProfile;
  tiers: SubscriptionTier[];
  recentPosts: Content[];
}

/**
 * Fetch complete creator profile data for public-facing profile page
 *
 * @param address - Creator's Sui wallet address
 * @returns Creator profile data with tiers and recent posts
 * @throws Error if request fails
 */
export async function fetchCreatorProfile(
  address: string
): Promise<CreatorProfileData> {
  try {
    const url = `${API_BASE_URL}/api/creators/${address}/profile`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Don't cache profile data
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Creator not found");
      }
      throw new Error(`Failed to fetch creator profile: ${response.statusText}`);
    }

    const data: CreatorProfileApiResponse = await response.json();

    // Map API response to frontend types
    return mapToCreatorProfileData(data);
  } catch (error) {
    console.error("Error fetching creator profile:", error);
    throw error;
  }
}

/**
 * Map API response to CreatorProfileData type
 */
function mapToCreatorProfileData(
  data: CreatorProfileApiResponse
): CreatorProfileData {
  const { creator, tiers, recentPosts } = data;

  // Map creator
  const creatorProfile: CreatorProfile = {
    id: creator.id,
    address: creator.address,
    suinsName: creator.suinsName,
    displayName: creator.name,
    bio: creator.bio,
    avatarUrl: creator.avatarUrl || generateDefaultAvatar(creator.address),
    coverImageUrl: creator.coverImageUrl || undefined,
    category: creator.category,
    followerCount: creator.followerCount,
    isVerified: creator.isVerified,
    createdAt: new Date(creator.joinedDate),
  };

  // Map tiers
  const mappedTiers: SubscriptionTier[] = tiers.map((tier) => ({
    id: tier.id,
    tierId: tier.tierId,
    creatorAddress: creator.address,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    benefits: tier.benefits,
    subscriberCount: tier.subscriberCount,
    isActive: tier.isActive,
  }));

  // Map recent posts
  const mappedPosts: Content[] = recentPosts.map((post) => ({
    id: post.id,
    creatorAddress: creator.address,
    title: post.title,
    description: post.description,
    thumbnailUrl: post.thumbnailUrl,
    contentType: normalizeContentType(post.contentType),
    blobId: undefined, // Not included in profile response
    tierIds: [], // Not included in profile response
    isPublic: post.isPublic,
    createdAt: new Date(post.publishedAt),
    viewCount: post.viewCount,
    likeCount: post.likeCount,
  }));

  return {
    creator: creatorProfile,
    tiers: mappedTiers,
    recentPosts: mappedPosts,
  };
}

/**
 * Generate a default avatar URL using dicebear
 */
function generateDefaultAvatar(address: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
}

/**
 * Normalize content type to match frontend enum
 */
function normalizeContentType(
  type: string
): "video" | "audio" | "image" | "text" {
  const normalized = type.toLowerCase();
  if (["video", "audio", "image", "text"].includes(normalized)) {
    return normalized as "video" | "audio" | "image" | "text";
  }
  return "text"; // Default fallback
}
