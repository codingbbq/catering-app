"use client";

import React from "react";
import type { InventoryItem, InventorySummary } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface StockSummaryViewProps {
  summary: InventorySummary | null;
  items: InventoryItem[];
  isLoading: boolean;
  onRecordMovement: (item: InventoryItem) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  produce: "Fresh Produce",
  meat_poultry: "Meat & Poultry",
  dairy: "Dairy & Eggs",
  dry_goods: "Dry Goods & Grains",
  beverages: "Beverages & Tea",
  packaging: "Packaging & Disposables",
  cleaning: "Cleaning & Sanitation",
  other: "Other Supplies",
};

export function StockSummaryView({
  summary,
  items,
  isLoading,
  onRecordMovement,
}: StockSummaryViewProps) {
  const { formatCurrency, currencyCode } = useTenantCurrency();

  if (isLoading || !summary) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-8">
        <p className="text-xs text-[#737373]">Calculating inventory valuation and category metrics...</p>
      </div>
    );
  }

  const totalValuation = summary.totalValuation || 1; // avoid division by zero
  const alerts = items.filter((i) => !i.isArchived && (i.status === "low_stock" || i.status === "out_of_stock"));

  return (
    <div className="space-y-6">
      {/* Category Valuation Breakdown */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="border-b border-[#F0F0F0] pb-3">
          <h3 className="text-sm font-semibold text-[#171717]">
            Stock Valuation by Category ({currencyCode})
          </h3>
          <p className="text-xs text-[#737373]">
            Monetary capital allocation across raw material and packaging categories
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              <tr>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5 text-right">Active SKUs</th>
                <th className="px-4 py-2.5 text-right">Category Valuation</th>
                <th className="px-4 py-2.5 text-right">% of Total</th>
                <th className="px-4 py-2.5">Distribution Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0] text-[#171717]">
              {summary.categoryBreakdown.map((cat) => {
                const pct = Math.round((cat.totalValuation / totalValuation) * 100);

                return (
                  <tr key={cat.category} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-medium text-[#171717]">
                      {CATEGORY_NAMES[cat.category] || cat.category}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#737373]">
                      {cat.itemCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                      {formatCurrency(cat.totalValuation)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#737373]">
                      {pct}%
                    </td>
                    <td className="px-4 py-3 w-48">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F4]">
                        <div
                          className="h-full bg-[#171717]"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Stock Par Alert Queue */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="border-b border-[#F0F0F0] pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">
                Procurement &amp; Replenishment Alert Queue
              </h3>
              <p className="text-xs text-[#737373]">
                Items requiring purchase orders or stock intake to restore par levels
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
              {alerts.length} Action Needed
            </span>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#737373]">
              All inventory items are currently above configured par thresholds.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#F0F0F0]">
            {alerts.map((item) => {
              const shortfall = Math.max(0, item.minStockLevel - item.currentStock);
              const estRestockCost = shortfall * item.unitCost;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#171717]">
                        [{item.sku}]
                      </span>
                      <span className="text-xs font-semibold text-[#171717]">
                        {item.name}
                      </span>
                      {item.status === "out_of_stock" ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          LOW STOCK
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      On hand:{" "}
                      <span className="font-semibold text-[#171717]">
                        {item.currentStock.toFixed(2)} {item.unit}
                      </span>{" "}
                      | Par Level: {item.minStockLevel.toFixed(2)} {item.unit}{" "}
                      {shortfall > 0 && (
                        <span>
                          (Deficit:{" "}
                          <span className="font-semibold text-red-700">
                            {shortfall.toFixed(2)} {item.unit}
                          </span>
                          )
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[11px] text-[#737373]">Est. Restock Cost</p>
                      <p className="font-mono text-xs font-semibold text-[#171717]">
                        {formatCurrency(estRestockCost)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRecordMovement(item)}
                      className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
                    >
                      Receive Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
