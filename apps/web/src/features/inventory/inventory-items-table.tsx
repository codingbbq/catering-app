"use client";

import React from "react";
import type { InventoryItem } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { EmptyState } from "@/components/ui/empty-state";

interface InventoryItemsTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onEdit: (item: InventoryItem) => void;
  onRecordMovement: (item: InventoryItem) => void;
  onArchive: (item: InventoryItem) => void;
  onRestore: (item: InventoryItem) => void;
  onOpenCreate: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  meat_poultry: "Meat & Poultry",
  dairy: "Dairy",
  dry_goods: "Dry Goods",
  beverages: "Beverages",
  packaging: "Packaging",
  cleaning: "Cleaning",
  other: "Other",
};

export function InventoryItemsTable({
  items,
  isLoading,
  onEdit,
  onRecordMovement,
  onArchive,
  onRestore,
  onOpenCreate,
}: InventoryItemsTableProps) {
  const { formatCurrency } = useTenantCurrency();

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-8">
        <p className="text-xs text-[#737373]">Loading inventory catalog...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No inventory items found"
        description="Get started by registering your raw ingredients, dairy, poultry, and packaging items."
        action={
          <button
            type="button"
            onClick={onOpenCreate}
            className="rounded-md bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#262626]"
          >
            Add Inventory Item
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
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Item Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">On Hand</th>
              <th className="px-4 py-3 text-right">Par Level</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Total Valuation</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0] text-[#171717]">
            {items.map((item) => {
              const isLow = item.status === "low_stock";
              const isOut = item.status === "out_of_stock";

              return (
                <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                  {/* SKU */}
                  <td className="px-4 py-3 font-mono font-semibold text-[#171717]">
                    {item.sku}
                  </td>

                  {/* Name & Storage */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#171717]">{item.name}</p>
                    {item.storageLocation && (
                      <p className="mt-0.5 text-[11px] text-[#737373]">
                        📍 {item.storageLocation}
                      </p>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md border border-[#E5E5E5] bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-medium text-[#171717]">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </td>

                  {/* On Hand */}
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <span className={isOut ? "text-red-700" : isLow ? "text-amber-800" : "text-[#171717]"}>
                      {item.currentStock.toFixed(2)}
                    </span>{" "}
                    <span className="text-[11px] font-normal text-[#737373]">{item.unit}</span>
                  </td>

                  {/* Par Level */}
                  <td className="px-4 py-3 text-right font-mono text-[#737373]">
                    {item.minStockLevel.toFixed(2)} {item.unit}
                  </td>

                  {/* Unit Cost */}
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(item.unitCost)}
                  </td>

                  {/* Total Valuation */}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                    {formatCurrency(item.valuation)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 text-center">
                    {item.isArchived ? (
                      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                        Archived
                      </span>
                    ) : isOut ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        In Stock
                      </span>
                    )}
                  </td>

                  {/* Quick Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!item.isArchived ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onRecordMovement(item)}
                            title="Record stock intake or usage"
                            className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#F5F5F4]"
                          >
                            Move
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit specifications"
                            className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#F5F5F4]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchive(item)}
                            title="Archive item"
                            className="rounded border border-[#E5E5E5] bg-white px-1.5 py-1 text-[11px] text-[#737373] hover:text-red-700"
                          >
                            Archive
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestore(item)}
                          className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Restore
                        </button>
                      )}
                    </div>
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
