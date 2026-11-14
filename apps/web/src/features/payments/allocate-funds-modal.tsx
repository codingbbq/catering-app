"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listInvoices } from "@/lib/invoices-api";
import { allocatePayment } from "@/lib/payments-api";
import type { InvoiceListItem } from "@catering/shared-types";

interface AllocateFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string;
  paymentNumber: string;
  customerId: string;
  unallocatedAmount: number;
  currency?: string;
  onSuccess?: () => void;
}

export function AllocateFundsModal({
  isOpen,
  onClose,
  paymentId,
  paymentNumber,
  customerId,
  unallocatedAmount,
  currency,
  onSuccess,
}: AllocateFundsModalProps) {
  const { accessToken } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  const activeCurrency = currency || currencyCode || "INR";

  // Fetch customer invoices that have an outstanding balance
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["customer-invoices-outstanding", customerId],
    queryFn: () => listInvoices(accessToken!, { customerId, limit: 100 }),
    enabled: isOpen && !!customerId && !!accessToken,
  });

  const eligibleInvoices = useMemo(() => {
    if (!invoicesData?.items) return [];
    return invoicesData.items.filter(
      (inv: InvoiceListItem) =>
        inv.status !== "void" &&
        inv.status !== "draft" &&
        inv.status !== "paid" &&
        inv.balanceDue > 0,
    );
  }, [invoicesData]);

  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAllocating = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? sum : sum + parsed;
    }, 0);
  }, [allocations]);

  const remainingAfterAllocation = Math.round((unallocatedAmount - totalAllocating) * 100) / 100;

  const handleAmountChange = (invoiceId: string, val: string) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  const handleQuickFill = (inv: InvoiceListItem) => {
    const otherAllocationsSum = Object.entries(allocations).reduce(
      (sum, [id, val]) => {
        if (id === inv.id) return sum;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? sum : sum + parsed;
      },
      0,
    );
    const availableForThis = Math.max(0, unallocatedAmount - otherAllocationsSum);
    const fillAmount = Math.min(inv.balanceDue, availableForThis);
    handleAmountChange(inv.id, fillAmount > 0 ? fillAmount.toFixed(2) : "");
  };

  const mutation = useMutation({
    mutationFn: () => {
      const itemsToAllocate: Array<{ invoiceId: string; amount: number }> = [];

      for (const [invId, amountStr] of Object.entries(allocations)) {
        const amt = parseFloat(amountStr);
        if (!isNaN(amt) && amt > 0) {
          itemsToAllocate.push({ invoiceId: invId, amount: Math.round(amt * 100) / 100 });
        }
      }

      if (itemsToAllocate.length === 0) {
        throw new Error("Please specify at least one invoice allocation amount");
      }

      if (totalAllocating > unallocatedAmount) {
        throw new Error(
          `Allocated total (${formatCurrency(totalAllocating, activeCurrency)}) exceeds available unallocated funds (${formatCurrency(unallocatedAmount, activeCurrency)})`,
        );
      }

      return allocatePayment(
        paymentId,
        { allocations: itemsToAllocate },
        accessToken!,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to allocate payment funds");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-[#171717]">
              Allocate Payment Funds
            </h3>
            <p className="text-xs text-[#737373]">
              {paymentNumber} • Available to allocate:{" "}
              <span className="font-semibold text-[#171717]">
                {formatCurrency(unallocatedAmount, activeCurrency)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Live Allocation Summary Header */}
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-xs">
          <div>
            <span className="text-[#737373] block">Available Funds</span>
            <span className="font-semibold text-[#171717]">
              {formatCurrency(unallocatedAmount, activeCurrency)}
            </span>
          </div>
          <div>
            <span className="text-[#737373] block">Allocating Now</span>
            <span className={`font-semibold ${totalAllocating > unallocatedAmount ? "text-red-600" : "text-[#171717]"}`}>
              {formatCurrency(totalAllocating, activeCurrency)}
            </span>
          </div>
          <div>
            <span className="text-[#737373] block">Remaining Unallocated</span>
            <span
              className={`font-semibold ${
                remainingAfterAllocation < 0 ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {formatCurrency(remainingAfterAllocation, activeCurrency)}
            </span>
          </div>
        </div>

        {/* Invoices List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          <label className="block text-xs font-medium text-[#262626]">
            Select Invoices to Allocate
          </label>

          {isLoadingInvoices ? (
            <div className="py-8 text-center text-xs text-[#737373]">
              Loading outstanding customer invoices...
            </div>
          ) : eligibleInvoices.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#E5E5E5] p-6 text-center text-xs text-[#737373]">
              This customer currently has no issued invoices with outstanding balances.
            </div>
          ) : (
            <div className="space-y-2">
              {eligibleInvoices.map((inv: InvoiceListItem) => {
                const currentVal = allocations[inv.id] || "";
                const numVal = parseFloat(currentVal);
                const isOverInvoice = !isNaN(numVal) && numVal > inv.balanceDue;

                return (
                  <div
                    key={inv.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      numVal > 0
                        ? "border-[#171717] bg-[#FAFAFA]"
                        : "border-[#E5E5E5] bg-white hover:border-[#D4D4D4]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-[#171717]">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[11px] text-[#737373] truncate">
                            {inv.title}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-[#737373]">
                          <span>
                            Total: {formatCurrency(inv.totalAmount, activeCurrency)}
                          </span>
                          <span>•</span>
                          <span className="text-amber-800 font-medium">
                            Balance Due: {formatCurrency(inv.balanceDue, activeCurrency)}
                          </span>
                          <span>•</span>
                          <span>Due: {inv.dueDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickFill(inv)}
                          className="rounded border border-[#E5E5E5] bg-white px-2 py-1.5 text-[11px] font-medium text-[#262626] hover:bg-[#F5F5F4]"
                        >
                          Fill Full
                        </button>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={inv.balanceDue}
                            value={currentVal}
                            onChange={(e) => handleAmountChange(inv.id, e.target.value)}
                            placeholder="0.00"
                            className={`w-28 rounded-md border px-2.5 py-1.5 text-xs text-right font-mono focus:outline-none ${
                              isOverInvoice
                                ? "border-red-500 focus:border-red-500"
                                : "border-[#E5E5E5] focus:border-[#171717]"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {isOverInvoice && (
                      <p className="mt-1 text-[11px] text-red-600">
                        Amount exceeds invoice balance due ({formatCurrency(inv.balanceDue, activeCurrency)})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-[#E5E5E5] px-3 py-2 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              totalAllocating <= 0 ||
              remainingAfterAllocation < 0
            }
            className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
          >
            {mutation.isPending
              ? "Allocating..."
              : `Confirm Allocation (${formatCurrency(totalAllocating, activeCurrency)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
