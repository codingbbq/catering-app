"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  KitchenPlanStatus,
  KitchenProductionPlan,
  KitchenStation,
  KitchenTaskStatus,
} from "@catering/shared-types";
import { calculateKitchenPlanProgress } from "@catering/shared-types";
import {
  KitchenPlanStatusBadge,
  KitchenSourceBadge,
  KitchenStationBadge,
  KitchenTaskStatusBadge,
} from "./kitchen-status-badge";
import { updateKitchenTask } from "@/lib/kitchen-api";

interface KitchenBoardViewProps {
  plans: KitchenProductionPlan[];
  tenantSlug: string;
  token: string;
  onRefresh: () => void;
  selectedStation?: KitchenStation | undefined;
  onSelectStation: (station?: KitchenStation | undefined) => void;
}

const STATIONS: { value?: KitchenStation | undefined; label: string }[] = [
  { value: undefined, label: "All Stations" },
  { value: "prep", label: "Prep / Mise-en-place" },
  { value: "hot_kitchen", label: "Hot Kitchen" },
  { value: "cold_kitchen", label: "Cold Kitchen" },
  { value: "bakery_pastry", label: "Bakery & Pastry" },
  { value: "assembly_packing", label: "Assembly & Packing" },
  { value: "beverages", label: "Beverages" },
];

