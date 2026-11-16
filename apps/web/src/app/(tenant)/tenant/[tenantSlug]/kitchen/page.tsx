"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/providers/auth-provider";
import type { KitchenStation } from "@catering/shared-types";
import { getKitchenSummary, listKitchenPlans } from "@/lib/kitchen-api";
import { KitchenKpiCards } from "@/features/kitchen/kitchen-kpi-cards";
import { KitchenBoardView } from "@/features/kitchen/kitchen-board-view";
import { CreateKitchenPlanModal } from "@/features/kitchen/create-kitchen-plan-modal";

export default function KitchenPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  // Date selection state (defaults to today's local date YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0] || "";
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0] || "";

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStation, setSelectedStation] = useState<KitchenStation | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch summary for selected date
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["kitchen-summary", tenantSlug, selectedDate],
    queryFn: () => getKitchenSummary(accessToken!, selectedDate),
    enabled: !!accessToken,
  });

  // Fetch production plans
  const { data: plansData, isLoading: isLoadingPlans, refetch: refetchPlans } = useQuery({
    queryKey: ["kitchen-plans", tenantSlug, selectedDate, selectedStation, search],
    queryFn: () =>
      listKitchenPlans(accessToken!, {
        date: selectedDate,
        station: selectedStation,
        search: search.trim() || undefined,
        limit: 100,
      }),
    enabled: !!accessToken,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["kitchen-summary", tenantSlug] });
    refetchPlans();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Kitchen Operations"
        description="Translate commercial demand into production execution, station prep, and kitchen chit sheets"
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-[#171717] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Production Plan
          </button>
        }
      />

      {/* Date & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg border border-[#E5E5E5] shadow-sm">
        {/* Date Selector Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Date:
          </span>
          <div className="flex rounded border border-[#E5E5E5] bg-[#FAFAFA] p-0.5 text-xs">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedDate === todayStr
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedDate === tomorrowStr
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Tomorrow
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
          />
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans, dishes, venue..."
            className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 pl-8 text-xs text-[#171717] placeholder-[#737373] focus:border-[#171717] focus:outline-none"
          />
          <svg
            className="w-4 h-4 text-[#737373] absolute left-2.5 top-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <KitchenKpiCards summary={summary || null} isLoading={isLoadingSummary} />

      {/* Kitchen Board / Table View */}
      {isLoadingPlans ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg border border-[#E5E5E5] bg-white animate-pulse p-4" />
          ))}
        </div>
      ) : (
        <KitchenBoardView
          plans={plansData?.plans || []}
          tenantSlug={tenantSlug}
          token={accessToken!}
          onRefresh={handleRefresh}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
        />
      )}

      {/* Create Kitchen Plan Modal */}
      <CreateKitchenPlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={accessToken!}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
