"use client";

import { Users, Info, DollarSign } from "lucide-react";
import { CreatorAnalytics } from "@/types";

interface OverviewSectionProps {
  analytics: CreatorAnalytics;
}

export function OverviewSection({ analytics }: OverviewSectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-2xl font-bold">Overview</h2>
        <button className="rounded-full p-1 hover:bg-accent">
          <Info className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Membership Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            Membership
          </div>
          <div className="text-3xl font-bold">{analytics.totalSubscribers}</div>
          <div className="mt-1 text-sm text-muted-foreground">total members</div>
        </div>

        {/* Revenue Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Total Revenue
          </div>
          <div className="text-3xl font-bold">
            {analytics.monthlyRevenue.toFixed(2)} USDC
          </div>
          <div className="mt-1 text-sm text-muted-foreground">all-time earnings</div>
        </div>
      </div>
    </section>
  );
}
