"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/features/tenancy/tenant-provider";
import {
  getDailyMealOrderStats,
  listDailyMealOrders,
  listDailyMealPlans,
  updateDailyMealOrderStatus,
} from "@/lib/daily-meal-orders-api";
import { MealOperationsBoard } from "@/features/meal-orders/meal-operations-board";
import { MealOrderTable } from "@/features/meal-orders/meal-order-table";
import { MealPlansTable } from "@/features/meal-orders/meal-plans-table";
import { MealPlanModal } from "@/features/meal-orders/meal-plan-modal";
import { GenerateOrdersModal } from "@/features/meal-orders/generate-orders-modal";
import type {
  DailyMealOrderListItem,
  DailyMealOrderStatus,
  DailyMealPlanListItem,
  DailyMealSlot,
} from "@catering/shared-types";

type ViewMode = "board" | "table" | "plans";

export default function DailyMealOrdersPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken } = useAuth();
  const { formatCurrency } = useTenant();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] || "",
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  // Plan modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<DailyMealPlanListItem | null>(null);
  const [planForGeneration, setPlanForGeneration] = useState<DailyMealPlanListItem | null>(null);

  // Quick date shifts
  function shiftDate(days: number) {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0] || "");
  }

  function setToday() {
    setSelectedDate(new Date().toISOString().split("T")[0] || "");
  }

  // Fetch Orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["daily-meal-orders", tenantSlug, selectedDate, selectedSlot, selectedStatus, search],
    queryFn: () =>
      listDailyMealOrders(accessToken!, {
        serviceDate: viewMode === "plans" ? undefined : selectedDate,
        serviceSlot: selectedSlot !== "all" ? (selectedSlot as DailyMealSlot) : undefined,
        status: selectedStatus !== "all" ? (selectedStatus as any) : undefined,
        search: search || undefined,
        limit: 100,
      }),
    enabled: !!accessToken,
  });

  // Fetch Stats for Selected Date
  const { data: statsData } = useQuery({
    queryKey: ["daily-meal-order-stats", tenantSlug, selectedDate],
    queryFn: () => getDailyMealOrderStats(accessToken!, selectedDate),
    enabled: !!accessToken,
  });

  // Fetch Plans
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["daily-meal-plans", tenantSlug],
    queryFn: () => listDailyMealPlans(accessToken!),
    enabled: !!accessToken,
  });

  // Handle Quick Status Change from Board
  async function handleStatusChange(orderId: string, newStatus: DailyMealOrderStatus) {
    if (!accessToken) return;
    try {
      await updateDailyMealOrderStatus(orderId, { status: newStatus }, accessToken);
      queryClient.invalidateQueries({ queryKey: ["daily-meal-orders"] });
      queryClient.invalidateQueries({ queryKey: ["daily-meal-order-stats"] });
    } catch (err) {
      console.error(err);
    }
  }

  const orders: DailyMealOrderListItem[] = ordersData?.items || [];
  const plans: DailyMealPlanListItem[] = plansData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Daily Meal Orders"
        description="Manage recurring institutional meal services, daily corporate deliveries, standing plans, and kitchen slot operations."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlanForEdit(null);
                setIsPlanModalOpen(true);
              }}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              + New Standing Plan
            </button>
            <Link
              href={`/tenant/${tenantSlug}/meal-orders/new`}
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors flex items-center gap-1.5"
            >
              <span>+</span> Create Meal Order
            </Link>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-[#737373]">Scheduled Orders</span>
            <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
              {statsData?.totalOrders ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-[#A3A3A3]">Selected date volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-[#737373]">Total Meals / Portions</span>
            <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
              {statsData?.totalQuantity ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-[#A3A3A3]">Prepared for delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-[#737373]">Service Value</span>
            <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
              {formatCurrency(statsData?.totalRevenue ?? 0, statsData?.currency)}
            </div>
            <p className="mt-1 text-[11px] text-[#A3A3A3]">Daily projected billing</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-[#737373]">Standing Plans</span>
            <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
              {plans.filter((p) => p.status === "active").length}
            </div>
            <p className="mt-1 text-[11px] text-[#A3A3A3]">Active customer subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & View Controller Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Tabs */}
          <div className="flex items-center rounded-md bg-[#F5F5F4] p-1 border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-white text-[#171717] shadow-2xs font-semibold"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Operations Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white text-[#171717] shadow-2xs font-semibold"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Orders Register
            </button>
            <button
              type="button"
              onClick={() => setViewMode("plans")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "plans"
                  ? "bg-white text-[#171717] shadow-2xs font-semibold"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Standing Plans ({plans.length})
            </button>
          </div>

          {/* Operational Date Bar (visible on board & table) */}
          {viewMode !== "plans" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-medium text-[#737373] hover:bg-[#FAFAFA]"
                title="Previous Day"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={setToday}
                className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
              >
                Today
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded border border-[#E5E5E5] px-2.5 py-1 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-medium text-[#737373] hover:bg-[#FAFAFA]"
                title="Next Day"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Filters Row */}
        {viewMode !== "plans" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F0F0F0]">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by order number, customer, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              >
                <option value="all">All Service Slots</option>
                <option value="breakfast">Breakfast</option>
                <option value="morning_tea">Morning Tea</option>
                <option value="lunch">Lunch</option>
                <option value="afternoon_tea">Afternoon Tea</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_preparation">In Prep</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === "board" && (
        <div>
          {isLoadingOrders ? (
            <div className="flex h-48 items-center justify-center text-xs text-[#737373]">
              Loading daily kitchen board...
            </div>
          ) : (
            <MealOperationsBoard
              orders={orders}
              tenantSlug={tenantSlug}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      )}

      {viewMode === "table" && (
        <div>
          {isLoadingOrders ? (
            <div className="flex h-48 items-center justify-center text-xs text-[#737373]">
              Loading orders register...
            </div>
          ) : (
            <MealOrderTable orders={orders} tenantSlug={tenantSlug} />
          )}
        </div>
      )}

      {viewMode === "plans" && (
        <div>
          {isLoadingPlans ? (
            <div className="flex h-48 items-center justify-center text-xs text-[#737373]">
              Loading standing plans...
            </div>
          ) : (
            <MealPlansTable
              plans={plans}
              tenantSlug={tenantSlug}
              onEditPlan={(plan) => {
                setSelectedPlanForEdit(plan);
                setIsPlanModalOpen(true);
              }}
              onGenerateOrders={(plan) => {
                setPlanForGeneration(plan);
              }}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <MealPlanModal
        plan={selectedPlanForEdit}
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedPlanForEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["daily-meal-plans"] });
        }}
      />

      {planForGeneration && (
        <GenerateOrdersModal
          plan={planForGeneration}
          isOpen={!!planForGeneration}
          onClose={() => setPlanForGeneration(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["daily-meal-orders"] });
            queryClient.invalidateQueries({ queryKey: ["daily-meal-order-stats"] });
            setViewMode("board");
          }}
        />
      )}
    </div>
  );
}
