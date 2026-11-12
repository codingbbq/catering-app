"use client";

import type { CostSheet } from "@catering/shared-types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface CostSheetTableProps {
  costSheets: CostSheet[];
  isLoading: boolean;
  onEdit: (sheet: CostSheet) => void;
  onDelete: (sheet: CostSheet) => void;
}

export function CostSheetTable({
  costSheets,
  isLoading,
  onEdit,
  onDelete,
}: CostSheetTableProps) {
  const { formatCurrency } = useTenantCurrency();
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-2 text-xs text-[#737373]">
          <span className="loading loading-spinner loading-sm" />
          <span>Loading cost sheets...</span>
        </div>
      </div>
    );
  }

  if (costSheets.length === 0) {
    return (
      <EmptyState
        title="No cost sheets found"
        description="Create your first cost sheet to model raw ingredients, kitchen labor, transport, and target margins."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
            <th className="py-3 px-4 font-semibold text-[#171717]">Cost Sheet Name</th>
            <th className="py-3 px-3 font-medium">Linked Menu / Recipe</th>
            <th className="py-3 px-3 font-medium text-center">Servings</th>
            <th className="py-3 px-3 font-medium text-right">Total Cost</th>
            <th className="py-3 px-3 font-medium text-right">Cost / Guest</th>
            <th className="py-3 px-3 font-medium text-right">Quoted Price</th>
            <th className="py-3 px-3 font-medium text-right">Gross Margin</th>
            <th className="py-3 px-3 font-medium text-center">Status</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {costSheets.map((sheet) => {
            const isGoodMargin = sheet.actualMarginPercent >= sheet.targetMarginPercent;
            return (
              <tr
                key={sheet.id}
                className="hover:bg-[#FAFAFA] transition-colors"
              >
                <td className="py-3 px-4">
                  <div>
                    <span className="font-semibold text-[#171717]">
                      {sheet.name}
                    </span>
                    {sheet.description && (
                      <p className="text-[11px] text-[#737373] line-clamp-1 max-w-xs">
                        {sheet.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-[#262626]">
                  {sheet.menuName ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[#F5F5F4] px-1.5 py-0.5 text-[11px]">
                      Menu: {sheet.menuName}
                    </span>
                  ) : sheet.recipeName ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[#F5F5F4] px-1.5 py-0.5 text-[11px]">
                      Recipe: {sheet.recipeName}
                    </span>
                  ) : (
                    <span className="text-[#A3A3A3]">Standalone</span>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-mono text-[#262626]">
                  {sheet.servings}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-[#171717]">
                  {formatCurrency(sheet.totalCost)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#737373]">
                  {formatCurrency(sheet.costPerServing)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-[#171717]">
                  {formatCurrency(sheet.quotedPrice)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium">
                  <span
                    className={
                      isGoodMargin
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }
                  >
                    {sheet.actualMarginPercent.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <StatusBadge
                    variant={
                      sheet.status === "active"
                        ? "success"
                        : sheet.status === "draft"
                        ? "info"
                        : "neutral"
                    }
                    showDot={sheet.status === "active"}
                  >
                    <span className="capitalize">{sheet.status}</span>
                  </StatusBadge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(sheet)}
                      className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
                    >
                      View / Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(sheet)}
                      className="rounded p-1 text-[#737373] hover:bg-rose-50 hover:text-rose-600"
                      title="Delete cost sheet"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
