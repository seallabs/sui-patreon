"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScrollableSectionProps {
  title: string;
  showSeeAll?: boolean;
  seeAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function ScrollableSection({
  title,
  showSeeAll = false,
  seeAllHref = "/explore",
  children,
  className = "",
}: ScrollableSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const newScrollPosition =
        scrollContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);

      scrollContainerRef.current.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className={`mb-8 w-full ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showSeeAll && (
          <a
            href={seeAllHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            See all
          </a>
        )}
      </div>

      <div className="group/section relative w-full">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card shadow-lg opacity-0 transition-opacity group-hover/section:opacity-100 hover:bg-accent"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex w-full gap-4 overflow-x-auto pb-2 scrollbar-hide"
        >
          {children}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card shadow-lg opacity-0 transition-opacity group-hover/section:opacity-100 hover:bg-accent"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
