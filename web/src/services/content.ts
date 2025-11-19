import { Content, CreatorProfile } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * API response types for content detail endpoint
 */
interface ContentDetailApiResponse {
  content: {
    id: string;
    contentId: string;
    title: string;
    description: string;
    contentType: string;
    previewId: string | null;
    exclusiveId: string | null;
    isLocked: boolean;
    viewCount: number;
    likeCount: number;
    publishedAt: string;
    createdAt: string;
  };
  creator: {
    id: string;
    address: string;
    suinsName?: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    category: string;
    isVerified: boolean;
  };
  isSubscribed: boolean;
  relatedPosts: Array<{
    id: string;
    contentId: string;
    title: string;
    description: string;
    contentType: string;
    previewId: string | null;
    publishedAt: string;
    viewCount: number;
    likeCount: number;
  }>;
  popularPosts: Array<{
    id: string;
    contentId: string;
    title: string;
    description: string;
    contentType: string;
    previewId: string | null;
    publishedAt: string;
    viewCount: number;
    likeCount: number;
  }>;
}

/**
 * Post card type from API response
 */
interface PostCard {
  id: string;
  contentId: string;
  title: string;
  description: string;
  contentType: string;
  previewId: string | null;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

/**
 * Complete content detail data
 */
export interface ContentDetailData {
  id: string;
  contentId: string;
  title: string;
  description: string;
  contentType: "video" | "audio" | "image" | "text";
  pricing: number; // USDC with 6 decimals
  previewId: string | null;
  exclusiveId: string;
  creator: {
    address: string;
    suinsName?: string;
    displayName: string;
    avatarUrl: string;
  };
  likes: number;
  views: number;
  createdAt: Date;
  isPublic: boolean;
  isSubscribed: boolean;
  relatedPosts: Content[];
  popularPosts: Content[];
}

/**
 * Fetch content detail by content ID
 *
 * @param contentId - Content's Sui object ID
 * @param userAddress - Optional user address to check subscription status
 * @returns Content detail data with creator info and related posts
 * @throws Error if request fails
 */
export async function fetchContentDetail(
  contentId: string,
  userAddress?: string
): Promise<ContentDetailData> {
  try {
    // Build URL with optional address query param
    let contentUrl = `${API_BASE_URL}/api/content/${contentId}`;
    if (userAddress) {
      contentUrl += `?address=${encodeURIComponent(userAddress)}`;
    }

    const contentResponse = await fetch(contentUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!contentResponse.ok) {
      if (contentResponse.status === 404) {
        throw new Error("Content not found");
      }
      throw new Error(
        `Failed to fetch content: ${contentResponse.statusText}`
      );
    }

    const data: ContentDetailApiResponse = await contentResponse.json();

    // Map related and popular posts
    const relatedPosts = data.relatedPosts.map((post) =>
      mapPostCardToContent(post, data.creator.address)
    );

    const popularPosts = data.popularPosts.map((post) =>
      mapPostCardToContent(post, data.creator.address)
    );

    // Map to ContentDetailData
    return {
      id: data.content.id,
      contentId: data.content.contentId,
      title: data.content.title,
      description: data.content.description,
      contentType: normalizeContentType(data.content.contentType),
      pricing: 0, // Pricing not directly exposed in this endpoint
      previewId: data.content.previewId,
      exclusiveId: data.content.exclusiveId || "",
      creator: {
        address: data.creator.address,
        suinsName: data.creator.suinsName,
        displayName: data.creator.displayName,
        avatarUrl:
          data.creator.avatarUrl ||
          generateDefaultAvatar(data.creator.address),
      },
      likes: data.content.likeCount,
      views: data.content.viewCount,
      createdAt: new Date(data.content.publishedAt),
      isPublic: !data.content.isLocked,
      isSubscribed: data.isSubscribed,
      relatedPosts,
      popularPosts,
    };
  } catch (error) {
    console.error("Error fetching content detail:", error);
    throw error;
  }
}

/**
 * Map PostCard to Content type
 */
function mapPostCardToContent(
  post: PostCard,
  creatorAddress: string
): Content {
  return {
    id: post.id,
    creatorAddress,
    title: post.title,
    description: post.description,
    thumbnailUrl: post.previewId ? getWalrusUrl(post.previewId) : undefined,
    contentType: normalizeContentType(post.contentType),
    blobId: post.contentId,
    tierIds: [],
    isPublic: true, // Related posts shown are accessible
    createdAt: new Date(post.publishedAt),
    viewCount: post.viewCount,
    likeCount: post.likeCount,
  };
}

/**
 * Generate a default avatar URL using dicebear
 */
function generateDefaultAvatar(address: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
}

/**
 * Construct Walrus URL from patch ID
 */
function getWalrusUrl(patchId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/by-quilt-patch-id/${patchId}`;
}

/**
 * Normalize content type from MIME type to match frontend enum
 */
function normalizeContentType(
  type: string
): "video" | "audio" | "image" | "text" {
  if (type.startsWith("video")) return "video";
  if (type.startsWith("audio")) return "audio";
  if (type.startsWith("image")) return "image";
  return "text"; // Default fallback
}
