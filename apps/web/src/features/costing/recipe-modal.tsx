"use client";

import type {
  CreateRecipeRequest,
  Recipe,
  RecipeItemInput,
  UpdateRecipeRequest,
} from "@catering/shared-types";
import { calculateRecipeMetrics } from "@catering/shared-types";
import { useMemo, useState } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRecipeRequest | UpdateRecipeRequest) => Promise<void>;
  isSaving: boolean;
}

const CATEGORIES = [
  "general",
  "starter",
  "main",
  "side",
  "dessert",
  "bakery",
  "sauce",
  "beverage",
];

const COMMON_UNITS = [
  "kg",
  "g",
  "liter",
  "ml",
  "piece",
  "portion",
  "pack",
  "tbsp",
  "tsp",
  "bunch",
];

export function RecipeModal({
  recipe,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: RecipeModalProps) {
  const { currencySymbol, formatCurrency } = useTenantCurrency();
  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [category, setCategory] = useState(recipe?.category ?? "general");
  const [yieldVal, setYieldVal] = useState<number>(recipe?.yield ?? 4);
  const [yieldUnit, setYieldUnit] = useState(recipe?.yieldUnit ?? "portion");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>(
    recipe?.prepTimeMinutes ? String(recipe.prepTimeMinutes) : "",
  );
  const [cookTimeMinutes, setCookTimeMinutes] = useState<string>(
    recipe?.cookTimeMinutes ? String(recipe.cookTimeMinutes) : "",
  );
  const [targetMargin, setTargetMargin] = useState<number>(
    recipe?.targetMargin ?? 35,
  );
  const [notes, setNotes] = useState(recipe?.notes ?? "");

  const [items, setItems] = useState<RecipeItemInput[]>(
    recipe?.items && recipe.items.length > 0
      ? recipe.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitCost: it.unitCost,
          notes: it.notes,
        }))
      : [
          {
            name: "",
            quantity: 1,
            unit: "kg",
            unitCost: 0,
            notes: "",
          },
        ],
  );

  const metrics = useMemo(() => {
    return calculateRecipeMetrics(
      items.map((it) => ({
        quantity: Number(it.quantity) || 0,
        unitCost: Number(it.unitCost) || 0,
      })),
      yieldVal || 1,
      targetMargin || 30,
    );
  }, [items, yieldVal, targetMargin]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        quantity: 1,
        unit: "kg",
        unitCost: 0,
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof RecipeItemInput,
    val: unknown,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Recipe name is required");
      return;
    }

    const cleanedItems = items
      .filter((it) => it.name.trim().length > 0)
      .map((it, idx) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "kg",
        unitCost: Number(it.unitCost) || 0,
        notes: it.notes?.trim() || null,
        sortOrder: idx,
      }));

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || "general",
      yield: Number(yieldVal) > 0 ? Number(yieldVal) : 1,
      yieldUnit: yieldUnit.trim() || "portion",
      prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : undefined,
      cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : undefined,
      targetMargin: Number(targetMargin) || 30,
      notes: notes.trim() || undefined,
      items: cleanedItems,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              {recipe ? `Edit Recipe: ${recipe.name}` : "Create New Recipe"}
            </h2>
            <p className="text-xs text-[#737373]">
              Define ingredients, component costs, yield, and target profit margin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          {/* General Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#171717]">
                Recipe Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pan-Seared Salmon with Dill Butter"
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Yield (Batch Output) *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={yieldVal}
                  onChange={(e) => setYieldVal(parseFloat(e.target.value) || 1)}
                  className="block w-24 rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
                <input
                  type="text"
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  placeholder="portions"
                  className="block flex-1 rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Prep & Cook Time (mins)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value)}
                  placeholder="Prep"
                  className="block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(e.target.value)}
                  placeholder="Cook"
                  className="block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Target Gross Margin (%)
              </label>
              <input
                type="number"
                min="0"
                max="99"
                step="0.5"
                value={targetMargin}
                onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717]">
              Description & Preparation Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of flavour profile, finishing instructions, or allergens..."
              className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          {/* Component Ingredients Table */}
          <div className="border border-[#E5E5E5] rounded-lg overflow-hidden bg-white">
            <div className="flex items-center justify-between bg-[#FAFAFA] px-4 py-2.5 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
                  Recipe Ingredients & Costs
                </span>
                <span className="text-xs text-[#737373]">
                  ({items.length} items)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 rounded bg-[#171717] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#262626]"
              >
                + Add Ingredient
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F5F5F4] text-[#737373]">
                    <th className="py-2 px-3 font-medium">Ingredient Name</th>
                    <th className="py-2 px-3 font-medium w-28">Quantity</th>
                    <th className="py-2 px-3 font-medium w-28">Unit</th>
                    <th className="py-2 px-3 font-medium w-32">Unit Cost ({currencySymbol})</th>
                    <th className="py-2 px-3 font-medium w-28 text-right">Line Cost</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {items.map((item, idx) => {
                    const lineCost =
                      Math.round(
                        ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0) +
                          Number.EPSILON) *
                          100,
                      ) / 100;
                    return (
                      <tr key={idx} className="hover:bg-[#FAFAFA]">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Fresh Atlantic Salmon"
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(idx, "name", e.target.value)
                            }
                            className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "quantity",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              handleItemChange(idx, "unit", e.target.value)
                            }
                            className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-2 flex items-center text-xs text-[#737373]">
                              {currencySymbol}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitCost}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "unitCost",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-full rounded border border-[#E5E5E5] pl-5 pr-2 py-1 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-[#171717]">
                          {formatCurrency(lineCost)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="rounded p-1 text-[#737373] hover:bg-rose-50 hover:text-rose-600"
                              title="Remove item"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Recipe Cost Summary & KPI Bar */}
          <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-[#E5E5E5]">
              <div className="px-2">
                <span className="block text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                  Total Batch Cost
                </span>
                <span className="text-lg font-bold font-mono text-[#171717]">
                  {formatCurrency(metrics.totalCost)}
                </span>
              </div>
              <div className="px-2">
                <span className="block text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                  Cost per {yieldUnit}
                </span>
                <span className="text-lg font-bold font-mono text-[#171717]">
                  {formatCurrency(metrics.costPerYieldUnit)}
                </span>
              </div>
              <div className="px-2">
                <span className="block text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                  Suggested Price ({metrics.targetMarginPercent}%)
                </span>
                <span className="text-lg font-bold font-mono text-emerald-700">
                  {formatCurrency(metrics.suggestedPricePerYieldUnit || 0)}
                </span>
              </div>
              <div className="px-2">
                <span className="block text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                  Markup on Cost
                </span>
                <span className="text-lg font-bold font-mono text-[#171717]">
                  {metrics.markupPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : recipe ? "Update Recipe" : "Create Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
