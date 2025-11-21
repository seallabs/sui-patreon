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
  backgroundUrl?: string; // Background banner image
  category: string; // Legacy field, will be replaced by topic
  topic?: number; // Topic ID (0-9), see lib/topics.ts - optional for backwards compatibility
  followerCount: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface SubscriptionTier {
  id: string; // Database UUID
  tierId: string; // Sui blockchain object ID
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
  contentType: 'video' | 'audio' | 'image' | 'text';
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
  type: 'subscription' | 'revenue' | 'comment' | 'like' | 'impression';
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
  type: 'all' | 'video' | 'audio' | 'image' | 'text';
  tier: 'all' | string; // "all" or tier ID
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export type MediaType = 'video' | 'audio' | 'image' | 'link' | 'attachment';

export type AudienceAccess = 'free' | 'paid';

export interface CreatePostFormData {
  title: string;
  content: string;
  audience: AudienceAccess;
  tierIds: string[];
  enableComments: boolean;
  tags: string[];
  isDrop: boolean;
  scheduledDate?: Date;
  emailSubscribers: boolean;
  previewFile: File | null;
  exclusiveFile: File | null;
}

export interface LibraryPost {
  id: string;
  title: string;
  publishDate: Date;
  tierAccess: 'Public' | 'Paid' | string;
  price?: number;
  postType: 'text' | 'video' | 'audio' | 'image';
  thumbnailUrl?: string;
  isDraft: boolean;
  viewCount?: number;
  likeCount?: number;
}

export type LibraryTab = 'posts' | 'collections' | 'drafts';

export interface SubscriberInfo {
  id: string;
  subscriptionId: string;
  subscriber: string; // Sui wallet address
  tierId: string;
  tierName: string;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface ExploreCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  creatorCount: number;
  slug: string;
}

export interface ExploreCreator {
  id: string;
  address: string;
  suinsName: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  backgroundUrl?: string | null; // Background banner image
  category: string; // Legacy field, will be replaced by topic
  topic?: number; // Topic ID (0-9), see lib/topics.ts
  followerCount: number;
  isVerified: boolean;
  createdAt: Date;
}

export type NotificationType = 'NEW_CONTENT' | 'NEW_SUBSCRIBER';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actorName: string | null;
  contentId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export interface CreatorProfileData {
  creator: CreatorProfile;
  tiers: SubscriptionTier[];
  recentPosts: Content[];
}
