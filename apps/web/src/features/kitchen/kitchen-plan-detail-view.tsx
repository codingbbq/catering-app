"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  CreateKitchenTaskItem,
  KitchenPlanStatus,
  KitchenProductionPlan,
  KitchenStation,
  KitchenTask,
  KitchenTaskStatus,
} from "@catering/shared-types";
import { calculateKitchenPlanProgress } from "@catering/shared-types";
import {
  KitchenPlanStatusBadge,
  KitchenSourceBadge,
  KitchenStationBadge,
  KitchenTaskStatusBadge,
} from "./kitchen-status-badge";
import { KitchenChitModal } from "./kitchen-chit-modal";
import { RecordConsumptionModal } from "./record-consumption-modal";
import {
  addKitchenTask,
  deleteKitchenTask,
  updateKitchenPlan,
  updateKitchenTask,
} from "@/lib/kitchen-api";

interface KitchenPlanDetailViewProps {
  plan: KitchenProductionPlan;
  tenantSlug: string;
  token: string;
  onRefresh: () => void;
}

const STATIONS: { value: KitchenStation; label: string }[] = [
  { value: "prep", label: "Prep / Mise-en-place" },
  { value: "hot_kitchen", label: "Hot Kitchen" },
  { value: "cold_kitchen", label: "Cold Kitchen / Salad" },
  { value: "bakery_pastry", label: "Bakery & Pastry" },
  { value: "assembly_packing", label: "Assembly & Packing" },
  { value: "beverages", label: "Beverages / Bar" },
  { value: "other", label: "General" },
];