export function KitchenBoardView({
  plans,
  tenantSlug,
  token,
  onRefresh,
  selectedStation,
  onSelectStation,
}: KitchenBoardViewProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Filter plans based on status filter
  const filteredPlans = plans.filter((plan) => {
    if (statusFilter === "active") {
      return plan.status === "scheduled" || plan.status === "in_progress";
    }
    if (statusFilter === "completed") {
      return plan.status === "completed";
    }
    if (statusFilter === "all") {
      return true;
    }
    return plan.status === statusFilter;
  });

  const handleAdvanceTaskStatus = async (
    planId: string,
    taskId: string,
    currentStatus: KitchenTaskStatus,
  ) => {
    let nextStatus: KitchenTaskStatus = "in_progress";
    if (currentStatus === "pending") nextStatus = "in_progress";
    else if (currentStatus === "in_progress") nextStatus = "completed";
    else if (currentStatus === "completed") nextStatus = "pending";

    setUpdatingTaskId(taskId);
    try {
      await updateKitchenTask(planId, taskId, { status: nextStatus }, token);
      onRefresh();
    } catch (err) {
      console.error("Failed to update task status:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Station Tabs + View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5E5] pb-3">
        {/* Station Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {STATIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSelectStation(s.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedStation === s.value
                  ? "bg-[#171717] text-white"
                  : "bg-white text-[#737373] border border-[#E5E5E5] hover:text-[#171717] hover:bg-[#FAFAFA]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* View Filters & Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-[#E5E5E5] bg-white p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded font-medium ${
                statusFilter === "active"
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded font-medium ${
                statusFilter === "completed"
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded font-medium ${
                statusFilter === "all"
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              All
            </button>
          </div>

          <div className="flex rounded border border-[#E5E5E5] bg-white p-0.5">
            <button
              onClick={() => setViewMode("cards")}
              title="Board / Card View"
              className={`p-1.5 rounded text-xs ${
                viewMode === "cards" ? "bg-[#171717] text-white" : "text-[#737373]"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded text-xs ${
                viewMode === "table" ? "bg-[#171717] text-white" : "text-[#737373]"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[#171717]">No production plans found</p>
          <p className="text-xs text-[#737373] mt-1">
            Create a plan manually or convert from confirmed bookings and meal orders.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => {
            const progress = calculateKitchenPlanProgress(plan.tasks);
            const filteredTasks = selectedStation
              ? plan.tasks.filter((t) => t.station === selectedStation)
              : plan.tasks;

            return (
              <div
                key={plan.id}
                className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-sm hover:border-[#171717]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Plan Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#F0F0F0] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#171717]">
                          {plan.planNumber}
                        </span>
                        <KitchenSourceBadge source={plan.source} />
                      </div>
                      <Link
                        href={`/tenant/${tenantSlug}/kitchen/${plan.id}`}
                        className="font-semibold text-sm text-[#171717] hover:underline mt-1 block line-clamp-1"
                      >
                        {plan.title}
                      </Link>
                    </div>
                    <KitchenPlanStatusBadge status={plan.status} />
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-[#737373]">
                    <div>
                      <span className="text-[10px] uppercase font-mono block">Servings</span>
                      <span className="font-mono font-medium text-[#171717]">
                        {plan.estimatedServings} Portions
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block">Service Slot</span>
                      <span className="capitalize text-[#171717]">
                        {plan.serviceSlot || "General"}
                      </span>
                    </div>
                  </div>

                  {/* Dietary Note Highlight */}
                  {plan.dietaryNotes && (
                    <div className="mt-2 rounded bg-amber-50 border border-amber-200/80 p-1.5 text-[11px] text-amber-900 font-medium">
                      ⚠ {plan.dietaryNotes}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-[11px] text-[#737373] mb-1">
                      <span>Tasks Readiness</span>
                      <span className="font-mono font-semibold text-[#171717]">
                        {progress.completed} / {progress.total} ({progress.percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F5F5F4] rounded-full overflow-hidden border border-[#E5E5E5]">
                      <div
                        className="bg-[#171717] h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="mt-3 border-t border-[#F0F0F0] pt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredTasks.length === 0 ? (
                      <p className="text-[11px] text-[#737373] italic py-1">
                        No tasks in selected station filter
                      </p>
                    ) : (
                      filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-[#FAFAFA] border border-transparent hover:border-[#E5E5E5]"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <button
                              onClick={() =>
                                handleAdvanceTaskStatus(plan.id, task.id, task.status)
                              }
                              disabled={updatingTaskId === task.id}
                              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                task.status === "completed"
                                  ? "bg-[#171717] border-[#171717] text-white"
                                  : task.status === "in_progress"
                                  ? "border-amber-500 bg-amber-50 text-amber-700"
                                  : "border-[#E5E5E5] bg-white hover:border-[#171717]"
                              }`}
                              title="Click to advance status"
                            >
                              {task.status === "completed" && "✓"}
                              {task.status === "in_progress" && "•"}
                            </button>
                            <span
                              className={`truncate ${
                                task.status === "completed"
                                  ? "line-through text-[#737373]"
                                  : "text-[#171717]"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {task.dueTime && (
                              <span className="font-mono text-[10px] text-[#737373]">
                                {task.dueTime}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                handleAdvanceTaskStatus(plan.id, task.id, task.status)
                              }
                              disabled={updatingTaskId === task.id}
                              title="Click to change task status"
                            >
                              <KitchenTaskStatusBadge status={task.status} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-2.5 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[#737373]">
                    {plan.planDate.split("T")[0]}
                  </span>
                  <Link
                    href={`/tenant/${tenantSlug}/kitchen/${plan.id}`}
                    className="font-medium text-[#171717] hover:underline"
                  >
                    Open Plan Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-semibold uppercase text-[#737373]">
              <tr>
                <th className="py-2.5 px-4">Plan #</th>
                <th className="py-2.5 px-4">Title & Demand Source</th>
                <th className="py-2.5 px-4">Date & Slot</th>
                <th className="py-2.5 px-4 text-right">Servings</th>
                <th className="py-2.5 px-4">Readiness</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {filteredPlans.map((plan) => {
                const progress = calculateKitchenPlanProgress(plan.tasks);
                return (
                  <tr key={plan.id} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4 font-mono font-medium text-[#171717]">
                      {plan.planNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#171717]">{plan.title}</div>
                      <div className="mt-0.5">
                        <KitchenSourceBadge source={plan.source} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[#171717]">{plan.planDate.split("T")[0]}</div>
                      <div className="text-[11px] text-[#737373] capitalize">
                        {plan.serviceSlot || "General"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#171717]">
                      {plan.estimatedServings}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-[#F5F5F4] rounded-full overflow-hidden border border-[#E5E5E5]">
                          <div
                            className="bg-[#171717] h-full rounded-full"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[#737373]">
                          {progress.completed}/{progress.total}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <KitchenPlanStatusBadge status={plan.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/tenant/${tenantSlug}/kitchen/${plan.id}`}
                        className="font-medium text-[#171717] hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
