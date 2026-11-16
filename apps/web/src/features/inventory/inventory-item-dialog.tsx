"use client";

import React, { useEffect, useState } from "react";
import type { CreateInventoryItemRequest, InventoryCategory, InventoryItem, UpdateInventoryItemRequest } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface InventoryItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInventoryItemRequest | UpdateInventoryItemRequest) => Promise<void>;
  item?: InventoryItem | null;
  isSubmitting?: boolean;
}

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: "produce", label: "Fresh Produce (Vegetables & Fruits)" },
  { value: "meat_poultry", label: "Meat, Poultry & Seafood" },
  { value: "dairy", label: "Dairy & Eggs" },
  { value: "dry_goods", label: "Dry Goods & Grains" },
  { value: "beverages", label: "Beverages, Tea & Coffee" },
  { value: "packaging", label: "Packaging, Boxes & Disposables" },
  { value: "cleaning", label: "Cleaning & Chemicals" },
  { value: "other", label: "Other Supplies" },
];

const UNIT_PRESETS = ["kg", "g", "ltr", "ml", "piece", "box", "pack"];

export function InventoryItemDialog({
  isOpen,
  onClose,
  onSubmit,
  item,
  isSubmitting = false,
}: InventoryItemDialogProps) {
  const { currencySymbol, currencyCode } = useTenantCurrency();
  const isEdit = Boolean(item);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("dry_goods");
  const [unit, setUnit] = useState("kg");
  const [currentStock, setCurrentStock] = useState("0");
  const [minStockLevel, setMinStockLevel] = useState("0");
  const [maxStockLevel, setMaxStockLevel] = useState("");
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("0");
  const [storageLocation, setStorageLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setSku(item.sku);
      setName(item.name);
      setDescription(item.description || "");
      setCategory(item.category);
      setUnit(item.unit);
      setCurrentStock(String(item.currentStock));
      setMinStockLevel(String(item.minStockLevel));
      setMaxStockLevel(item.maxStockLevel ? String(item.maxStockLevel) : "");
      setReorderQuantity(item.reorderQuantity ? String(item.reorderQuantity) : "");
      setUnitCost(String(item.unitCost));
      setStorageLocation(item.storageLocation || "");
      setNotes(item.notes || "");
    } else {
      setSku("");
      setName("");
      setDescription("");
      setCategory("dry_goods");
      setUnit("kg");
      setCurrentStock("0");
      setMinStockLevel("0");
      setMaxStockLevel("");
      setReorderQuantity("");
      setUnitCost("0");
      setStorageLocation("");
      setNotes("");
    }
    setError(null);
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim()) {
      setError("Item SKU is required (e.g. ING-BAS-001)");
      return;
    }
    if (!name.trim()) {
      setError("Item Name is required");
      return;
    }
    if (!unit.trim()) {
      setError("Unit of measure is required");
      return;
    }

    try {
      if (isEdit && item) {
        await onSubmit({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || null,
          category,
          unit: unit.trim(),
          minStockLevel: Number(minStockLevel) || 0,
          maxStockLevel: maxStockLevel.trim() ? Number(maxStockLevel) : null,
          reorderQuantity: reorderQuantity.trim() ? Number(reorderQuantity) : null,
          unitCost: Number(unitCost) || 0,
          storageLocation: storageLocation.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await onSubmit({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || null,
          category,
          unit: unit.trim(),
          currentStock: Number(currentStock) || 0,
          minStockLevel: Number(minStockLevel) || 0,
          maxStockLevel: maxStockLevel.trim() ? Number(maxStockLevel) : null,
          reorderQuantity: reorderQuantity.trim() ? Number(reorderQuantity) : null,
          unitCost: Number(unitCost) || 0,
          storageLocation: storageLocation.trim() || null,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save inventory item");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              {isEdit ? "Edit Inventory Item" : "Create Inventory Item"}
            </h2>
            <p className="text-xs text-[#737373]">
              {isEdit
                ? `Update specifications and par levels for ${item?.sku}`
                : "Register a raw ingredient, beverage, or packaging material in stock catalog"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Row 1: SKU & Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                SKU / Code *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="ING-BAS-001"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 font-mono text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Basmati Rice Aged"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Category & Unit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Unit of Measure *
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg"
                  className="w-24 rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
                <div className="flex flex-wrap gap-1">
                  {UNIT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setUnit(p)}
                      className={`rounded px-2 py-1 text-[11px] font-medium border ${unit === p ? "border-[#171717] bg-[#171717] text-white" : "border-[#E5E5E5] bg-[#F5F5F4] text-[#737373] hover:text-[#171717]"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Unit Cost (with currency symbol) & Current Stock (if creating) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Unit Cost ({currencyCode} - {currencySymbol})
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-[#E5E5E5] bg-white pl-8 pr-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#737373]">
                Cost per {unit || "unit"} in tenant's saved database currency ({currencyCode})
              </p>
            </div>

            {!isEdit ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Opening Stock Balance ({unit || "units"})
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
                <p className="mt-1 text-[11px] text-[#737373]">
                  Initial on-hand count (creates automatic opening adjustment)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Current Stock on Hand
                </label>
                <div className="mt-1 flex items-center rounded-md border border-[#E5E5E5] bg-[#F5F5F4] px-3 py-2 text-xs font-semibold text-[#171717]">
                  {item?.currentStock} {item?.unit}
                  <span className="ml-2 text-[11px] font-normal text-[#737373]">
                    (Adjust via &ldquo;Record Movement&rdquo;)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Par Level & Storage Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Min / Par Level ({unit || "units"})
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-[#737373]">Triggers low stock alert</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Max Capacity
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Reorder Qty
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Storage Location & Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Storage Location
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Cold Storage Room 1 - Shelf B"
              className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed ingredient notes, supplier specifications, brand requirements..."
              className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update Item" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
