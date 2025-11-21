import { ExploreCategory, ExploreCreator } from "@/types";
import { generateTopicFromId } from "@/lib/topic-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

/**
 * Mock data for development
 */
const MOCK_CATEGORIES: ExploreCategory[] = [
  {
    id: "1",
    name: "Podcasts & shows",
    description: "Audio content from creators worldwide",
    iconName: "Mic",
    creatorCount: 1234,
    slug: "podcasts-and-shows",
  },
  {
    id: "2",
    name: "Tabletop games",
    description: "RPG campaigns, board game reviews, and more",
    iconName: "Dices",
    creatorCount: 567,
    slug: "tabletop-games",
  },
  {
    id: "3",
    name: "Music",
    description: "Independent musicians and composers",
    iconName: "Music",
    creatorCount: 2890,
    slug: "music",
  },
  {
    id: "4",
    name: "Writing",
    description: "Fiction, poetry, and creative writing",
    iconName: "BookOpen",
    creatorCount: 1456,
    slug: "writing",
  },
  {
    id: "5",
    name: "Video & film",
    description: "Filmmakers and video creators",
    iconName: "Video",
    creatorCount: 3200,
    slug: "video-and-film",
  },
  {
    id: "6",
    name: "Visual arts",
    description: "Illustrations, paintings, and digital art",
    iconName: "Palette",
    creatorCount: 4100,
    slug: "visual-arts",
  },
  {
    id: "7",
    name: "Gaming",
    description: "Game developers and streamers",
    iconName: "Gamepad2",
    creatorCount: 5600,
    slug: "gaming",
  },
  {
    id: "8",
    name: "Technology",
    description: "Tech tutorials and educational content",
    iconName: "Code",
    creatorCount: 890,
    slug: "technology",
  },
];

const MOCK_CREATORS: ExploreCreator[] = [
  {
    id: "1",
    address: "0x1234567890abcdef1234567890abcdef12345678",
    suinsName: "artbyalex.sui",
    displayName: "Alex Johnson",
    bio: "Digital artist creating surreal landscapes and character designs",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    backgroundUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    category: "Visual arts",
    followerCount: 12500,
    isVerified: true,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    suinsName: "musicmaker.sui",
    displayName: "Sarah Chen",
    bio: "Indie musician and songwriter exploring experimental sounds",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    backgroundUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800",
    category: "Music",
    followerCount: 8900,
    isVerified: true,
    createdAt: new Date("2024-02-20"),
  },
  {
    id: "3",
    address: "0x7890abcdef1234567890abcdef1234567890abcd",
    suinsName: "techtalks.sui",
    displayName: "David Kumar",
    bio: "Software engineer sharing tutorials on blockchain development",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    backgroundUrl: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800",
    category: "Technology",
    followerCount: 15200,
    isVerified: false,
    createdAt: new Date("2023-12-10"),
  },
  {
    id: "4",
    address: "0xdef1234567890abcdef1234567890abcdef12345",
    suinsName: "writerjess.sui",
    displayName: "Jessica Martinez",
    bio: "Fantasy author crafting epic tales of magic and adventure",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
    backgroundUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    category: "Writing",
    followerCount: 6700,
    isVerified: true,
    createdAt: new Date("2024-03-05"),
  },
  {
    id: "5",
    address: "0x5678abcdef1234567890abcdef1234567890abcd",
    suinsName: "travelwithemily.sui",
    displayName: "Emily Rodriguez",
    bio: "Travel photographer documenting hidden gems around the world",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
    backgroundUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
    category: "Visual arts",
    followerCount: 24300,
    isVerified: true,
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "6",
    address: "0x9abcdef1234567890abcdef1234567890abcdef1",
    suinsName: "podcastpro.sui",
    displayName: "Marcus Williams",
    bio: "Host of Tech Talks Weekly - conversations with industry leaders",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    backgroundUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800",
    category: "Podcasts & shows",
    followerCount: 18900,
    isVerified: true,
    createdAt: new Date("2024-02-10"),
  },
];

/**
 * Fetch all categories with creator counts
 */
export async function fetchCategories(): Promise<ExploreCategory[]> {
  if (USE_MOCK_DATA) {
    return Promise.resolve(MOCK_CATEGORIES);
  }

  try {
    const url = `${API_BASE_URL}/api/explore/categories`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Fallback to mock data on error
    return MOCK_CATEGORIES;
  }
}

/**
 * Fetch new creators (recently joined)
 */
export async function fetchNewCreators(
  limit: number = 6,
  offset: number = 0,
  userAddress?: string
): Promise<ExploreCreator[]> {
  if (USE_MOCK_DATA) {
    return Promise.resolve(MOCK_CREATORS.slice(offset, offset + limit));
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.append("limit", limit.toString());
    queryParams.append("offset", offset.toString());

    // Add userAddress to exclude connected user
    if (userAddress) {
      queryParams.append("userAddress", userAddress);
    }

    const url = `${API_BASE_URL}/api/explore/creators/new?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch new creators: ${response.statusText}`);
    }

    const data = await response.json();
    // Add topic to creators if not present
    const creatorsWithTopics = (data.creators || []).map((creator: any) => ({
      ...creator,
      topic: creator.topic ?? generateTopicFromId(creator.id),
    }));
    return creatorsWithTopics;
  } catch (error) {
    console.error("Error fetching new creators:", error);
    // Fallback to mock data on error
    const mockWithTopics = MOCK_CREATORS.slice(offset, offset + limit).map(creator => ({
      ...creator,
      topic: generateTopicFromId(creator.id),
    }));
    return mockWithTopics;
  }
}

/**
 * Fetch creators by category
 */
export async function fetchCreatorsByCategory(
  category: string,
  limit: number = 9,
  offset: number = 0,
  userAddress?: string
): Promise<ExploreCreator[]> {
  if (USE_MOCK_DATA) {
    const filtered = MOCK_CREATORS.filter(
      (c) => c.category.toLowerCase() === category.toLowerCase()
    );
    return Promise.resolve(filtered.slice(offset, offset + limit));
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.append("category", category);
    queryParams.append("limit", limit.toString());
    queryParams.append("offset", offset.toString());

    // Add userAddress to exclude connected user
    if (userAddress) {
      queryParams.append("userAddress", userAddress);
    }

    const url = `${API_BASE_URL}/api/explore/creators?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch creators by category: ${response.statusText}`
      );
    }

    const data = await response.json();
    // Add topic to creators if not present
    const creatorsWithTopics = (data.creators || []).map((creator: any) => ({
      ...creator,
      topic: creator.topic ?? generateTopicFromId(creator.id),
    }));
    return creatorsWithTopics;
  } catch (error) {
    console.error("Error fetching creators by category:", error);
    // Fallback to mock data on error
    const filtered = MOCK_CREATORS.filter(
      (c) => c.category.toLowerCase() === category.toLowerCase()
    ).map(creator => ({
      ...creator,
      topic: generateTopicFromId(creator.id),
    }));
    return filtered.slice(offset, offset + limit);
  }
}
