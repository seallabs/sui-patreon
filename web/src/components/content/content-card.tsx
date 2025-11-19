"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart, Eye, Lock } from "lucide-react";
import { Content } from "@/types";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

interface ContentCardProps {
  content: Content;
}

export function ContentCard({ content }: ContentCardProps) {
  const getContentIcon = () => {
    switch (content.contentType) {
      case "video":
        return <Play className="h-8 w-8" />;
      case "audio":
        return <Play className="h-8 w-8" />;
      default:
        return null;
    }
  };

  return (
    <Link href={`/content/${content.id}`}>
      <div className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {content.thumbnailUrl ? (
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-muted-foreground/20">
              {content.title[0]}
            </span>
          </div>
        )}

        {/* Play icon for video/audio */}
        {getContentIcon() && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-black/60 p-3 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
              {getContentIcon()}
            </div>
          </div>
        )}

        {/* Lock icon for private content */}
        {!content.isPublic && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm">
            <Lock className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4">
        <h3 className="mb-2 line-clamp-1 font-semibold">{content.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {content.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{formatNumber(content.viewCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            <span>{formatNumber(content.likeCount)}</span>
          </div>
          <span>{formatRelativeTime(content.createdAt)}</span>
        </div>
      </div>
    </div>
    </Link>
  );
}
