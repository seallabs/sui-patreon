import { CreatorProfile } from "@/types";
import { Topic } from "@/lib/topics";
import { generateTopicFromId } from "@/lib/topic-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface HomeCreatorResponse {
  id: string;
  address: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  category: string;
  topic?: number; // Topic ID (0-9) when backend supports it
  followerCount: number;
  isVerified: boolean;
  contentCount: number;
}

export interface HomeCreatorsResponse {
  creators: HomeCreatorResponse[];
}

export type HomeSection = "recently-visited" | "recommended" | "popular";

/**
 * Fetch creators for a specific home page section
 */
export async function fetchHomeCreators(
  section: HomeSection,
  limit: number = 8,
  userAddress?: string
): Promise<CreatorProfile[]> {
  const queryParams = new URLSearchParams();
  queryParams.append("section", section);
  queryParams.append("limit", limit.toString());

  // Add userAddress to exclude connected user from all sections
  if (userAddress) {
    queryParams.append("userAddress", userAddress);
  }

  const url = `${API_BASE_URL}/api/home/creators?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store", // Don't cache in development
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${section} creators: ${response.statusText}`
    );
  }

  const data: HomeCreatorsResponse = await response.json();

  // Map API response to CreatorProfile type
  return data.creators.map((creator) => mapToCreatorProfile(creator));
}

/**
 * Map backend creator response to frontend CreatorProfile type
 */
function mapToCreatorProfile(creator: HomeCreatorResponse): CreatorProfile {
  // Use dicebear avatar for default or invalid URLs
  // Only use creator.avatarUrl if it's from allowed domains (dicebear, unsplash, etc.)
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
      if (allowedDomains.some(domain => url.hostname === domain)) {
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
    backgroundUrl: creator.backgroundUrl ?? undefined,
    category: creator.category,
    // Use topic from API if available, otherwise generate from ID for consistency
    topic: creator.topic ?? generateTopicFromId(creator.id),
    followerCount: creator.followerCount,
    isVerified: creator.isVerified,
    createdAt: new Date(), // Use current date as fallback since not in API yet
  };
}
