"use client";

import { useState, useEffect } from "react";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { SubscriberInfo } from "@/types";
import { useUser } from "@/contexts/user-context";

export default function AudiencePage() {
  const { user } = useUser();
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "tier" | "expires">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const subscribersPerPage = 20;

  useEffect(() => {
    if (user?.address) {
      fetchSubscribers();
    }
  }, [user?.address]);

  const fetchSubscribers = async () => {
    if (!user?.address) {
      setError("Please log in to view your audience");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3001/api/creators/${user.address}/subscribers`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscribers");
      }

      const data = await response.json();

      // Transform the API response to match SubscriberInfo interface
      const transformedData: SubscriberInfo[] = data.map((sub: any) => ({
        id: sub.id,
        subscriptionId: sub.subscriptionId,
        subscriber: sub.subscriber,
        tierId: sub.tierId,
        tierName: sub.tier?.name || "Unknown Tier",
        startsAt: new Date(sub.startsAt),
        expiresAt: new Date(sub.expiresAt),
        isActive: sub.isActive,
        createdAt: new Date(sub.createdAt),
      }));

      setSubscribers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching subscribers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter subscribers based on search and tier filter
  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      searchQuery === "" ||
      sub.subscriber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.tierName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier =
      filterTier === "all" || sub.tierName === filterTier;

    return matchesSearch && matchesTier;
  });

  // Sort subscribers
  const sortedSubscribers = [...filteredSubscribers].sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "desc"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime();
    } else if (sortBy === "tier") {
      return sortOrder === "desc"
        ? b.tierName.localeCompare(a.tierName)
        : a.tierName.localeCompare(b.tierName);
    } else {
      // expires
      return sortOrder === "desc"
        ? b.expiresAt.getTime() - a.expiresAt.getTime()
        : a.expiresAt.getTime() - b.expiresAt.getTime();
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedSubscribers.length / subscribersPerPage);
  const startIndex = (currentPage - 1) * subscribersPerPage;
  const paginatedSubscribers = sortedSubscribers.slice(
    startIndex,
    startIndex + subscribersPerPage
  );

  const toggleSort = (column: "date" | "tier" | "expires") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Get unique tier names for filter dropdown
  const uniqueTiers = Array.from(new Set(subscribers.map((sub) => sub.tierName)));

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const days = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <AdaptiveLayout>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold">Audience</h1>
            <p className="text-muted-foreground">
              View and manage your subscribers
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Subscribers
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {loading ? "-" : subscribers.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Subscriptions
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {loading ? "-" : subscribers.filter((s) => s.isActive).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Expiring Soon (30 days)
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {loading
                      ? "-"
                      : subscribers.filter(
                          (s) => getDaysUntilExpiry(s.expiresAt) <= 30 && getDaysUntilExpiry(s.expiresAt) > 0
                        ).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-4 flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {filterTier === "all" ? "All Tiers" : filterTier}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setFilterTier("all")}>
                  All Tiers
                </DropdownMenuItem>
                {uniqueTiers.map((tier) => (
                  <DropdownMenuItem
                    key={tier}
                    onClick={() => setFilterTier(tier)}
                  >
                    {tier}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search subscribers or tiers"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button onClick={fetchSubscribers} disabled={loading}>
              Refresh
            </Button>
          </div>

          {/* Subscribers Table */}
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  Loading subscribers...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
              <div className="text-center">
                <p className="text-lg font-medium text-destructive">
                  Error loading subscribers
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                <Button
                  onClick={fetchSubscribers}
                  variant="outline"
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("tier")}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Tier
                        {sortBy === "tier" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("date")}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Join Date
                        {sortBy === "date" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("expires")}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Expires
                        {sortBy === "expires" &&
                          (sortOrder === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="text-muted-foreground">
                          <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                          <p className="text-lg font-medium">
                            No subscribers yet
                          </p>
                          <p className="mt-2 text-sm">
                            When people subscribe to your tiers, they will
                            appear here
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubscribers.map((sub) => {
                      const daysUntilExpiry = getDaysUntilExpiry(sub.expiresAt);
                      const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white">
                                {sub.subscriber.slice(2, 4).toUpperCase()}
                              </div>
                              <span className="font-mono text-sm">
                                {formatAddress(sub.subscriber)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{sub.tierName}</TableCell>
                          <TableCell>{formatDate(sub.startsAt)}</TableCell>
                          <TableCell>
                            <div>
                              {formatDate(sub.expiresAt)}
                              {isExpiringSoon && (
                                <span className="ml-2 text-xs text-amber-600">
                                  ({daysUntilExpiry} days)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                sub.isActive && daysUntilExpiry > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {sub.isActive && daysUntilExpiry > 0
                                ? "Active"
                                : "Expired"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  View Transactions
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && paginatedSubscribers.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdaptiveLayout>
  );
}
