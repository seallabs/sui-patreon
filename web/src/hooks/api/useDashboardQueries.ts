"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import {
  DashboardData,
  DashboardQueryParams,
  fetchDashboardData,
} from "@/services/dashboard";

type DashboardQueryOptions = Omit<
  UseQueryOptions<DashboardData, Error, DashboardData, unknown[]>,
  "queryKey" | "queryFn"
>;

/**
 * React Query hook for fetching dashboard data.
 * Pass undefined as params to disable the query (e.g., when user has no profile).
 */
export function useDashboardData(
  params?: DashboardQueryParams,
  options?: DashboardQueryOptions
) {
  return useQuery({
    queryKey: ["dashboardData", params],
    queryFn: () => fetchDashboardData(params!),
    ...options,
    enabled: !!params && !!params.creatorAddress,
  });
}

