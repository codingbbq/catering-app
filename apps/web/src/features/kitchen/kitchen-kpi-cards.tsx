"use client";

import type { KitchenSummary } from "@catering/shared-types";
import { Card } from "@/components/ui/card";

interface KitchenKpiCardsProps {
  summary: KitchenSummary | null;
  isLoading: boolean;
}

export function KitchenKpiCards({ summary, isLoading }: KitchenKpiCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-white border border-[#E5E5E5] animate-pulse h-24">
            <div className="h-3 w-24 bg-[#E5E5E5] rounded mb-2"></div>
            <div className="h-6 w-16 bg-[#E5E5E5] rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  const taskPercent =
    summary.totalTasks > 0
      ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Plans */}
      <Card className="p-4 bg-white border border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Plans for Day
          </p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F5F4] text-[#171717] text-xs">
            {summary.scheduledPlans + summary.inProgressPlans}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#171717]">
          {summary.totalPlans}
        </p>
        <p className="text-xs text-[#737373] mt-1">
          {summary.scheduledPlans} scheduled · {summary.completedPlans} completed
        </p>
      </Card>

      {/* In Preparation */}
      <Card className="p-4 bg-white border border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            In Preparation
          </p>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
        </div>
        <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#171717]">
          {summary.inProgressPlans}
        </p>
        <p className="text-xs text-[#737373] mt-1">
          Active kitchen production plans
        </p>
      </Card>

      {/* Task Progress */}
      <Card className="p-4 bg-white border border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Tasks Completed
          </p>
          <span className="text-xs font-mono font-semibold text-[#171717]">
            {taskPercent}%
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#171717]">
          {summary.completedTasks}
          <span className="text-sm font-normal text-[#737373]"> / {summary.totalTasks}</span>
        </p>
        <div className="w-full bg-[#F5F5F4] h-1.5 rounded-full mt-2 overflow-hidden border border-[#E5E5E5]">
          <div
            className="bg-[#171717] h-full rounded-full transition-all duration-300"
            style={{ width: `${taskPercent}%` }}
          />
        </div>
      </Card>

      {/* Estimated Servings */}
      <Card className="p-4 bg-white border border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Total Servings
          </p>
          <span className="text-xs text-[#737373] uppercase font-mono">Portions</span>
        </div>
        <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#171717]">
          {summary.totalServings.toLocaleString()}
        </p>
        <p className="text-xs text-[#737373] mt-1">
          Commercial demand for selected date
        </p>
      </Card>
    </div>
  );
}
