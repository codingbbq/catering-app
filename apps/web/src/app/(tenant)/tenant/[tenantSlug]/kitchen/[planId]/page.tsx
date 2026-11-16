"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getKitchenPlan } from "@/lib/kitchen-api";
import { KitchenPlanDetailView } from "@/features/kitchen/kitchen-plan-detail-view";

export default function KitchenPlanDetailPage() {
  const { tenantSlug, planId } = useParams<{ tenantSlug: string; planId: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const { data: plan, isLoading, error, refetch } = useQuery({
    queryKey: ["kitchen-plan", tenantSlug, planId],
    queryFn: () => getKitchenPlan(planId, accessToken!),
    enabled: !!accessToken && !!planId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-[#E5E5E5] rounded animate-pulse" />
        <div className="h-64 rounded-lg bg-white border border-[#E5E5E5] p-6 animate-pulse" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-900">
            Failed to load kitchen production plan
          </p>
          <p className="text-xs text-rose-700 mt-1">
            {error instanceof Error ? error.message : "Plan not found"}
          </p>
          <button
            onClick={() => router.push(`/tenant/${tenantSlug}/kitchen`)}
            className="mt-4 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white"
          >
            Back to Kitchen Operations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <KitchenPlanDetailView
        plan={plan}
        tenantSlug={tenantSlug}
        token={accessToken!}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
