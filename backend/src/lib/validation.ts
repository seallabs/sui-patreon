/**
 * Input Validation Utilities
 *
 * Provides validation helpers for API request parameters.
 */

/**
 * Validate and parse limit parameter for pagination
 * @param limit - Limit value from query params
 * @param defaultLimit - Default limit if not provided
 * @param maxLimit - Maximum allowed limit
 * @returns Validated limit number
 */
export function validateLimit(
  limit: string | undefined,
  defaultLimit: number = 20,
  maxLimit: number = 100
): number {
  if (!limit) {
    return defaultLimit;
  }

  const parsed = parseInt(limit, 10);

  if (isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}

/**
 * Validate Sui address format
 * Basic validation: starts with 0x and is 66 characters (0x + 64 hex chars)
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Validate Sui object ID format
 * Same format as address
 */
export function isValidSuiObjectId(objectId: string): boolean {
  return isValidSuiAddress(objectId);
}

/**
 * Sanitize search query
 * Remove special characters that could cause issues
 */
export function sanitizeSearchQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&');
}

/**
 * Topic mapping from numeric value to display name
 * Matches the smart contract's topic enum (0-9)
 */
export const TOPIC_NAMES: Record<number, string> = {
  0: 'Travel',
  1: 'Movies & shows',
  2: 'Motorsports',
  3: 'Podcasts & shows',
  4: 'Lifestyle',
  5: 'Visual arts',
  6: 'Sports',
  7: 'Entertainment',
  8: 'Pop culture',
  9: 'Comedy',
};

/**
 * Validate topic value
 * @param topic - Topic value to validate (number 0-9)
 * @returns true if valid, false otherwise
 */
export function isValidTopic(topic: number): boolean {
  return Number.isInteger(topic) && topic >= 0 && topic <= 9;
}

/**
 * Parse and validate topic from query parameter
 * @param topicParam - Topic value from query string
 * @returns Validated topic number or null if invalid
 */
export function parseTopicParam(topicParam: string | undefined): number | null {
  if (!topicParam) {
    return null;
  }

  const parsed = parseInt(topicParam, 10);

  if (isNaN(parsed) || !isValidTopic(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Get topic display name from numeric value
 * @param topic - Topic numeric value (0-9)
 * @returns Topic display name or 'Unknown'
 */
export function getTopicName(topic: number): string {
  return TOPIC_NAMES[topic] || 'Unknown';
}
