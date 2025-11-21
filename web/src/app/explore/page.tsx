"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CategoryCard } from "@/components/explore/category-card";
import { ExploreCreatorCard } from "@/components/explore/creator-card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchNewCreators } from "@/services/explore";
import { ExploreCreator } from "@/types";
import { getUserAddress } from "@/lib/user-session";
import { useUser } from "@/contexts/user-context";
import { getAllTopics, TopicInfo } from "@/lib/topics";
import * as Icons from "lucide-react";

export default function ExplorePage() {
  const { user } = useUser(); // Get actual logged-in user
  const topics = getAllTopics();
  const [newCreators, setNewCreators] = useState<ExploreCreator[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isLoadingCreators, setIsLoadingCreators] = useState(true);

  // Fetch new creators on mount
  useEffect(() => {
    async function loadNewCreators() {
      try {
        setIsLoadingCreators(true);
        // Use actual logged-in user address for filtering
        const userAddress = user?.address;
        const data = await fetchNewCreators(30, 0, userAddress); // Fetch more to ensure we have enough per topic
        setNewCreators(data);
      } catch (error) {
        console.error("Failed to load new creators:", error);
      } finally {
        setIsLoadingCreators(false);
      }
    }

    loadNewCreators();
  }, [user]); // Re-fetch when user changes

  // Calculate creator count per topic
  const topicCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    topics.forEach(topic => {
      counts[topic.id] = newCreators.filter(c => c.topic === topic.id).length;
    });
    return counts;
  }, [newCreators, topics]);

  // Filter creators by selected topic
  const filteredCreators = useMemo(() => {
    if (selectedTopic === null) return [];
    return newCreators.filter(c => c.topic === selectedTopic).slice(0, 9);
  }, [newCreators, selectedTopic]);

  // Handle topic filter
  const handleTopicClick = (topicId: number) => {
    setSelectedTopic(topicId);
  };

  // Clear topic filter
  const handleClearFilter = () => {
    setSelectedTopic(null);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header />

        <main className="p-6">
          {/* Topics Section */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold">Explore by topic</h2>

            {isLoadingCreators ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {topics.map((topic) => {
                  const IconComponent = Icons[topic.iconName] as React.ComponentType<{
                    className?: string;
                  }>;
                  const creatorCount = topicCounts[topic.id] || 0;

                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicClick(topic.id)}
                      className="group block overflow-hidden rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg"
                    >
                      {/* Icon */}
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        {IconComponent ? (
                          <IconComponent className="h-6 w-6" />
                        ) : (
                          <Icons.Folder className="h-6 w-6" />
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 text-lg font-semibold">{topic.displayName}</h3>

                      {/* Description */}
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {topic.description}
                      </p>

                      {/* Creator count */}
                      <p className="text-xs text-muted-foreground">
                        {creatorCount} {creatorCount === 1 ? 'creator' : 'creators'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Filtered Creators Section (when topic is selected) */}
          {selectedTopic !== null && (
            <section className="mb-12">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {topics.find(t => t.id === selectedTopic)?.displayName}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilter}
                >
                  Clear filter
                </Button>
              </div>

              {filteredCreators.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No creators found in this topic
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCreators.map((creator) => (
                    <ExploreCreatorCard key={creator.id} creator={creator} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* New Creators Section */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-semibold">New on SuiPatreon</h2>

            {isLoadingCreators ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : newCreators.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  No new creators to display
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {newCreators.map((creator) => (
                  <ExploreCreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
