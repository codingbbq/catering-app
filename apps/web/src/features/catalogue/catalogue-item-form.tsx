"use client";

import type {
  CatalogueItem,
  CreateCatalogueItemRequest,
  PricingUnit,
  UpdateCatalogueItemRequest,
} from "@catering/shared-types";
import Link from "next/link";
import { useState } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface CatalogueItemFormProps {
  tenantSlug: string;
  initialData?: CatalogueItem;
  onSubmit: (
    data: CreateCatalogueItemRequest | UpdateCatalogueItemRequest,
  ) => Promise<void>;
  isSubmitting?: boolean;
}

const CATEGORIES = [
  "starter",
  "main",
  "dessert",
  "beverage",
  "bread",
  "side",
  "salad",
  "snack",
  "other",
];

const PRICING_UNITS: Array<{ value: PricingUnit; label: string }> = [
  { value: "per_person", label: "Per Person" },
  { value: "per_plate", label: "Per Plate" },
  { value: "per_kg", label: "Per Kilogram (kg)" },
  { value: "per_tray", label: "Per Tray / Platter" },
  { value: "per_piece", label: "Per Piece" },
  { value: "per_liter", label: "Per Liter" },
  { value: "fixed", label: "Fixed Package Price" },
];

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten_free", label: "Gluten-Free" },
  { id: "dairy_free", label: "Dairy-Free" },
  { id: "nut_free", label: "Nut-Free" },
  { id: "spicy", label: "Spicy" },
  { id: "organic", label: "Organic" },
];

export function CatalogueItemForm({
  tenantSlug,
  initialData,
  onSubmit,
  isSubmitting = false,
}: CatalogueItemFormProps) {
  const { currencySymbol, formatCurrency } = useTenantCurrency();
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "main");
  const [pricingUnit, setPricingUnit] = useState<PricingUnit>(
    initialData?.pricingUnit || "per_person",
  );
  const [costPrice, setCostPrice] = useState<string>(
    initialData?.costPrice !== null && initialData?.costPrice !== undefined
      ? String(initialData.costPrice)
      : "",
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    initialData?.sellingPrice !== undefined ? String(initialData.sellingPrice) : "",
  );
  const [minQuantity, setMinQuantity] = useState<string>(
    initialData?.minQuantity !== null && initialData?.minQuantity !== undefined
      ? String(initialData.minQuantity)
      : "",
  );
  const [dietaryTags, setDietaryTags] = useState<string[]>(
    initialData?.dietaryTags || [],
  );
  const [error, setError] = useState<string | null>(null);

  // Live margin calculation
  const numericCost = costPrice !== "" ? Number.parseFloat(costPrice) : null;
  const numericSelling = sellingPrice !== "" ? Number.parseFloat(sellingPrice) : null;

  let grossMargin: number | null = null;
  let markup: number | null = null;
  if (
    numericSelling !== null &&
    !Number.isNaN(numericSelling) &&
    numericSelling > 0 &&
    numericCost !== null &&
    !Number.isNaN(numericCost)
  ) {
    grossMargin = ((numericSelling - numericCost) / numericSelling) * 100;
    if (numericCost > 0) {
      markup = ((numericSelling - numericCost) / numericCost) * 100;
    }
  }

  const toggleDietaryTag = (tagId: string) => {
    setDietaryTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Item name is required.");
      return;
    }

    if (
      numericSelling === null ||
      Number.isNaN(numericSelling) ||
      numericSelling < 0
    ) {
      setError("Please provide a valid non-negative selling price.");
      return;
    }

    if (
      numericCost !== null &&
      (Number.isNaN(numericCost) || numericCost < 0)
    ) {
      setError("Cost price must be a valid non-negative number.");
      return;
    }

    const payload: CreateCatalogueItemRequest = {
      name: trimmedName,
      description: description.trim() || undefined,
      category: category.trim().toLowerCase(),
      pricingUnit,
      sellingPrice: numericSelling,
      costPrice: numericCost !== null ? numericCost : undefined,
      dietaryTags,
      minQuantity:
        minQuantity !== "" && !Number.isNaN(Number(minQuantity))
          ? Number.parseInt(minQuantity, 10)
          : undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save catalogue item.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded border border-[#EF4444] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Basic Attributes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Item Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Herb Crusted Salmon Fillet"
            className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Category <span className="text-[#EF4444]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none capitalize"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Pricing Unit <span className="text-[#EF4444]">*</span>
          </label>
          <select
            value={pricingUnit}
            onChange={(e) => setPricingUnit(e.target.value as PricingUnit)}
            className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
          >
            {PRICING_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Description & Serving Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Item ingredients, presentation style, or preparation notes..."
            className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
          />
          {!initialData && (
            <p className="mt-1.5 text-[11px] text-[#737373]">
              📸 You can upload multiple dish photos and select a cover image directly in the dish editor after creation.
            </p>
          )}
        </div>
      </div>

      {/* Commercial & Costing Strip */}
      <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-4">
        <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
          Pricing & Commercial Margin
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1">
              Unit Cost Price ({currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="e.g. 8.50"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
            />
            <span className="text-[10px] text-[#A3A3A3]">
              Optional caterer prep/raw cost
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1">
              Selling Price ({currencySymbol}) <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="e.g. 22.00"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono font-semibold text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
            />
            <span className="text-[10px] text-[#A3A3A3]">
              Standard quote default rate
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1">
              Min. Order Quantity
            </label>
            <input
              type="number"
              min="1"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              placeholder="e.g. 15"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
            />
            <span className="text-[10px] text-[#A3A3A3]">
              Leave blank if no minimum
            </span>
          </div>
        </div>

        {/* Live Margin Readout */}
        {grossMargin !== null && (
          <div className="flex items-center justify-between rounded border border-[#E5E5E5] bg-white px-4 py-3 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[11px] text-[#737373]">Gross Margin:</span>{" "}
                <span
                  className={`font-mono font-bold ${
                    grossMargin < 35 ? "text-[#B45309]" : "text-[#15803D]"
                  }`}
                >
                  {grossMargin.toFixed(1)}%
                </span>
              </div>
              {markup !== null && (
                <div>
                  <span className="text-[11px] text-[#737373]">Markup:</span>{" "}
                  <span className="font-mono font-bold text-[#171717]">
                    {markup.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-[#737373]">
              Gross profit:{" "}
              <span className="font-mono font-semibold text-[#171717]">
                {formatCurrency(numericSelling! - numericCost!)}
              </span>{" "}
              per unit
            </div>
          </div>
        )}
      </div>

      {/* Dietary & Allergen Tags */}
      <div>
        <label className="block text-xs font-semibold text-[#171717] mb-2">
          Dietary & Allergen Classifications
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => {
            const isSelected = dietaryTags.includes(opt.id);
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => toggleDietaryTag(opt.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  isSelected
                    ? "bg-[#171717] text-white border-[#171717]"
                    : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#171717]"
                }`}
              >
                {isSelected ? "✓" : "+"} {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[#E5E5E5] pt-4">
        <Link
          href={`/tenant/${tenantSlug}/catalogue`}
          className="rounded border border-[#E5E5E5] px-4 py-2 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : initialData
            ? "Update Catalogue Item"
            : "Create Catalogue Item"}
        </button>
      </div>
    </form>
  );
}
