"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Home, Compass, MessageSquare, Bell, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";
import { fetchRecentVisits } from "@/services/visits";
import { getUserAddress } from "@/lib/user-session";
import { CreatorProfile } from "@/types";
import { useVisitTracking } from "@/hooks/useVisitTracking";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chats", label: "Chats", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { trackCreatorVisit } = useVisitTracking();
  const { user } = useUser(); // Get actual logged-in user

  // State for recently visited creators
  const [recentlyVisited, setRecentlyVisited] = useState<CreatorProfile[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  // Fetch recent visits on mount and when user changes
  useEffect(() => {
    const loadRecentVisits = async () => {
      try {
        setIsLoadingVisits(true);
        // Use actual logged-in user address, fall back to visit tracking address
        const userAddress = user?.address || getUserAddress();

        if (userAddress) {
          const visits = await fetchRecentVisits(userAddress, 3);
          setRecentlyVisited(visits);
        }
      } catch (error) {
        console.error("Failed to load recent visits:", error);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    loadRecentVisits();
  }, [user]); // Re-fetch when user changes

  // Handle creator card click - track visit
  const handleCreatorClick = useCallback(
    (creatorAddress: string) => {
      trackCreatorVisit(creatorAddress);
    },
    [trackCreatorVisit]
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/sui-patreon-logo.png"
              alt="SuiPatreon Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold">SuiPatreon</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Recently Visited Section */}
        <div className="flex-1">
          {isLoadingVisits ? (
            <div className="flex items-center justify-center px-3 pb-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentlyVisited.length > 0 ? (
            <div className="px-3 pb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recently Visited
              </h3>
              <div className="space-y-0.5">
                {recentlyVisited.map((creator) => (
                  <Link
                    key={creator.id}
                    href={`/creator/${creator.address}`}
                    onClick={() => handleCreatorClick(creator.address)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                      <img
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">
                      {creator.displayName}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 space-y-3">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Powered by</p>
            <div className="flex items-center gap-2">
              <a
                href="https://sui.io"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <img
                  src="/sui-logo-transparent.png"
                  alt="Sui"
                  className="h-4 object-contain brightness-0 invert"
                />
              </a>
              <a
                href="https://walrus.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <img
                  src="/walrus-logo.svg"
                  alt="Walrus"
                  className="h-4 object-contain brightness-0 invert"
                />
              </a>
              <a
                href="https://sealvault.org"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <img
                  src="/seal-logo.svg"
                  alt="Seal"
                  className="h-4 object-contain brightness-0 invert"
                />
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Built by Seal Labs, creators of 7K
          </p>
        </div>
      </div>
    </aside>
  );
}
