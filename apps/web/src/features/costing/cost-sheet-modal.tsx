"use client";

import type {
  CostSheet,
  CostSheetItemInput,
  CostSheetItemType,
  CostSheetStatus,
  CreateCostSheetRequest,
  UpdateCostSheetRequest,
} from "@catering/shared-types";
import { calculateCostSheetEngine } from "@catering/shared-types";
import { useMemo, useState } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface CostSheetModalProps {
  costSheet: CostSheet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCostSheetRequest | UpdateCostSheetRequest) => Promise<void>;
  isSaving: boolean;
  availableMenus?: Array<{ id: string; name: string }>;
  availableRecipes?: Array<{ id: string; name: string; costPerYieldUnit: number }>;
}

const ITEM_TYPES: Array<{ id: CostSheetItemType; label: string }> = [
  { id: "ingredient", label: "Ingredient / Food" },
  { id: "recipe", label: "Sub-Recipe" },
  { id: "labor", label: "Labor / Chef" },
  { id: "overhead", label: "Overhead / Rental" },
  { id: "other", label: "Other / Buffer" },
];

export function CostSheetModal({
  costSheet,
  isOpen,
  onClose,
  onSave,
  isSaving,
  availableMenus = [],
  availableRecipes = [],
}: CostSheetModalProps) {
  const { currencySymbol, formatCurrency } = useTenantCurrency();
  const [name, setName] = useState(costSheet?.name ?? "");
  const [description, setDescription] = useState(costSheet?.description ?? "");
  const [status, setStatus] = useState<CostSheetStatus>(costSheet?.status ?? "draft");
  const [menuId, setMenuId] = useState<string>(costSheet?.menuId ?? "");
  const [recipeId, setRecipeId] = useState<string>(costSheet?.recipeId ?? "");
  const [servings, setServings] = useState<number>(costSheet?.servings ?? 50);
  const [laborCost, setLaborCost] = useState<number>(costSheet?.laborCost ?? 0);
  const [overheadCost, setOverheadCost] = useState<number>(costSheet?.overheadCost ?? 0);
  const [otherCost, setOtherCost] = useState<number>(costSheet?.otherCost ?? 0);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(
    costSheet?.targetMarginPercent ?? 35,
  );
  const [quotedPriceInput, setQuotedPriceInput] = useState<string>(
    costSheet?.quotedPrice !== undefined ? String(costSheet.quotedPrice) : "",
  );
  const [notes, setNotes] = useState(costSheet?.notes ?? "");

  const [items, setItems] = useState<CostSheetItemInput[]>(
    costSheet?.items && costSheet.items.length > 0
      ? costSheet.items.map((it) => ({
          itemType: it.itemType,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitCost: it.unitCost,
          notes: it.notes,
        }))
      : [
          {
            itemType: "ingredient",
            name: "Main Course Ingredients",
            quantity: 50,
            unit: "portion",
            unitCost: 6.5,
          },
        ],
  );

  // Deterministic live calculation
  const calculation = useMemo(() => {
    const rawQuoted = quotedPriceInput !== "" ? parseFloat(quotedPriceInput) : undefined;
    return calculateCostSheetEngine({
      servings: servings > 0 ? servings : 1,
      items,
      laborCost,
      overheadCost,
      otherCost,
      targetMarginPercent,
      quotedPrice: !isNaN(Number(rawQuoted)) ? rawQuoted : undefined,
    });
  }, [servings, items, laborCost, overheadCost, otherCost, targetMarginPercent, quotedPriceInput]);

  if (!isOpen) return null;

  const handleAddItem = (type: CostSheetItemType = "ingredient") => {
    setItems((prev) => [
      ...prev,
      {
        itemType: type,
        name: "",
        quantity: 1,
        unit: type === "labor" ? "hours" : "unit",
        unitCost: 0,
      },
    ]);
  };

  const handleAddFromRecipe = (rId: string) => {
    const found = availableRecipes.find((r) => r.id === rId);
    if (!found) return;
    setItems((prev) => [
      ...prev,
      {
        itemType: "recipe",
        name: found.name,
        quantity: servings,
        unit: "portion",
        unitCost: found.costPerYieldUnit,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CostSheetItemInput,
    val: unknown,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Cost sheet name is required");
      return;
    }

    const cleanedItems = items
      .filter((it) => it.name.trim().length > 0)
      .map((it, idx) => ({
        itemType: it.itemType || "ingredient",
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "unit",
        unitCost: Number(it.unitCost) || 0,
        sortOrder: idx,
        notes: it.notes?.trim() || null,
      }));

    const finalQuoted =
      quotedPriceInput !== "" && !isNaN(parseFloat(quotedPriceInput))
        ? parseFloat(quotedPriceInput)
        : calculation.suggestedPrice;

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      menuId: menuId || null,
      recipeId: recipeId || null,
      servings: Number(servings) > 0 ? Number(servings) : 1,
      targetMarginPercent: Number(targetMarginPercent) || 30,
      quotedPrice: finalQuoted,
      laborCost: Number(laborCost) || 0,
      overheadCost: Number(overheadCost) || 0,
      otherCost: Number(otherCost) || 0,
      notes: notes.trim() || undefined,
      items: cleanedItems,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              {costSheet ? `Edit Cost Sheet: ${costSheet.name}` : "Create New Cost Sheet"}
            </h2>
            <p className="text-xs text-[#737373]">
              Itemize raw ingredients, kitchen labor, transport & rentals to determine target selling price and margin.
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
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#171717]">
                Cost Sheet Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 100-Guest Corporate Gala Costing"
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CostSheetStatus)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Guest Count / Servings *
              </label>
              <input
                type="number"
                min="1"
                required
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Link to Menu (Optional)
              </label>
              <select
                value={menuId}
                onChange={(e) => setMenuId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="">-- None --</option>
                {availableMenus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Link to Recipe (Optional)
              </label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="">-- None --</option>
                {availableRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatCurrency(r.costPerYieldUnit)}/portion)
                  </option>
                ))}
              </select>
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
                value={targetMarginPercent}
                onChange={(e) => setTargetMarginPercent(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Quoted Total Price ({currencySymbol})
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={calculation.suggestedPrice.toFixed(2)}
                  value={quotedPriceInput}
                  onChange={(e) => setQuotedPriceInput(e.target.value)}
                  className="block w-full rounded-md border border-[#E5E5E5] pl-7 pr-3 py-2 text-sm font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5E5E5]">
            <span className="text-xs font-medium text-[#737373]">Quick Add:</span>
            <button
              type="button"
              onClick={() => handleAddItem("ingredient")}
              className="rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-1 text-xs text-[#171717] hover:bg-[#F0F0F0]"
            >
              + Ingredient Line
            </button>
            <button
              type="button"
              onClick={() => handleAddItem("labor")}
              className="rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-1 text-xs text-[#171717] hover:bg-[#F0F0F0]"
            >
              + Kitchen Labor Line
            </button>
            <button
              type="button"
              onClick={() => handleAddItem("overhead")}
              className="rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-1 text-xs text-[#171717] hover:bg-[#F0F0F0]"
            >
              + Equipment / Transport
            </button>
            {availableRecipes.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddFromRecipe(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-1 text-xs text-[#171717] focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  + Insert Recipe as Component...
                </option>
                {availableRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatCurrency(r.costPerYieldUnit)}/portion)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Line Items Table */}
          <div className="border border-[#E5E5E5] rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                    <th className="py-2.5 px-3 font-medium w-36">Category</th>
                    <th className="py-2.5 px-3 font-medium">Item Name / Description</th>
                    <th className="py-2.5 px-3 font-medium w-24">Qty</th>
                    <th className="py-2.5 px-3 font-medium w-24">Unit</th>
                    <th className="py-2.5 px-3 font-medium w-28">Unit Cost ({currencySymbol})</th>
                    <th className="py-2.5 px-3 font-medium w-28 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {items.map((item, idx) => {
                    const lineTotal =
                      Math.round(
                        ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0) +
                          Number.EPSILON) *
                          100,
                      ) / 100;
                    return (
                      <tr key={idx} className="hover:bg-[#FAFAFA]">
                        <td className="py-2 px-3">
                          <select
                            value={item.itemType}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "itemType",
                                e.target.value as CostSheetItemType,
                              )
                            }
                            className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs text-[#171717] focus:border-[#171717] focus:outline-none capitalize"
                          >
                            {ITEM_TYPES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Prime Rib Roast or Prep Chef Hours"
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
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              handleItemChange(idx, "unit", e.target.value)
                            }
                            placeholder="portion"
                            className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                          />
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
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="rounded p-1 text-[#737373] hover:bg-rose-50 hover:text-rose-600"
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

          {/* Fixed Additional Cost Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAFAFA] p-4 rounded-lg border border-[#E5E5E5]">
            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Additional Direct Labor ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={laborCost}
                onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Additional Overheads / Rentals ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={overheadCost}
                onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Contingency / Buffer ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={otherCost}
                onChange={(e) => setOtherCost(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Real-time KPI Card */}
          <div className="rounded-lg border border-[#171717] bg-[#171717] text-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#333333] pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                Cost & Margin Intelligence
              </span>
              <span className="text-xs font-mono text-[#A3A3A3]">
                Based on {calculation.servings} Servings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-[#333333]">
              <div className="px-2">
                <span className="block text-[11px] text-[#A3A3A3] uppercase">Total Event Cost</span>
                <span className="text-lg font-bold font-mono text-white">
                  {formatCurrency(calculation.totalCost)}
                </span>
                <span className="block text-[10px] text-[#737373]">
                  {formatCurrency(calculation.costPerServing)} / guest
                </span>
              </div>

              <div className="px-2">
                <span className="block text-[11px] text-[#A3A3A3] uppercase">Suggested Price ({calculation.targetMarginPercent}%)</span>
                <span className="text-lg font-bold font-mono text-stone-200">
                  {formatCurrency(calculation.suggestedPrice)}
                </span>
                <span className="block text-[10px] text-[#737373]">
                  {formatCurrency(calculation.suggestedPricePerServing)} / guest
                </span>
              </div>

              <div className="px-2">
                <span className="block text-[11px] text-[#A3A3A3] uppercase">Quoted Selling Price</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(calculation.quotedPrice)}
                </span>
                <span className="block text-[10px] text-[#737373]">
                  {formatCurrency(calculation.quotedPricePerServing)} / guest
                </span>
              </div>

              <div className="px-2">
                <span className="block text-[11px] text-[#A3A3A3] uppercase">Realized Gross Margin</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    calculation.actualMarginPercent >= calculation.targetMarginPercent
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {calculation.actualMarginPercent.toFixed(1)}%
                </span>
                <span className="block text-[10px] text-[#737373]">
                  Profit: {formatCurrency(calculation.grossProfit)}
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
              {isSaving ? "Saving..." : costSheet ? "Update Cost Sheet" : "Save Cost Sheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
