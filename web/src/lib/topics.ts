/**
 * Topic definitions and utilities
 *
 * Topics categorize creators on the platform.
 * Each creator belongs to exactly one topic (0-9).
 */

import * as Icons from "lucide-react";

/**
 * Topic enum matching backend numbering (0-9)
 */
export enum Topic {
  Travel = 0,
  MoviesAndShows = 1,
  Motorsports = 2,
  PodcastsAndShows = 3,
  Lifestyle = 4,
  VisualArts = 5,
  Sports = 6,
  Entertainment = 7,
  PopCulture = 8,
  Comedy = 9,
}

/**
 * Topic metadata with display information
 */
export interface TopicInfo {
  id: Topic;
  name: string;
  displayName: string;
  description: string;
  iconName: keyof typeof Icons;
}

/**
 * Complete topic configuration
 */
export const TOPICS: readonly TopicInfo[] = [
  {
    id: Topic.Travel,
    name: "travel",
    displayName: "Travel",
    description: "Travel vlogs, guides, and adventure content",
    iconName: "Plane",
  },
  {
    id: Topic.MoviesAndShows,
    name: "movies-shows",
    displayName: "Movies & shows",
    description: "Film reviews, TV show discussions, and entertainment analysis",
    iconName: "Film",
  },
  {
    id: Topic.Motorsports,
    name: "motorsports",
    displayName: "Motorsports",
    description: "Racing, cars, and motorsport content",
    iconName: "CarFront",
  },
  {
    id: Topic.PodcastsAndShows,
    name: "podcasts-shows",
    displayName: "Podcasts & shows",
    description: "Audio content creators and podcasters",
    iconName: "Mic",
  },
  {
    id: Topic.Lifestyle,
    name: "lifestyle",
    displayName: "Lifestyle",
    description: "Health, wellness, fashion, and daily life content",
    iconName: "Heart",
  },
  {
    id: Topic.VisualArts,
    name: "visual-arts",
    displayName: "Visual arts",
    description: "Artists, illustrators, and designers",
    iconName: "Palette",
  },
  {
    id: Topic.Sports,
    name: "sports",
    displayName: "Sports",
    description: "Sports analysis, fitness, and athletic content",
    iconName: "Trophy",
  },
  {
    id: Topic.Entertainment,
    name: "entertainment",
    displayName: "Entertainment",
    description: "Music, performances, and entertainment content",
    iconName: "Music",
  },
  {
    id: Topic.PopCulture,
    name: "pop-culture",
    displayName: "Pop culture",
    description: "Trends, memes, and pop culture commentary",
    iconName: "Sparkles",
  },
  {
    id: Topic.Comedy,
    name: "comedy",
    displayName: "Comedy",
    description: "Stand-up, sketches, and comedic content",
    iconName: "Laugh",
  },
] as const;

/**
 * Get topic display name from topic number
 */
export function getTopicDisplayName(topic: number | null | undefined): string {
  if (topic === null || topic === undefined || topic < 0 || topic > 9) {
    return "Creator"; // Fallback for invalid/missing topic
  }
  return TOPICS[topic].displayName;
}

/**
 * Get topic info from topic number
 */
export function getTopicInfo(topic: number | null | undefined): TopicInfo | null {
  if (topic === null || topic === undefined || topic < 0 || topic > 9) {
    return null;
  }
  return TOPICS[topic];
}

/**
 * Get topic icon component
 */
export function getTopicIcon(topic: number | null | undefined): keyof typeof Icons {
  const info = getTopicInfo(topic);
  return info?.iconName ?? "User";
}

/**
 * Get all topics as array (for filters, dropdowns, etc.)
 */
export function getAllTopics(): readonly TopicInfo[] {
  return TOPICS;
}

/**
 * Find topic by name
 */
export function findTopicByName(name: string): TopicInfo | undefined {
  return TOPICS.find(t => t.name === name || t.displayName === name);
}
