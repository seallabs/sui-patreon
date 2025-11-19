/**
 * Dashboard Service
 *
 * Service layer for fetching creator dashboard data from the backend API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Dashboard API response types
 */
export interface DashboardOverview {
  totalMembers: number;
  totalRevenue: string; // SUI amount as string
}

export interface DashboardActivity {
  commentsCount: number;
  likesCount: number;
  impressionsCount: number;
}

export interface DashboardRecentPost {
  id: string;
  title: string;
  contentType: string; // MIME type (e.g., "video/mp4", "image/png")
  exclusiveId: string; // Walrus patch ID for encrypted content
  previewId: string | null; // Walrus patch ID for public preview
  audience: "free" | "paid";
  createdAt: string;
  viewCount: number;
  likeCount: number;
}

export interface DashboardContentItem {
  id: string;
  title: string;
  contentType: string; // MIME type (e.g., "video/mp4", "image/png")
  exclusiveId: string; // Walrus patch ID for encrypted content
  previewId: string | null; // Walrus patch ID for public preview
  audience: "free" | "paid";
  tierNames: string[];
  createdAt: string;
  viewCount: number;
  likeCount: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  activity: DashboardActivity;
  recentPost: DashboardRecentPost | null;
  recentPosts: DashboardContentItem[];
  cursor: string | null;
  hasMore: boolean;
}

/**
 * Query parameters for dashboard API
 */
export interface DashboardQueryParams {
  creatorAddress?: string;
  type?: "all" | "image" | "video" | "audio" | "text";
  tier?: "all" | string; // "all" or tier ID
  time?: "all" | "7days" | "30days";
  search?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Fetch dashboard data for a creator
 */
export async function fetchDashboardData(
  params: DashboardQueryParams = {}
): Promise<DashboardData> {
  try {
    const queryParams = new URLSearchParams();

    // Add query parameters
    if (params.creatorAddress) {
      queryParams.append("creatorAddress", params.creatorAddress);
    }
    if (params.type && params.type !== "all") {
      queryParams.append("type", params.type);
    }
    if (params.tier && params.tier !== "all") {
      queryParams.append("tier", params.tier);
    }
    if (params.time && params.time !== "all") {
      queryParams.append("time", params.time);
    }
    if (params.search) {
      queryParams.append("search", params.search);
    }
    if (params.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    const url = `${API_BASE_URL}/api/dashboard?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Don't cache dashboard data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch dashboard data: ${response.statusText}`
      );
    }

    const data: DashboardData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);

    // Return empty data structure on error
    return {
      overview: {
        totalMembers: 0,
        totalRevenue: "0",
      },
      activity: {
        commentsCount: 0,
        likesCount: 0,
        impressionsCount: 0,
      },
      recentPost: null,
      recentPosts: [],
      cursor: null,
      hasMore: false,
    };
  }
}
