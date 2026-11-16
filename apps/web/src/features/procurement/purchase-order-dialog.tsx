"use client";

import React, { useEffect, useState } from "react";
import type {
  CreatePurchaseOrderLineItem,
  CreatePurchaseOrderRequest,
  InventoryItem,
  PurchaseOrder,
  Supplier,
  UpdatePurchaseOrderRequest,
} from "@catering/shared-types";
import { calculatePurchaseOrderTotals } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface PurchaseOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePurchaseOrderRequest | UpdatePurchaseOrderRequest) => Promise<void>;
  editingOrder: PurchaseOrder | null;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  preselectedSupplierId?: string | undefined;
  isSubmitting: boolean;
}

interface FormLineItem {
  id?: string;
  inventoryItemId?: string | null;
  name: string;
  description?: string | null;
  quantityOrdered: number;
  unit: string;
  unitPrice: number;
}

export function PurchaseOrderDialog({
  isOpen,
  onClose,
  onSubmit,
  editingOrder,
  suppliers,
  inventoryItems,
  preselectedSupplierId,
  isSubmitting,
}: PurchaseOrderDialogProps) {
  const { formatCurrency, currencyCode } = useTenantCurrency();

  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<FormLineItem[]>([
    { name: "", quantityOrdered: 1, unit: "kg", unitPrice: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingOrder) {
      setSupplierId(editingOrder.supplierId);
      setOrderDate(editingOrder.orderDate ? (editingOrder.orderDate.split("T")[0] ?? "") : "");
      setExpectedDeliveryDate(
        editingOrder.expectedDeliveryDate ? (editingOrder.expectedDeliveryDate.split("T")[0] ?? "") : "",
      );
      setDeliveryAddress(editingOrder.deliveryAddress || "");
      setTaxRate(editingOrder.taxRate || 0);
      setNotes(editingOrder.notes || "");
      setInternalNotes(editingOrder.internalNotes || "");
      setLines(
        (editingOrder.lines || []).map((l) => ({
          id: l.id,
          inventoryItemId: l.inventoryItemId || null,
          name: l.name,
          description: l.description || null,
          quantityOrdered: l.quantityOrdered,
          unit: l.unit,
          unitPrice: l.unitPrice,
        })),
      );
    } else {
      setSupplierId(preselectedSupplierId || (suppliers[0]?.id ?? ""));
      setOrderDate(new Date().toISOString().split("T")[0] ?? "");
      setExpectedDeliveryDate("");
      setDeliveryAddress("");
      setTaxRate(0);
      setNotes("");
      setInternalNotes("");
      setLines([{ name: "", quantityOrdered: 1, unit: "kg", unitPrice: 0 }]);
    }
    setError(null);
  }, [editingOrder, isOpen, preselectedSupplierId, suppliers]);

  if (!isOpen) return null;

  const totals = calculatePurchaseOrderTotals(
    lines.map((l) => ({ quantityOrdered: l.quantityOrdered, unitPrice: l.unitPrice })),
    taxRate,
  );

  const handleAddLine = () => {
    setLines([...lines, { name: "", quantityOrdered: 1, unit: "kg", unitPrice: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = <K extends keyof FormLineItem>(index: number, field: K, val: FormLineItem[K]) => {
    setLines((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (target) {
        copy[index] = { ...target, [field]: val };
      }
      return copy;
    });
  };

  const handleInventoryItemSelect = (index: number, itemId: string) => {
    if (!itemId) {
      handleLineChange(index, "inventoryItemId", null);
      return;
    }
    const inv = inventoryItems.find((item) => item.id === itemId);
    if (inv) {
      setLines((prev) => {
        const copy = [...prev];
        const target = copy[index];
        if (target) {
          copy[index] = {
            ...target,
            inventoryItemId: inv.id,
            name: inv.name,
            unit: inv.unit,
            unitPrice: inv.unitCost || 0,
          };
        }
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }

    if (lines.length === 0) {
      setError("Please add at least one line item");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l || !l.name.trim()) {
        setError(`Line #${i + 1} must have an item name`);
        return;
      }
      if (l.quantityOrdered <= 0) {
        setError(`Line #${i + 1} quantity must be greater than zero`);
        return;
      }
    }

    const payload: CreatePurchaseOrderRequest = {
      supplierId,
      orderDate: orderDate ? new Date(orderDate).toISOString() : undefined,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
      deliveryAddress: deliveryAddress.trim() || null,
      taxRate: Number(taxRate) || 0,
      notes: notes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      lines: lines.map((l, idx) => ({
        inventoryItemId: l.inventoryItemId || null,
        name: l.name.trim(),
        description: l.description?.trim() || null,
        quantityOrdered: Number(l.quantityOrdered),
        unit: l.unit.trim() || "kg",
        unitPrice: Number(l.unitPrice) || 0,
        sortOrder: idx,
      })),
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save purchase order");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#171717]">
              {editingOrder ? `Edit Purchase Order (${editingOrder.poNumber})` : "Create Purchase Order"}
            </h2>
            <p className="text-xs text-[#737373]">
              Generate a formal procurement order for suppliers with automated inventory stock linkage
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Top Metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717]">
              Delivery Destination Address
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. Central Production Commissary, Loading Bay 2"
              className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          {/* Itemized Lines */}
          <div className="space-y-2 border-t border-[#E5E5E5] pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Itemized Order Lines
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-[#E5E5E5]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                  <tr>
                    <th className="py-2.5 px-3">Link Catalog Item</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-24">Qty</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit Price ({currencyCode})</th>
                    <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {lines.map((line, idx) => {
                    const lineTotal = Math.round((line.quantityOrdered || 0) * (line.unitPrice || 0) * 100) / 100;

                    return (
                      <tr key={idx} className="hover:bg-[#FAFAFA]">
                        <td className="p-2">
                          <select
                            value={line.inventoryItemId || ""}
                            onChange={(e) => handleInventoryItemSelect(idx, e.target.value)}
                            className="w-full rounded-md border border-[#E5E5E5] px-2 py-1 text-xs focus:border-[#171717] focus:outline-hidden"
                          >
                            <option value="">(Custom / Ad-hoc Item)</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.sku} - {inv.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => handleLineChange(idx, "name", e.target.value)}
                            placeholder="Ingredient / Supply Name"
                            className="w-full rounded-md border border-[#E5E5E5] px-2 py-1 text-xs focus:border-[#171717] focus:outline-hidden"
                            required
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={line.quantityOrdered}
                            onChange={(e) =>
                              handleLineChange(idx, "quantityOrdered", parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-md border border-[#E5E5E5] px-2 py-1 text-xs text-right font-mono focus:border-[#171717] focus:outline-hidden"
                            required
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => handleLineChange(idx, "unit", e.target.value)}
                            placeholder="kg / ltr"
                            className="w-full rounded-md border border-[#E5E5E5] px-2 py-1 text-xs focus:border-[#171717] focus:outline-hidden"
                            required
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleLineChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-md border border-[#E5E5E5] px-2 py-1 text-xs text-right font-mono focus:border-[#171717] focus:outline-hidden"
                            required
                          />
                        </td>

                        <td className="p-2 text-right font-mono font-semibold text-[#171717] tabular-nums">
                          {formatCurrency(lineTotal)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 1}
                            className="text-[#A3A3A3] hover:text-red-700 disabled:opacity-30"
                            title="Remove line"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Tax Calculation */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-t border-[#E5E5E5] pt-4">
            <div className="w-full sm:w-1/2 space-y-2">
              <label className="block text-xs font-semibold text-[#171717]">
                Instructions & Delivery Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include batch expectations, delivery cut-off times, unloading guidelines..."
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div className="w-full sm:w-80 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] p-4 text-xs space-y-2">
              <div className="flex justify-between text-[#737373]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#171717] font-semibold tabular-nums">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#737373]">
                <div className="flex items-center gap-1.5">
                  <span>Applicable Tax %:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-14 rounded-md border border-[#E5E5E5] bg-white px-1.5 py-0.5 text-right font-mono text-xs focus:border-[#171717] focus:outline-hidden"
                  />
                </div>
                <span className="font-mono text-[#171717] font-semibold tabular-nums">
                  {formatCurrency(totals.taxAmount)}
                </span>
              </div>

              <div className="border-t border-[#E5E5E5] pt-2 flex justify-between text-sm font-bold text-[#171717]">
                <span>Total Amount:</span>
                <span className="font-mono text-base tabular-nums">
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingOrder ? "Update Order" : "Draft Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