export function KitchenPlanDetailView({
  plan,
  tenantSlug,
  token,
  onRefresh,
}: KitchenPlanDetailViewProps) {
  const [showChitModal, setShowChitModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStation, setNewTaskStation] = useState<KitchenStation>("prep");
  const [newTaskQty, setNewTaskQty] = useState<number | "">(plan.estimatedServings);
  const [newTaskUnit, setNewTaskUnit] = useState("portions");
  const [newTaskDueTime, setNewTaskDueTime] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskDietary, setNewTaskDietary] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Status updating state
  const [isUpdatingPlanStatus, setIsUpdatingPlanStatus] = useState(false);

  const progress = calculateKitchenPlanProgress(plan.tasks);

  const handlePlanStatusChange = async (newStatus: KitchenPlanStatus) => {
    setIsUpdatingPlanStatus(true);
    try {
      await updateKitchenPlan(plan.id, { status: newStatus }, token);
      onRefresh();
    } catch (err) {
      console.error("Failed to update plan status:", err);
    } finally {
      setIsUpdatingPlanStatus(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: KitchenTaskStatus) => {
    try {
      await updateKitchenTask(plan.id, taskId, { status: newStatus }, token);
      onRefresh();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this kitchen task?")) return;
    try {
      await deleteKitchenTask(plan.id, taskId, token);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAddingTask(true);
    try {
      const payload: CreateKitchenTaskItem = {
        title: newTaskTitle.trim(),
        station: newTaskStation,
        targetQuantity: typeof newTaskQty === "number" ? newTaskQty : null,
        unit: newTaskUnit || "portions",
        dueTime: newTaskDueTime || null,
        assignedTo: newTaskAssignedTo || null,
        dietaryAlerts: newTaskDietary || null,
        notes: newTaskNotes || null,
        sortOrder: plan.tasks.length + 1,
      };

      await addKitchenTask(plan.id, payload, token);
      setNewTaskTitle("");
      setNewTaskNotes("");
      setShowAddTask(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Group tasks by station
  const tasksByStation = STATIONS.reduce((acc, station) => {
    acc[station.value] = plan.tasks.filter((t) => t.station === station.value);
    return acc;
  }, {} as Record<KitchenStation, KitchenTask[]>);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#737373]">
            <Link href={`/tenant/${tenantSlug}/kitchen`} className="hover:text-[#171717]">
              ← Kitchen Operations
            </Link>
            <span>/</span>
            <span className="font-mono text-[#171717]">{plan.planNumber}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#171717]">
              {plan.title}
            </h1>
            <KitchenPlanStatusBadge status={plan.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Quick Transitions */}
          <div className="flex rounded border border-[#E5E5E5] bg-white p-0.5 text-xs">
            {(["draft", "scheduled", "in_progress", "completed"] as KitchenPlanStatus[]).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => handlePlanStatusChange(st)}
                  disabled={isUpdatingPlanStatus || plan.status === st}
                  className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                    plan.status === st
                      ? "bg-[#171717] text-white"
                      : "text-[#737373] hover:text-[#171717]"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ),
            )}
          </div>

          <button
            onClick={() => setShowConsumptionModal(true)}
            className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Deduct Stock
          </button>

          <button
            onClick={() => setShowChitModal(true)}
            className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Chit Sheet
          </button>
        </div>
      </div>

      {/* Plan Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-mono uppercase text-[#737373]">Service Date & Slot</p>
          <p className="text-base font-bold font-mono text-[#171717] mt-1">
            {plan.planDate.split("T")[0]}
          </p>
          <p className="text-xs text-[#737373] capitalize mt-0.5">
            {plan.serviceSlot || "General Shift"}
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-mono uppercase text-[#737373]">Target Servings</p>
          <p className="text-base font-bold font-mono text-[#171717] mt-1">
            {plan.estimatedServings} Portions
          </p>
          <p className="text-xs text-[#737373] mt-0.5">Commercial demand volume</p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-mono uppercase text-[#737373]">Commercial Source</p>
          <div className="mt-1">
            <KitchenSourceBadge source={plan.source} />
          </div>
          <p className="text-xs text-[#171717] font-medium mt-1 truncate">
            {plan.booking
              ? `${plan.booking.bookingNumber} · ${plan.booking.customer?.name || "Client"}`
              : plan.dailyMealOrder
              ? `${plan.dailyMealOrder.orderNumber}`
              : "Standalone Production"}
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono uppercase text-[#737373]">Tasks Progress</p>
            <span className="text-xs font-mono font-semibold text-[#171717]">
              {progress.percent}%
            </span>
          </div>
          <p className="text-base font-bold font-mono text-[#171717] mt-1">
            {progress.completed} / {progress.total}
          </p>
          <div className="h-1.5 w-full bg-[#F5F5F4] rounded-full overflow-hidden border border-[#E5E5E5] mt-1.5">
            <div
              className="bg-[#171717] h-full rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Critical Dietary & Venue Alert */}
      {(plan.dietaryNotes || plan.venueNotes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plan.dietaryNotes && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
              <span className="font-bold uppercase tracking-wider block text-[11px] mb-1">
                ⚠ Critical Dietary & Allergen Instructions
              </span>
              {plan.dietaryNotes}
            </div>
          )}
          {plan.venueNotes && (
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 text-xs text-[#262626]">
              <span className="font-bold uppercase tracking-wider block text-[11px] text-[#737373] mb-1">
                Venue & Delivery Coordination
              </span>
              {plan.venueNotes}
            </div>
          )}
        </div>
      )}

      {/* Task Management Header */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
        <div>
          <h2 className="text-base font-bold text-[#171717]">Kitchen Task Stations</h2>
          <p className="text-xs text-[#737373]">
            Track preparation steps, station lead sign-offs, and readiness
          </p>
        </div>

        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
        >
          {showAddTask ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {/* Inline Add Task Drawer */}
      {showAddTask && (
        <form
          onSubmit={handleCreateTask}
          className="rounded-lg border border-[#171717]/20 bg-[#FAFAFA] p-4 space-y-3"
        >
          <h3 className="text-xs font-bold uppercase text-[#171717]">Add New Kitchen Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[#262626]">Task Title *</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Sear 80 salmon fillets with herb crust"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Station *</label>
              <select
                value={newTaskStation}
                onChange={(e) => setNewTaskStation(e.target.value as KitchenStation)}
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                {STATIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Target Qty</label>
              <input
                type="number"
                value={newTaskQty}
                onChange={(e) => setNewTaskQty(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="50"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-mono text-[#171717]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Unit</label>
              <input
                type="text"
                value={newTaskUnit}
                onChange={(e) => setNewTaskUnit(e.target.value)}
                placeholder="portions / trays"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Due Time</label>
              <input
                type="text"
                value={newTaskDueTime}
                onChange={(e) => setNewTaskDueTime(e.target.value)}
                placeholder="11:30"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-mono text-[#171717]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Assigned Staff</label>
              <input
                type="text"
                value={newTaskAssignedTo}
                onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                placeholder="e.g. Sous Chef Marco"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Dietary Alert</label>
              <input
                type="text"
                value={newTaskDietary}
                onChange={(e) => setNewTaskDietary(e.target.value)}
                placeholder="e.g. Nut-free only"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#262626]">Preparation Notes</label>
              <input
                type="text"
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                placeholder="e.g. Keep chilled until plating"
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="rounded border border-[#E5E5E5] px-3 py-1 text-xs font-medium text-[#262626]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAddingTask}
              className="rounded bg-[#171717] px-3.5 py-1 text-xs font-medium text-white hover:bg-[#262626]"
            >
              {isAddingTask ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      )}

      {/* Task Stations List */}
      <div className="space-y-6">
        {STATIONS.map((station) => {
          const tasks = tasksByStation[station.value] || [];
          if (tasks.length === 0) return null;

          return (
            <div
              key={station.value}
              className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden shadow-sm"
            >
              <div className="bg-[#FAFAFA] border-b border-[#E5E5E5] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KitchenStationBadge station={station.value} />
                  <span className="text-xs text-[#737373]">({tasks.length} tasks)</span>
                </div>
                <span className="text-[11px] font-mono text-[#737373]">
                  {tasks.filter((t) => t.status === "completed").length} / {tasks.length} Ready
                </span>
              </div>

              <div className="divide-y divide-[#F0F0F0]">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          const next =
                            task.status === "pending"
                              ? "in_progress"
                              : task.status === "in_progress"
                              ? "completed"
                              : "pending";
                          handleTaskStatusChange(task.id, next);
                        }}
                        className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
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

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#737373]">
                            {task.taskNumber}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              task.status === "completed"
                                ? "line-through text-[#737373]"
                                : "text-[#171717]"
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#737373]">
                          {task.targetQuantity && (
                            <span className="font-mono font-medium text-[#171717]">
                              {task.targetQuantity} {task.unit || "portions"}
                            </span>
                          )}
                          {task.dueTime && (
                            <span>Due: <strong className="font-mono text-[#171717]">{task.dueTime}</strong></span>
                          )}
                          {task.assignedTo && (
                            <span>Staff: <strong className="text-[#171717]">{task.assignedTo}</strong></span>
                          )}
                          {task.completedBy && (
                            <span className="text-emerald-700 font-medium">
                              Signed: {task.completedBy}
                            </span>
                          )}
                        </div>

                        {task.dietaryAlerts && (
                          <p className="mt-1 text-[11px] text-rose-700 font-medium">
                            ⚠ Alert: {task.dietaryAlerts}
                          </p>
                        )}
                        {task.notes && (
                          <p className="mt-0.5 text-[11px] text-[#737373] italic">
                            Note: {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Task Actions & Status Selector */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleTaskStatusChange(task.id, e.target.value as KitchenTaskStatus)
                        }
                        className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717] focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed / Ready</option>
                        <option value="blocked">Blocked</option>
                      </select>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-[#737373] hover:text-rose-600 p-1 text-xs"
                        title="Delete task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chit Print Modal */}
      <KitchenChitModal
        isOpen={showChitModal}
        onClose={() => setShowChitModal(false)}
        plan={plan}
      />

      {/* Deduct Stock Consumption Modal */}
      <RecordConsumptionModal
        isOpen={showConsumptionModal}
        onClose={() => setShowConsumptionModal(false)}
        planId={plan.id}
        planNumber={plan.planNumber}
        token={token}
        onSuccess={onRefresh}
      />
    </div>
  );
}
