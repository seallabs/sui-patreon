"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout";
import { CreatorCard } from "@/components/creator/creator-card";
import { TopicFilters } from "@/components/home/topic-filters";
import { ScrollableSection } from "@/components/home/scrollable-section";
import { mockCreators } from "@/lib/mock-data";
import { fetchHomeCreators } from "@/services/home";
import { CreatorProfile } from "@/types";
import { getUserAddress } from "@/lib/user-session";
import { useVisitTracking } from "@/hooks/useVisitTracking";
import { useUser } from "@/contexts/user-context";

export default function HomePage() {
  const { trackCreatorVisit } = useVisitTracking();
  const { user } = useUser(); // Get actual logged-in user

  // State for each section
  const [recentlyVisited, setRecentlyVisited] = useState<CreatorProfile[]>([]);
  const [creatorsForYou, setCreatorsForYou] = useState<CreatorProfile[]>([]);
  const [popularThisWeek, setPopularThisWeek] = useState<CreatorProfile[]>([]);

  // Loading states
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);

  // Error states
  const [errorRecent, setErrorRecent] = useState<string | null>(null);
  const [errorRecommended, setErrorRecommended] = useState<string | null>(null);
  const [errorPopular, setErrorPopular] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    // Fetch recently visited creators
    const loadRecentlyVisited = async () => {
      try {
        setIsLoadingRecent(true);
        setErrorRecent(null);
        // Use actual logged-in user address, fall back to visit tracking address
        const userAddress = user?.address || getUserAddress();
        const creators = await fetchHomeCreators("recently-visited", 6, userAddress);
        setRecentlyVisited(creators);
      } catch (error) {
        console.error("Failed to fetch recently visited creators:", error);
        setErrorRecent("Failed to load recently visited creators");
        // Fallback to mock data
        setRecentlyVisited(mockCreators.slice(0, 6));
      } finally {
        setIsLoadingRecent(false);
      }
    };

    // Fetch recommended creators
    const loadRecommended = async () => {
      try {
        setIsLoadingRecommended(true);
        setErrorRecommended(null);
        // Use actual logged-in user address for filtering
        const userAddress = user?.address;
        const creators = await fetchHomeCreators("recommended", 8, userAddress);
        setCreatorsForYou(creators);
      } catch (error) {
        console.error("Failed to fetch recommended creators:", error);
        setErrorRecommended("Failed to load recommended creators");
        // Fallback to mock data
        setCreatorsForYou(mockCreators.slice(0, 8));
      } finally {
        setIsLoadingRecommended(false);
      }
    };

    // Fetch popular creators
    const loadPopular = async () => {
      try {
        setIsLoadingPopular(true);
        setErrorPopular(null);
        // Use actual logged-in user address for filtering
        const userAddress = user?.address;
        const creators = await fetchHomeCreators("popular", 8, userAddress);
        setPopularThisWeek(creators);
      } catch (error) {
        console.error("Failed to fetch popular creators:", error);
        setErrorPopular("Failed to load popular creators");
        // Fallback to mock data
        setPopularThisWeek(mockCreators.slice(2, 10));
      } finally {
        setIsLoadingPopular(false);
      }
    };

    // Load all sections in parallel
    loadRecentlyVisited();
    loadRecommended();
    loadPopular();
  }, [user]); // Re-fetch when user changes

  return (
    <AdaptiveLayout>
      <main className="overflow-x-hidden p-6">
        {/* Topic Filters */}
        <TopicFilters />

        {/* Recently Visited Section */}
        {isLoadingRecent ? (
          <div className="mb-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentlyVisited.length > 0 ? (
          <ScrollableSection title="Recently visited">
            {recentlyVisited.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} variant="compact" />
            ))}
          </ScrollableSection>
        ) : (
          !errorRecent && (
            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No recently visited creators yet. Explore creators below!
              </p>
            </div>
          )
        )}

        {/* Creators For You Section */}
        {isLoadingRecommended ? (
          <div className="mb-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : creatorsForYou.length > 0 ? (
          <ScrollableSection title="Creators for you" showSeeAll seeAllHref="/explore">
            {creatorsForYou.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} variant="compact" />
            ))}
          </ScrollableSection>
        ) : (
          !errorRecommended && (
            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No recommended creators found at this time.
              </p>
            </div>
          )
        )}

        {/* Popular This Week Section */}
        {isLoadingPopular ? (
          <div className="mb-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : popularThisWeek.length > 0 ? (
          <ScrollableSection title="Popular this week" showSeeAll seeAllHref="/explore">
            {popularThisWeek.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} variant="compact" />
            ))}
          </ScrollableSection>
        ) : (
          !errorPopular && (
            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No popular creators found at this time.
              </p>
            </div>
          )
        )}

        {/* Empty State for Non-Logged In Users */}
        {!getUserAddress() && (
          <section className="mt-12 rounded-lg border border-border bg-card p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold">Start supporting creators</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect your wallet to discover and support amazing creators on the Sui blockchain
            </p>
            <button className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Connect Wallet
            </button>
          </section>
        )}
      </main>
    </AdaptiveLayout>
  );
}
