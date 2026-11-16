"use client";

import { useEffect, useState } from "react";
import type { InventoryItem } from "@catering/shared-types";
import { recordKitchenConsumption } from "@/lib/kitchen-api";
import { listInventoryItems } from "@/lib/inventory-api";

interface RecordConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planNumber: string;
  token: string;
  onSuccess: () => void;
}

export function RecordConsumptionModal({
  isOpen,
  onClose,
  planId,
  planNumber,
  token,
  onSuccess,
}: RecordConsumptionModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingItems(true);
    listInventoryItems(token, { limit: 100, includeArchived: false })
      .then((res) => {
        setItems(res.items || []);
        if (res.items && res.items.length > 0 && res.items[0]) {
          setSelectedItemId(res.items[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load inventory items:", err);
      })
      .finally(() => setLoadingItems(false));
  }, [isOpen, token]);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = parseFloat(quantity);
    if (!selectedItemId || isNaN(qty) || qty <= 0) {
      setError("Please select a valid item and enter a quantity greater than 0");
      return;
    }

    if (selectedItem && qty > selectedItem.currentStock) {
      setError(
        `Insufficient stock! Available: ${selectedItem.currentStock} ${selectedItem.unit}, requested: ${qty} ${selectedItem.unit}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await recordKitchenConsumption(
        planId,
        {
          inventoryItemId: selectedItemId,
          quantity: qty,
          notes: notes || `Production plan ${planNumber} ingredient consumption`,
        },
        token,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record kitchen consumption");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5]">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#171717]">
              Deduct Kitchen Stock
            </h2>
            <p className="text-xs text-[#737373]">
              Record ingredients used for plan <span className="font-mono">{planNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] text-lg font-mono"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#262626]">
              Select Stock Item *
            </label>
            {loadingItems ? (
              <div className="h-9 w-full rounded border border-[#E5E5E5] bg-[#FAFAFA] animate-pulse mt-1" />
            ) : (
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                required
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — Available: {item.currentStock} {item.unit}
                  </option>
                ))}
              </select>
            )}
            {selectedItem && (
              <p className="text-[11px] text-[#737373] mt-1">
                Category: <span className="capitalize">{selectedItem.category.replace("_", " ")}</span> · Current Stock:{" "}
                <span className="font-mono font-semibold text-[#171717]">
                  {selectedItem.currentStock} {selectedItem.unit}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626]">
              Quantity to Deduct * ({selectedItem?.unit || "units"})
            </label>
            <input
              type="number"
              step="any"
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5.5"
              className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626]">
              Usage Note / Recipe Item
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 5 kg basmati rice for biryani prep"
              className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isSubmitting ? "Deducting..." : "Record Consumption"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
