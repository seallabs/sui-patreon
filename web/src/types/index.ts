/**
 * Type definitions for the Sui Patreon platform
 */

export interface CreatorProfile {
  id: string;
  address: string;
  suinsName?: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl?: string;
  category: string;
  followerCount: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface SubscriptionTier {
  id: string;
  creatorAddress: string;
  name: string;
  description: string;
  price: number; // in SUI
  benefits: string[];
  subscriberCount: number;
  isActive: boolean;
}

export interface Content {
  id: string;
  creatorAddress: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  contentType: "video" | "audio" | "image" | "text";
  blobId?: string; // Walrus blob ID
  tierIds: string[]; // Required tiers for access
  isPublic: boolean;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
}

export interface Subscription {
  id: string;
  subscriberAddress: string;
  creatorAddress: string;
  tierId: string;
  startDate: Date;
  expiresAt: Date;
  isActive: boolean;
  autoRenew: boolean;
}

export interface TopicCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  creatorCount: number;
}

export interface User {
  address: string;
  suinsName?: string | null;
  displayName?: string;
  avatarUrl?: string;
  email?: string; // From OAuth provider
  isCreator?: boolean;
  subscriptions: Subscription[];
  createdAt: Date;
}

export interface ActivityEvent {
  id: string;
  type: "subscription" | "revenue" | "comment" | "like" | "impression";
  creatorAddress: string;
  timestamp: Date;
  metadata: {
    amount?: number; // For revenue events
    subscriberName?: string; // For subscription events
    tierName?: string; // For subscription events
    contentTitle?: string; // For engagement events
    contentId?: string;
  };
}

export interface CreatorAnalytics {
  totalSubscribers: number;
  monthlyRevenue: number; // in SUI
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
}

export interface PostFilter {
  type: "all" | "video" | "audio" | "image" | "text";
  tier: "all" | string; // "all" or tier ID
  dateRange: "all" | "today" | "week" | "month";
}
