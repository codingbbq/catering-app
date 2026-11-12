"use client";

import type { Recipe } from "@catering/shared-types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface RecipeTableProps {
  recipes: Recipe[];
  isLoading: boolean;
  onEdit: (recipe: Recipe) => void;
  onArchiveToggle: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

export function RecipeTable({
  recipes,
  isLoading,
  onEdit,
  onArchiveToggle,
  onDelete,
}: RecipeTableProps) {
  const { formatCurrency } = useTenantCurrency();
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-2 text-xs text-[#737373]">
          <span className="loading loading-spinner loading-sm" />
          <span>Loading recipes...</span>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="No recipes found"
        description="Create your first ingredient-based recipe to accurately track food costs and calculate margins."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
            <th className="py-3 px-4 font-semibold text-[#171717]">Recipe Name</th>
            <th className="py-3 px-3 font-medium">Category</th>
            <th className="py-3 px-3 font-medium">Yield</th>
            <th className="py-3 px-3 font-medium text-center">Ingredients</th>
            <th className="py-3 px-3 font-medium text-right">Cost / Unit</th>
            <th className="py-3 px-3 font-medium text-right">Suggested Price</th>
            <th className="py-3 px-3 font-medium text-right">Target Margin</th>
            <th className="py-3 px-3 font-medium text-center">Status</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {recipes.map((recipe) => {
            const isArchived = recipe.isArchived;
            return (
              <tr
                key={recipe.id}
                className="hover:bg-[#FAFAFA] transition-colors"
              >
                <td className="py-3 px-4">
                  <div>
                    <span className="font-semibold text-[#171717]">
                      {recipe.name}
                    </span>
                    {recipe.description && (
                      <p className="text-[11px] text-[#737373] line-clamp-1 max-w-xs">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-block rounded bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-medium text-[#262626] capitalize">
                    {recipe.category || "general"}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-[#262626]">
                  {recipe.yield} {recipe.yieldUnit}
                </td>
                <td className="py-3 px-3 text-center font-mono text-[#737373]">
                  {recipe.items.length}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-[#171717]">
                  {formatCurrency(recipe.costPerYieldUnit)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-emerald-800">
                  {recipe.suggestedSellingPrice
                    ? formatCurrency(recipe.suggestedSellingPrice / (recipe.yield || 1))
                    : "—"}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#262626]">
                  {recipe.targetMargin !== null ? `${recipe.targetMargin}%` : "30%"}
                </td>
                <td className="py-3 px-3 text-center">
                  <StatusBadge
                    variant={isArchived ? "neutral" : "success"}
                    showDot={!isArchived}
                  >
                    {isArchived ? "Archived" : "Active"}
                  </StatusBadge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(recipe)}
                      className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchiveToggle(recipe)}
                      className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
                      title={isArchived ? "Reactivate recipe" : "Archive recipe"}
                    >
                      {isArchived ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(recipe)}
                      className="rounded p-1 text-[#737373] hover:bg-rose-50 hover:text-rose-600"
                      title="Delete recipe"
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
