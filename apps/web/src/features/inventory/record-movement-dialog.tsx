"use client";

import React, { useEffect, useState } from "react";
import type { InventoryItem, RecordStockMovementRequest, StockMovementType } from "@catering/shared-types";
import { calculateSignedQuantity } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface RecordMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecordStockMovementRequest) => Promise<void>;
  items: InventoryItem[];
  preselectedItemId?: string | undefined;
  isSubmitting?: boolean;
}

const MOVEMENT_TYPES: { value: StockMovementType; label: string; direction: "in" | "out" | "transfer"; description: string }[] = [
  { value: "purchase_received", label: "Purchase Received (+ Stock In)", direction: "in", description: "Supplier delivery intake" },
  { value: "kitchen_consumption", label: "Kitchen Consumption (- Stock Out)", direction: "out", description: "Food prep, daily orders, recipe usage" },
  { value: "waste_spoilage", label: "Waste / Spoilage (- Stock Out)", direction: "out", description: "Expired, burnt, contaminated, or damaged stock" },
  { value: "adjustment_in", label: "Stock Adjustment In (+ Count Gain)", direction: "in", description: "Physical stock count surplus reconciliation" },
  { value: "adjustment_out", label: "Stock Adjustment Out (- Count Loss)", direction: "out", description: "Physical stock count shortfall reconciliation" },
  { value: "return_to_supplier", label: "Return to Supplier (- Stock Out)", direction: "out", description: "Defective goods or excess returned to vendor" },
  { value: "transfer", label: "Internal Location Transfer", direction: "transfer", description: "Relocate between cold storage and dry store" },
];

export function RecordMovementDialog({
  isOpen,
  onClose,
  onSubmit,
  items,
  preselectedItemId,
  isSubmitting = false,
}: RecordMovementDialogProps) {
  const { currencySymbol, currencyCode, formatCurrency } = useTenantCurrency();

  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || "");
  const [movementType, setMovementType] = useState<StockMovementType>("purchase_received");
  const [quantity, setQuantity] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [referenceType, setReferenceType] = useState<string>("manual");
  const [referenceId, setReferenceId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    } else if (items.length > 0 && !selectedItemId && items[0]) {
      setSelectedItemId(items[0].id);
    }
  }, [preselectedItemId, items, selectedItemId]);

  useEffect(() => {
    if (selectedItem) {
      setUnitCost(String(selectedItem.unitCost));
    }
    setError(null);
  }, [selectedItemId]);

  if (!isOpen) return null;

  const currentStock = selectedItem ? selectedItem.currentStock : 0;
  const numQuantity = Number(quantity) || 0;
  const signedQty = calculateSignedQuantity(movementType, numQuantity);
  const projectedStock = currentStock + signedQty;
  const effectiveCost = unitCost ? Number(unitCost) : (selectedItem?.unitCost ?? 0);
  const totalMovementCost = Math.round(numQuantity * effectiveCost * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError("Please select an inventory item");
      return;
    }
    if (numQuantity <= 0) {
      setError("Movement quantity must be greater than zero");
      return;
    }

    if (signedQty < 0 && projectedStock < -0.0001) {
      setError(
        `Insufficient stock for "${selectedItem?.name}". Current stock is ${currentStock.toFixed(2)} ${selectedItem?.unit}, but attempting to deduce ${numQuantity.toFixed(2)} ${selectedItem?.unit}.`,
      );
      return;
    }

    try {
      await onSubmit({
        inventoryItemId: selectedItemId,
        type: movementType,
        quantity: numQuantity,
        unitCost: unitCost ? Number(unitCost) : undefined,
        referenceType: referenceType.trim() || undefined,
        referenceId: referenceId.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setQuantity("");
      setReason("");
      setReferenceId("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record stock movement");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">Record Stock Movement</h2>
            <p className="text-xs text-[#737373]">
              Audit receipt, kitchen usage, waste, or inventory reconciliation
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
          {/* Select Item */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Inventory Item *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              disabled={Boolean(preselectedItemId)}
              className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden disabled:bg-[#F5F5F4]"
            >
              <option value="">Select stock item...</option>
              {items
                .filter((i) => !i.isArchived)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name} — Current: {i.currentStock} {i.unit} ({formatCurrency(i.unitCost)}/{i.unit})
                  </option>
                ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Movement Type *
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as StockMovementType)}
              className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            >
              {MOVEMENT_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Cost Override */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Quantity ({selectedItem?.unit || "units"}) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>

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
            </div>
          </div>

          {/* Live Projection Card */}
          {selectedItem && numQuantity > 0 && (
            <div className={`rounded-md border p-3 text-xs ${projectedStock < 0 ? "border-red-200 bg-red-50 text-red-900" : "border-[#E5E5E5] bg-[#FAFAFA] text-[#171717]"}`}>
              <div className="flex items-center justify-between font-semibold">
                <span>Stock Projection</span>
                <span>
                  Cost Impact: {formatCurrency(totalMovementCost)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <div>
                  <span className="text-[#737373]">Current:</span>{" "}
                  <span className="font-mono font-medium">{currentStock} {selectedItem.unit}</span>
                </div>
                <span className="text-[#737373]">→</span>
                <div>
                  <span className="text-[#737373]">Delta:</span>{" "}
                  <span className={`font-mono font-semibold ${signedQty > 0 ? "text-emerald-700" : signedQty < 0 ? "text-red-700" : ""}`}>
                    {signedQty > 0 ? `+${signedQty}` : signedQty} {selectedItem.unit}
                  </span>
                </div>
                <span className="text-[#737373]">→</span>
                <div>
                  <span className="text-[#737373]">Projected:</span>{" "}
                  <span className={`font-mono font-bold ${projectedStock <= selectedItem.minStockLevel ? "text-amber-700" : "text-[#171717]"}`}>
                    {projectedStock.toFixed(2)} {selectedItem.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reference & Reason */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Reference Type
              </label>
              <select
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              >
                <option value="manual">Manual Entry / Ad-hoc</option>
                <option value="purchase_order">Purchase Order (PO)</option>
                <option value="daily_meal_order">Daily Meal Order (DMO)</option>
                <option value="booking">Event Catering Booking</option>
                <option value="recipe_batch">Kitchen Recipe Prep</option>
                <option value="physical_audit">Physical Inventory Audit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Reference ID / Number
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. PO-202611-0101, BK-202611-0001"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Reason / Notes
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Batch prep for weekend wedding reception, arrived damaged..."
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
              disabled={isSubmitting || projectedStock < -0.0001}
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isSubmitting ? "Recording..." : "Post Movement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
