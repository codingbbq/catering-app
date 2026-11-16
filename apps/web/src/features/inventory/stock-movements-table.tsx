"use client";

import React from "react";
import type { StockMovement } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { EmptyState } from "@/components/ui/empty-state";

interface StockMovementsTableProps {
  movements: StockMovement[];
  isLoading: boolean;
  onOpenRecord: () => void;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; isPositive: boolean }
> = {
  purchase_received: {
    label: "Purchase Received",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    isPositive: true,
  },
  kitchen_consumption: {
    label: "Kitchen Usage",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    isPositive: false,
  },
  waste_spoilage: {
    label: "Waste / Spoilage",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    isPositive: false,
  },
  adjustment_in: {
    label: "Adjustment In",
    badgeClass: "bg-stone-50 text-stone-800 border-stone-200",
    isPositive: true,
  },
  adjustment_out: {
    label: "Adjustment Out",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    isPositive: false,
  },
  return_to_supplier: {
    label: "Vendor Return",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    isPositive: false,
  },
  transfer: {
    label: "Transfer",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    isPositive: false,
  },
};

export function StockMovementsTable({
  movements,
  isLoading,
  onOpenRecord,
}: StockMovementsTableProps) {
  const { formatCurrency } = useTenantCurrency();

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-8">
        <p className="text-xs text-[#737373]">Loading stock movement transactions...</p>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <EmptyState
        title="No stock movements recorded"
        description="Every purchase receipt, kitchen consumption, and inventory adjustment creates an auditable ledger record here."
        action={
          <button
            type="button"
            onClick={onOpenRecord}
            className="rounded-md bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#262626]"
          >
            Record Movement
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
            <tr>
              <th className="px-4 py-3">Movement #</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Movement Type</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-center">Stock Level</th>
              <th className="px-4 py-3 text-right">Cost Value</th>
              <th className="px-4 py-3">Reference / Reason</th>
              <th className="px-4 py-3">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0] text-[#171717]">
            {movements.map((mov) => {
              const cfg = TYPE_CONFIG[mov.type] || {
                label: mov.type,
                badgeClass: "bg-stone-50 text-stone-800 border-stone-200",
                isPositive: mov.signedQuantity >= 0,
              };

              const dateStr = new Date(mov.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const isPositive = mov.signedQuantity > 0;
              const isNegative = mov.signedQuantity < 0;

              return (
                <tr key={mov.id} className="hover:bg-[#FAFAFA] transition-colors">
                  {/* Movement # */}
                  <td className="px-4 py-3 font-mono font-semibold text-[#171717]">
                    {mov.movementNumber}
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3 text-[#737373] whitespace-nowrap">
                    {dateStr}
                  </td>

                  {/* Item */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#171717]">
                      {mov.inventoryItem?.name || "—"}
                    </p>
                    <p className="font-mono text-[11px] text-[#737373]">
                      {mov.inventoryItem?.sku}
                    </p>
                  </td>

                  {/* Type Badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${cfg.badgeClass}`}
                    >
                      {cfg.label}
                    </span>
                  </td>

                  {/* Signed Quantity */}
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <span
                      className={
                        isPositive
                          ? "text-emerald-700"
                          : isNegative
                          ? "text-red-700"
                          : "text-[#171717]"
                      }
                    >
                      {isPositive ? `+${mov.signedQuantity.toFixed(2)}` : mov.signedQuantity.toFixed(2)}
                    </span>{" "}
                    <span className="text-[11px] font-normal text-[#737373]">
                      {mov.inventoryItem?.unit || "units"}
                    </span>
                  </td>

                  {/* Stock Before -> After */}
                  <td className="px-4 py-3 text-center font-mono text-[11px] text-[#737373]">
                    <span>{mov.quantityBefore.toFixed(2)}</span>
                    <span className="mx-1 text-[#A3A3A3]">→</span>
                    <span className="font-semibold text-[#171717]">
                      {mov.quantityAfter.toFixed(2)}
                    </span>
                  </td>

                  {/* Total Value */}
                  <td className="px-4 py-3 text-right font-mono font-medium text-[#171717]">
                    {mov.totalCost !== null ? formatCurrency(mov.totalCost) : "—"}
                  </td>

                  {/* Reference & Reason */}
                  <td className="px-4 py-3">
                    {mov.referenceId && (
                      <span className="font-mono text-[11px] font-semibold text-[#171717]">
                        [{mov.referenceId}]{" "}
                      </span>
                    )}
                    <span className="text-[#737373]">{mov.reason || "—"}</span>
                  </td>

                  {/* Recorded By */}
                  <td className="px-4 py-3 text-[11px] text-[#737373]">
                    {mov.recordedBy || "system"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
