/**
 * Topic utility functions
 *
 * Provides consistent topic generation for creators when backend doesn't return topic field
 */

/**
 * Generate a consistent topic for a creator based on their ID
 * This ensures the same creator always gets the same topic across all services
 *
 * @param id - Creator ID (address or database ID)
 * @returns Topic number (0-9)
 *
 * TODO: Remove this function once backend consistently returns the topic field
 */
export function generateTopicFromId(id: string): number {
  // Use a simple hash of the ID to generate a consistent topic (0-9)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 10;
}
