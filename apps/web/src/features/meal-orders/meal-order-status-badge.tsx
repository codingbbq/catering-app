"use client";

import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import type { DailyMealOrderStatus, DailyMealPlanStatus, DailyMealSlot } from "@catering/shared-types";

interface MealOrderStatusBadgeProps {
  status: DailyMealOrderStatus;
  className?: string;
}

const ORDER_STATUS_CONFIG: Record<
  DailyMealOrderStatus,
  { label: string; variant: StatusVariant }
> = {
  draft: { label: "Draft", variant: "neutral" },
  confirmed: { label: "Confirmed", variant: "info" },
  in_preparation: { label: "In Prep", variant: "warning" },
  dispatched: { label: "Dispatched", variant: "info" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
};

export function MealOrderStatusBadge({ status, className }: MealOrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status,
    variant: "neutral" as StatusVariant,
  };

  return (
    <StatusBadge variant={config.variant} className={className || ""}>
      {config.label}
    </StatusBadge>
  );
}

interface MealPlanStatusBadgeProps {
  status: DailyMealPlanStatus;
  className?: string;
}

const PLAN_STATUS_CONFIG: Record<
  DailyMealPlanStatus,
  { label: string; variant: StatusVariant }
> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "error" },
};

export function MealPlanStatusBadge({ status, className }: MealPlanStatusBadgeProps) {
  const config = PLAN_STATUS_CONFIG[status] || {
    label: status,
    variant: "neutral" as StatusVariant,
  };

  return (
    <StatusBadge variant={config.variant} className={className || ""}>
      {config.label}
    </StatusBadge>
  );
}

export function formatServiceSlot(slot: DailyMealSlot): string {
  switch (slot) {
    case "breakfast":
      return "Breakfast";
    case "morning_tea":
      return "Morning Tea";
    case "lunch":
      return "Lunch";
    case "afternoon_tea":
      return "Afternoon Tea";
    case "dinner":
      return "Dinner";
    case "snack":
      return "Snack";
    default:
      return slot;
  }
}
