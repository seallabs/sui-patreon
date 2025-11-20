"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Users } from "lucide-react";
import { ExploreCreator } from "@/types";
import { formatNumber } from "@/lib/utils";

interface ExploreCreatorCardProps {
  creator: ExploreCreator;
}

export function ExploreCreatorCard({ creator }: ExploreCreatorCardProps) {
  // Use dicebear as fallback for avatar
  const avatarUrl =
    creator.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.address}`;

  return (
    <Link
      href={`/creator/${creator.address}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Background Image - Large banner at top */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
        {creator.backgroundUrl ? (
          <Image
            src={creator.backgroundUrl}
            alt={`${creator.displayName} background`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-muted-foreground/20">
              {creator.displayName[0]}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Avatar and Creator Info */}
        <div className="mb-3 flex items-start gap-3">
          {/* Avatar - Overlapping cover image */}
          <div className="relative -mt-8 h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-4 border-background">
            <Image
              src={avatarUrl}
              alt={creator.displayName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1 pt-1">
            {/* Creator name with verified badge */}
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-semibold">
                {creator.displayName}
              </h3>
              {creator.isVerified && (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
              )}
            </div>

            {/* SuiNS name */}
            {creator.suinsName && (
              <p className="truncate text-sm text-muted-foreground">
                @{creator.suinsName.replace(".sui", "")}
              </p>
            )}
          </div>
        </div>

        {/* Bio - 1-2 lines */}
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {creator.bio}
        </p>

        {/* Stats and Category */}
        <div className="flex items-center justify-between">
          {/* Follower count */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{formatNumber(creator.followerCount)}</span>
          </div>

          {/* Category badge */}
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {creator.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
