/**
 * Content Tiers Helper
 *
 * Utility functions for fetching and formatting tier information for content.
 */

import { prisma } from './prisma';
import { toStandardUnit } from '../config/currency';

/**
 * Check if a string is a valid UUID
 * UUIDs are in the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @param id - String to validate
 * @returns True if valid UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Tier information returned in API responses
 */
export interface AllowedTier {
  id: string; // Database UUID
  tierId: string; // Sui object ID
  name: string;
  description: string;
  price: string; // Formatted price in standard units (e.g., "5.00")
}

/**
 * Get allowed tiers for a single content item
 * Returns formatted tier details for all tiers that can access this content
 *
 * @param contentId - Content database UUID
 * @returns Array of allowed tier details
 */
export async function getAllowedTiersForContent(
  contentId: string
): Promise<AllowedTier[]> {
  // Validate UUID format
  if (!isValidUUID(contentId)) {
    return [];
  }

  // Fetch contentTier associations
  const contentTiers = await prisma.contentTier.findMany({
    where: { contentId },
    select: { tierId: true },
  });

  if (contentTiers.length === 0) {
    return [];
  }

  // Fetch full tier details
  const tierIds = contentTiers.map((ct) => ct.tierId);
  const tiers = await prisma.tier.findMany({
    where: {
      id: { in: tierIds },
      isActive: true, // Only include active tiers
    },
    orderBy: { price: 'asc' }, // Order by price (lowest to highest)
  });

  // Format tier details
  return tiers.map((tier) => ({
    id: tier.id,
    tierId: tier.tierId,
    name: tier.name,
    description: tier.description,
    price: toStandardUnit(tier.price),
  }));
}

/**
 * Get allowed tiers for multiple content items
 * Batches database queries for performance
 *
 * @param contentIds - Array of content database UUIDs
 * @returns Map of contentId -> allowed tiers array
 */
export async function getAllowedTiersForContents(
  contentIds: string[]
): Promise<Map<string, AllowedTier[]>> {
  if (contentIds.length === 0) {
    return new Map();
  }

  // Filter out invalid UUIDs to prevent Prisma errors
  const validContentIds = contentIds.filter((id) => isValidUUID(id));

  if (validContentIds.length === 0) {
    return new Map();
  }

  // Fetch all contentTier associations in one query
  const contentTiers = await prisma.contentTier.findMany({
    where: { contentId: { in: validContentIds } },
    select: { contentId: true, tierId: true },
  });

  // Get unique tier IDs
  const tierIds = [...new Set(contentTiers.map((ct) => ct.tierId))];

  // Fetch all tier details in one query
  const tiers = await prisma.tier.findMany({
    where: {
      id: { in: tierIds },
      isActive: true,
    },
    orderBy: { price: 'asc' },
  });

  // Create tier lookup map
  const tierMap = new Map<string, AllowedTier>();
  tiers.forEach((tier) => {
    tierMap.set(tier.id, {
      id: tier.id,
      tierId: tier.tierId,
      name: tier.name,
      description: tier.description,
      price: toStandardUnit(tier.price),
    });
  });

  // Group contentTiers by contentId
  const contentTierMap = new Map<string, AllowedTier[]>();
  contentIds.forEach((contentId) => {
    contentTierMap.set(contentId, []);
  });

  contentTiers.forEach((ct) => {
    const tier = tierMap.get(ct.tierId);
    if (tier) {
      const existing = contentTierMap.get(ct.contentId) || [];
      existing.push(tier);
      contentTierMap.set(ct.contentId, existing);
    }
  });

  // Sort tiers by price for each content
  contentTierMap.forEach((tiers) => {
    tiers.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  });

  return contentTierMap;
}

/**
 * Check if content is accessible without subscription
 * Returns true if content is public or has no tier requirements
 *
 * @param contentId - Content database UUID
 * @param isPublic - Whether content is marked as public
 * @returns True if freely accessible
 */
export async function isContentFreelyAccessible(
  contentId: string,
  isPublic: boolean
): Promise<boolean> {
  if (isPublic) {
    return true;
  }

  // Check if content has any tier requirements
  const contentTierCount = await prisma.contentTier.count({
    where: { contentId },
  });

  return contentTierCount === 0;
}
