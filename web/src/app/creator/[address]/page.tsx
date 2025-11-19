"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/content-card";
import { CheckCircle2, Users, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useVisitTracking } from "@/hooks/useVisitTracking";
import { fetchCreatorProfile, CreatorProfileData } from "@/services/creator";
import { fetchSubscriptionStatus, SubscriptionStatus } from "@/services/subscription";
import { use } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePurchaseSubscription } from "@/lib/sui/subscription";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function CreatorProfilePage({ params }: PageProps) {
  const { address } = use(params);
  const { trackCreatorVisit } = useVisitTracking();
  const currentAccount = useCurrentAccount();
  const { purchaseSubscription, isLoading: isSubscribing } = usePurchaseSubscription();

  const [profileData, setProfileData] = useState<CreatorProfileData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  // Fetch profile data
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCreatorProfile(address);
      setProfileData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load creator profile";
      setError(errorMessage);
      console.error("Error loading creator profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch subscription status
  const loadSubscriptionStatus = useCallback(async () => {
    if (!currentAccount?.address || !address) {
      setSubscriptionStatus(null);
      return;
    }

    try {
      setIsLoadingSubscription(true);
      const status = await fetchSubscriptionStatus(
        currentAccount.address,
        address
      );
      setSubscriptionStatus(status);
    } catch (err) {
      console.error("Error loading subscription status:", err);
      // Fail gracefully - assume not subscribed
      setSubscriptionStatus({ isSubscribed: false });
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [currentAccount?.address, address]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load subscription status when wallet is connected
  useEffect(() => {
    if (currentAccount?.address && address) {
      loadSubscriptionStatus();
    } else {
      setSubscriptionStatus(null);
    }
  }, [currentAccount?.address, address, loadSubscriptionStatus]);

  // Track visit when page loads
  useEffect(() => {
    if (address) {
      trackCreatorVisit(address);
    }
  }, [address, trackCreatorVisit]);

  // Handle subscription purchase
  const handleSubscribe = useCallback(
    async (tierId: string, tierName: string, price: number) => {
      if (!currentAccount?.address) {
        toast.error("Wallet not connected", {
          description: "Please connect your wallet to subscribe",
        });
        return;
      }

      console.log("Subscribing with Sui tierId:", tierId);

      try {
        await purchaseSubscription(
          {
            creatorAddress: address,
            tierId,
            priceUsdc: price,
            tierName,
          },
          currentAccount.address
        );

        // Refresh subscription status after successful purchase
        await loadSubscriptionStatus();
        toast.success("Subscription successful!", {
          description: `You are now subscribed to ${tierName}`,
        });
      } catch (err) {
        // Error already handled by usePurchaseSubscription
        console.error("Subscription failed:", err);
      }
    },
    [address, currentAccount, purchaseSubscription, loadSubscriptionStatus]
  );

  // Helper function to get tier button state
  const getTierButtonState = (tierId: string) => {
    if (!currentAccount) {
      return { text: "Connect Wallet", variant: "default" as const, disabled: false };
    }

    if (isLoadingSubscription) {
      return { text: "Loading...", variant: "default" as const, disabled: true };
    }

    if (!subscriptionStatus?.isSubscribed) {
      return { text: "Subscribe", variant: "default" as const, disabled: false };
    }

    if (subscriptionStatus.subscription?.tierId === tierId) {
      return { text: "Subscribed", variant: "secondary" as const, disabled: true };
    }

    return { text: "Switch to This Tier", variant: "outline" as const, disabled: false };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header />
          <main>
            {/* Cover Image Skeleton */}
            <div className="h-64 w-full animate-pulse bg-muted" />

            {/* Profile Info Skeleton */}
            <div className="border-b border-border bg-card px-6 py-6">
              <div className="mx-auto max-w-5xl">
                <div className="flex items-start gap-6">
                  {/* Avatar Skeleton */}
                  <div className="relative -mt-16 h-32 w-32 flex-shrink-0 animate-pulse rounded-full bg-muted" />

                  {/* Info Skeleton */}
                  <div className="flex-1 space-y-3 pt-4">
                    <div className="h-8 w-64 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-96 animate-pulse rounded bg-muted" />
                    <div className="flex gap-6">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </div>
                  </div>

                  {/* Button Skeleton */}
                  <div className="h-10 w-32 animate-pulse rounded bg-muted pt-4" />
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="mx-auto max-w-5xl px-6 py-8">
              <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header />
          <main className="flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="mb-4 flex justify-center">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
              <h1 className="mb-2 text-2xl font-bold">Error Loading Profile</h1>
              <p className="mb-6 text-muted-foreground">{error}</p>
              <Button onClick={loadProfile}>Try Again</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // No data (shouldn't happen if loading/error handled correctly)
  if (!profileData) {
    return null;
  }

  const { creator, tiers, recentPosts } = profileData;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header />

        <main>
          {/* Cover Image */}
          <div className="relative h-64 w-full overflow-hidden bg-muted">
            {creator.coverImageUrl ? (
              <Image
                src={creator.coverImageUrl}
                alt={`${creator.displayName} cover`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-6xl font-bold text-muted-foreground/20">
                  {creator.displayName[0]}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="border-b border-border bg-card px-6 py-6">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative -mt-16 h-32 w-32 flex-shrink-0 overflow-hidden rounded-full border-4 border-background">
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <h1 className="text-3xl font-bold">
                      {creator.displayName}
                    </h1>
                    {creator.isVerified && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  {creator.suinsName && (
                    <p className="mb-3 text-muted-foreground">
                      {creator.suinsName}
                    </p>
                  )}
                  <p className="mb-4 max-w-2xl">{creator.bio}</p>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{formatNumber(creator.followerCount)} followers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined {creator.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {creator.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="mx-auto max-w-5xl px-6 py-8">
            {/* Subscription Tiers */}
            {tiers.length > 0 && (
              <section className="mb-12" data-section="tiers">
                <h2 className="mb-6 text-2xl font-semibold">
                  Membership tiers
                </h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {tiers.map((tier) => {
                    const buttonState = getTierButtonState(tier.tierId);
                    const isCurrentTier =
                      subscriptionStatus?.subscription?.tierId === tier.tierId;

                    return (
                      <div
                        key={tier.id}
                        className={`flex flex-col rounded-lg border bg-card p-6 ${
                          isCurrentTier
                            ? "border-primary shadow-md"
                            : "border-border"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-xl font-semibold">
                            {tier.name}
                          </h3>
                          {isCurrentTier && (
                            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              Current Plan
                            </span>
                          )}
                        </div>
                        <p className="mb-4 flex-1 text-sm text-muted-foreground">
                          {tier.description}
                        </p>
                        <div className="mb-4 text-3xl font-bold">
                          {tier.price} USDC/mo
                        </div>
                        <ul className="mb-6 space-y-2 text-sm">
                          {tier.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full"
                          variant={buttonState.variant}
                          onClick={() =>
                            handleSubscribe(tier.tierId, tier.name, tier.price)
                          }
                          disabled={
                            isSubscribing ||
                            buttonState.disabled ||
                            isLoadingSubscription
                          }
                        >
                          {isSubscribing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentTier ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {buttonState.text}
                            </>
                          ) : (
                            buttonState.text
                          )}
                        </Button>
                        {isCurrentTier && subscriptionStatus?.subscription && (
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            Expires:{" "}
                            {subscriptionStatus.subscription.expiresAt.toLocaleDateString()}
                          </p>
                        )}
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          {formatNumber(tier.subscriberCount)} subscribers
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state for no tiers */}
            {tiers.length === 0 && (
              <section className="mb-12">
                <h2 className="mb-6 text-2xl font-semibold">
                  Membership tiers
                </h2>
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No membership tiers available yet
                  </p>
                </div>
              </section>
            )}

            {/* Recent Posts */}
            <section>
              <h2 className="mb-6 text-2xl font-semibold">Recent posts</h2>
              {recentPosts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {recentPosts.map((item) => (
                    <ContentCard key={item.id} content={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No content available yet
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
