"use client";

import { formatServiceSlot, MealPlanStatusBadge } from "./meal-order-status-badge";
import type { DailyMealPlanListItem } from "@catering/shared-types";
import { useTenant } from "@/features/tenancy/tenant-provider";
import { EmptyState } from "@/components/ui/empty-state";

interface MealPlansTableProps {
  plans: DailyMealPlanListItem[];
  tenantSlug: string;
  onEditPlan: (plan: DailyMealPlanListItem) => void;
  onGenerateOrders: (plan: DailyMealPlanListItem) => void;
}

export function MealPlansTable({
  plans,
  tenantSlug: _tenantSlug,
  onEditPlan,
  onGenerateOrders,
}: MealPlansTableProps) {
  const { formatCurrency } = useTenant();

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No standing meal plans"
        description="Create recurring customer meal plans for ongoing corporate cafeterias, schools, or subscription meal services."
      />
    );
  }

  const DAY_LABELS: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wider text-[#737373]">
          <tr>
            <th className="px-4 py-3">Plan # / Name</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Slot</th>
            <th className="px-4 py-3">Schedule Days</th>
            <th className="px-4 py-3 text-right">Default Volume</th>
            <th className="px-4 py-3 text-right">Default Rate</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {plans.map((plan) => (
            <tr key={plan.id} className="hover:bg-[#FAFAFA] transition-colors">
              <td className="px-4 py-3 font-medium text-[#171717]">
                <div className="font-mono text-xs text-[#737373]">{plan.planNumber}</div>
                <div>{plan.name}</div>
              </td>
              <td className="px-4 py-3 text-[#171717]">
                <div className="font-medium">{plan.customerName}</div>
                {plan.deliveryAddress && (
                  <div className="text-xs text-[#737373] truncate max-w-xs">
                    {plan.deliveryAddress}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded bg-[#F5F5F4] px-2 py-0.5 text-xs text-[#737373] font-medium border border-[#E5E5E5]">
                  {formatServiceSlot(plan.serviceSlot)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {plan.daysOfWeek.map((day) => (
                    <span
                      key={day}
                      className="inline-flex rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-700 border border-stone-200"
                    >
                      {DAY_LABELS[day] || day}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                {plan.defaultQuantity} meals
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium text-[#171717]">
                {formatCurrency(plan.defaultUnitPrice)}
              </td>
              <td className="px-4 py-3">
                <MealPlanStatusBadge status={plan.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onGenerateOrders(plan)}
                    disabled={plan.status !== "active"}
                    className="rounded bg-[#171717] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
                  >
                    Generate Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditPlan(plan)}
                    className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
