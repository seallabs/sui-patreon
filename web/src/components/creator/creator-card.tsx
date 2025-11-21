import Link from "next/link";
import { CheckCircle2, Users } from "lucide-react";
import { CreatorProfile } from "@/types";
import { formatNumber } from "@/lib/utils";

interface CreatorCardProps {
  creator: CreatorProfile;
}

export function CreatorCard({ creator, variant = "default" }: CreatorCardProps & { variant?: "default" | "compact" }) {
  return (
    <Link
      href={`/creator/${creator.address}`}
      className={`group/card block flex-shrink-0 overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg ${
        variant === "compact" ? "w-[280px]" : "w-full"
      }`}
    >
      {/* Background Image - Made larger and more prominent */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
        {creator.backgroundUrl ? (
          <img
            src={creator.backgroundUrl}
            alt={`${creator.displayName} background`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-muted-foreground/20">
              {creator.displayName[0]}
            </span>
          </div>
        )}
      </div>

      {/* Content - More compact */}
      <div className="p-3">
        {/* Avatar and Info */}
        <div className="flex items-start gap-2.5">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-background">
            <img
              src={creator.avatarUrl}
              alt={creator.displayName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-sm font-semibold">{creator.displayName}</h3>
              {creator.isVerified && (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              )}
            </div>
            {creator.suinsName && (
              <p className="truncate text-xs text-muted-foreground">{creator.suinsName}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{creator.bio}</p>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{formatNumber(creator.followerCount)}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {creator.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
