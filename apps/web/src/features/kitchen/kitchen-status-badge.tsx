import type {
  KitchenPlanSource,
  KitchenPlanStatus,
  KitchenStation,
  KitchenTaskStatus,
} from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

const PLAN_STATUS_MAP: Record<KitchenPlanStatus, { label: string; variant: StatusVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Prep", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
};

export function KitchenPlanStatusBadge({ status }: { status: KitchenPlanStatus }) {
  const config = PLAN_STATUS_MAP[status] || { label: status, variant: "neutral" };
  return (
    <StatusBadge variant={config.variant}>
      {config.label}
    </StatusBadge>
  );
}

const TASK_STATUS_MAP: Record<KitchenTaskStatus, { label: string; variant: StatusVariant }> = {
  pending: { label: "Pending", variant: "neutral" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Ready / Done", variant: "success" },
  blocked: { label: "Blocked", variant: "error" },
};

export function KitchenTaskStatusBadge({ status }: { status: KitchenTaskStatus }) {
  const config = TASK_STATUS_MAP[status] || { label: status, variant: "neutral" };
  return (
    <StatusBadge variant={config.variant}>
      {config.label}
    </StatusBadge>
  );
}

const STATION_LABELS: Record<KitchenStation, string> = {
  prep: "Mise-en-place / Prep",
  hot_kitchen: "Hot Kitchen",
  cold_kitchen: "Cold Kitchen / Salad",
  bakery_pastry: "Bakery & Pastry",
  assembly_packing: "Assembly & Packing",
  beverages: "Beverages / Bar",
  other: "General Station",
};

export function KitchenStationBadge({ station }: { station: KitchenStation }) {
  const label = STATION_LABELS[station] || station;
  return (
    <span className="inline-flex items-center rounded bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#262626] border border-[#E5E5E5]">
      {label}
    </span>
  );
}

const SOURCE_LABELS: Record<KitchenPlanSource, { label: string; icon: string }> = {
  booking: { label: "Confirmed Booking", icon: "BK" },
  daily_meal_order: { label: "Daily Meal Order", icon: "MO" },
  manual: { label: "Standalone Plan", icon: "MN" },
};

export function KitchenSourceBadge({ source }: { source: KitchenPlanSource }) {
  const config = SOURCE_LABELS[source] || { label: source, icon: "PL" };
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-medium text-[#737373] border border-[#E5E5E5]">
      <span className="font-mono text-[9px] uppercase font-bold text-[#171717]">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
