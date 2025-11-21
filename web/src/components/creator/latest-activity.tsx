"use client";

import { useState } from "react";
import { MessageSquare, Heart, Eye, Lock } from "lucide-react";
import { ActivityEvent, Content } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LatestActivityProps {
  activities: ActivityEvent[];
  recentPost?: Content;
  totalComments: number;
  totalLikes: number;
  totalImpressions: number;
}

type ActivityTab = "comments" | "likes" | "impressions";

export function LatestActivity({
  activities,
  recentPost,
  totalComments,
  totalLikes,
  totalImpressions,
}: LatestActivityProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>("impressions");

  const tabs = [
    { id: "likes" as ActivityTab, label: "Likes", count: totalLikes, icon: Heart },
    { id: "impressions" as ActivityTab, label: "Impressions", count: totalImpressions, icon: Eye },
  ];

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-bold">Latest activity</h2>

      <div className="rounded-lg border border-border bg-card">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className="ml-1">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {recentPost ? (
            <div className="flex gap-4">
              {/* Post Thumbnail */}
              {recentPost.thumbnailUrl && (
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={recentPost.thumbnailUrl}
                    alt={recentPost.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Post Info */}
              <div className="flex-1">
                <h3 className="mb-2 font-semibold">{recentPost.title}</h3>
                <Button variant="outline" size="sm">
                  Share post
                </Button>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Creators who frequently share posts get higher traffic and new members</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity yet. Create your first post to see engagement metrics!
            </div>
          )}

          {/* Only You Can See This Message */}
          {recentPost && (
            <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Only you can see this</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
