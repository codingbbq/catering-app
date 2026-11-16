"use client";

import React, { useEffect, useState } from "react";
import type { PurchaseOrder, ReceivePurchaseOrderItemsRequest } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface ReceiveItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceivePurchaseOrderItemsRequest) => Promise<void>;
  order: PurchaseOrder | null;
  isSubmitting: boolean;
}

interface LineReceiptInput {
  lineId: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  remaining: number;
  toReceiveNow: number;
  isInventoryLinked: boolean;
}

export function ReceiveItemsDialog({
  isOpen,
  onClose,
  onSubmit,
  order,
  isSubmitting,
}: ReceiveItemsDialogProps) {
  const { formatCurrency } = useTenantCurrency();

  const [receiptLines, setReceiptLines] = useState<LineReceiptInput[]>([]);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order && order.lines) {
      const items: LineReceiptInput[] = order.lines.map((l) => {
        const remaining = Math.max(0, (l.quantityOrdered || 0) - (l.quantityReceived || 0));
        return {
          lineId: l.id,
          name: l.name,
          unit: l.unit,
          quantityOrdered: l.quantityOrdered,
          quantityReceived: l.quantityReceived || 0,
          remaining: Math.round(remaining * 1000) / 1000,
          toReceiveNow: Math.round(remaining * 1000) / 1000, // default receive remaining
          isInventoryLinked: Boolean(l.inventoryItemId),
        };
      });
      setReceiptLines(items);
      setReceiptNotes("");
    } else {
      setReceiptLines([]);
      setReceiptNotes("");
    }
    setError(null);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleQtyChange = (lineId: string, val: number) => {
    setReceiptLines((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, toReceiveNow: val } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const itemsToReceive = receiptLines.filter((l) => l.toReceiveNow > 0);

    if (itemsToReceive.length === 0) {
      setError("Please specify a quantity greater than zero for at least one item to receive.");
      return;
    }

    for (const item of itemsToReceive) {
      if (item.toReceiveNow > item.remaining + 0.0001) {
        setError(
          `Cannot receive ${item.toReceiveNow} for "${item.name}". Remaining ordered quantity is ${item.remaining} ${item.unit}.`,
        );
        return;
      }
    }

    try {
      await onSubmit({
        items: itemsToReceive.map((l) => ({
          lineId: l.lineId,
          quantityReceived: l.toReceiveNow,
        })),
        notes: receiptNotes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record goods receipt");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#171717]">
              Receive Goods against {order.poNumber}
            </h2>
            <p className="text-xs text-[#737373]">
              Supplier: <span className="font-semibold text-[#171717]">{order.supplier?.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
          <p className="font-semibold">Automated Inventory Synchronization</p>
          <p className="mt-0.5 text-[11px] text-emerald-800">
            Received items linked to the food catalogue will automatically generate verified stock movement records and increment physical stock on-hand.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="overflow-x-auto rounded-md border border-[#E5E5E5]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Ordered</th>
                  <th className="py-2.5 px-3 text-right">Prior Received</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3 text-right w-32">Receive Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {receiptLines.map((line) => (
                  <tr key={line.lineId} className="hover:bg-[#FAFAFA]">
                    <td className="p-3">
                      <div className="font-medium text-[#171717]">{line.name}</div>
                      {line.isInventoryLinked ? (
                        <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium">
                          ✓ Linked to Inventory SKU
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#A3A3A3]">Non-stock / Expense Item</span>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono tabular-nums text-[#525252]">
                      {line.quantityOrdered.toFixed(1)} {line.unit}
                    </td>

                    <td className="p-3 text-right font-mono tabular-nums text-[#737373]">
                      {line.quantityReceived.toFixed(1)} {line.unit}
                    </td>

                    <td className="p-3 text-right font-mono font-semibold tabular-nums text-[#171717]">
                      {line.remaining.toFixed(1)} {line.unit}
                    </td>

                    <td className="p-3 text-right">
                      {line.remaining <= 0 ? (
                        <span className="text-xs font-semibold text-emerald-700">Fully Received</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={line.remaining}
                            value={line.toReceiveNow}
                            onChange={(e) =>
                              handleQtyChange(line.lineId, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 rounded-md border border-[#E5E5E5] px-2 py-1 text-right font-mono text-xs focus:border-[#171717] focus:outline-hidden"
                          />
                          <span className="text-xs text-[#737373]">{line.unit}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717]">
              Receipt Delivery / Inspection Notes
            </label>
            <input
              type="text"
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              placeholder="e.g. Supplier invoice #INV-8891, batch quality verified, temp 4°C"
              className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Receiving Goods..." : "Confirm & Update Inventory Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
