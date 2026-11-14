"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listCustomers } from "@/lib/customers-api";
import { listInvoices } from "@/lib/invoices-api";
import { createPayment } from "@/lib/payments-api";
import type { InvoiceListItem, PaymentMethod } from "@catering/shared-types";

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  onSuccess?: () => void;
}

export function PaymentRecordModal({
  isOpen,
  onClose,
  initialCustomerId,
  onSuccess,
}: PaymentRecordModalProps) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency, currencyCode, currencySymbol } = useTenantCurrency();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initialCustomerId if passed
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Fetch customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => listCustomers(accessToken!, { isActive: true }),
    enabled: isOpen && isAuthenticated && isTenant && !!accessToken,
  });

  // Fetch customer's outstanding invoices
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

  // Total amount parsed
  const numAmount = parseFloat(amount) || 0;

  // Total allocated
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? sum : sum + parsed;
    }, 0);
  }, [allocations]);

  const remainingUnallocated = Math.round((numAmount - totalAllocated) * 100) / 100;

  const handleAllocationChange = (invoiceId: string, val: string) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  const handleAutoDistribute = () => {
    if (numAmount <= 0) return;
    let available = numAmount;
    const newAllocs: Record<string, string> = {};

    for (const inv of eligibleInvoices) {
      if (available <= 0) break;
      const take = Math.min(inv.balanceDue, available);
      newAllocs[inv.id] = take.toFixed(2);
      available = Math.max(0, Math.round((available - take) * 100) / 100);
    }

    setAllocations(newAllocs);
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!customerId) {
        throw new Error("Please select a customer");
      }
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid payment amount greater than zero");
      }

      const itemsToAllocate: Array<{ invoiceId: string; amount: number }> = [];
      for (const [invId, amountStr] of Object.entries(allocations)) {
        const amt = parseFloat(amountStr);
        if (!isNaN(amt) && amt > 0) {
          itemsToAllocate.push({
            invoiceId: invId,
            amount: Math.round(amt * 100) / 100,
          });
        }
      }

      if (totalAllocated > numAmount) {
        throw new Error(
          `Allocated total (${formatCurrency(totalAllocated, currencyCode)}) exceeds payment amount (${formatCurrency(numAmount, currencyCode)})`,
        );
      }

      return createPayment(
        {
          customerId,
          amount: Math.round(numAmount * 100) / 100,
          currency: currencyCode,
          paymentDate,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          allocations: itemsToAllocate.length > 0 ? itemsToAllocate : undefined,
        },
        accessToken!,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to record payment");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-[#171717]">
              Record Customer Payment
            </h3>
            <p className="text-xs text-[#737373]">
              Record receipt of funds and optionally allocate across customer invoices.
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

        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setAllocations({});
              }}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
            >
              <option value="">Select customer...</option>
              {customersData?.data?.map((cust: any) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} {cust.email ? `(${cust.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Amount & Currency & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Payment Amount ({currencySymbol || currencyCode}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-[#E5E5E5] pl-8 pr-3 py-2 text-xs font-mono focus:border-[#171717] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/Wire)</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit / Debit Card</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online / UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Reference / Transaction #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR12345678, CHQ-998822"
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal memo, customer remarks..."
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>

          {/* Invoice Allocation Section */}
          {customerId && (
            <div className="mt-4 border-t border-[#E5E5E5] pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-[#171717]">
                    Invoice Allocations (Optional)
                  </h4>
                  <p className="text-[11px] text-[#737373]">
                    Allocate payment to invoices now, or leave as unallocated customer credit.
                  </p>
                </div>
                {eligibleInvoices.length > 0 && numAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoDistribute}
                    className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#F5F5F4]"
                  >
                    Auto-Distribute
                  </button>
                )}
              </div>

              {/* Allocation Stats Strip */}
              {numAmount > 0 && (
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-2.5 text-xs mb-3">
                  <div>
                    <span className="text-[#737373] block text-[11px]">Total Payment</span>
                    <span className="font-semibold text-[#171717]">
                      {formatCurrency(numAmount, currencyCode)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[11px]">Allocated</span>
                    <span className={`font-semibold ${totalAllocated > numAmount ? "text-red-600" : "text-[#171717]"}`}>
                      {formatCurrency(totalAllocated, currencyCode)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[11px]">Unallocated Credit</span>
                    <span className={`font-semibold ${remainingUnallocated < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {formatCurrency(remainingUnallocated, currencyCode)}
                    </span>
                  </div>
                </div>
              )}

              {isLoadingInvoices ? (
                <div className="py-4 text-center text-xs text-[#737373]">
                  Loading invoices...
                </div>
              ) : eligibleInvoices.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#E5E5E5] p-4 text-center text-xs text-[#737373]">
                  No outstanding invoices found for this customer. Payment will be saved as unallocated customer credit.
                </div>
              ) : (
                <div className="space-y-2">
                  {eligibleInvoices.map((inv: InvoiceListItem) => {
                    const currentVal = allocations[inv.id] || "";
                    const numVal = parseFloat(currentVal);
                    const isOver = !isNaN(numVal) && numVal > inv.balanceDue;

                    return (
                      <div
                        key={inv.id}
                        className={`rounded-lg border p-2.5 transition-colors ${
                          numVal > 0 ? "border-[#171717] bg-[#FAFAFA]" : "border-[#E5E5E5] bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-[#171717]">
                                {inv.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-[#737373] truncate">
                                {inv.title}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#737373] mt-0.5">
                              Due: {inv.dueDate} • Balance:{" "}
                              <span className="font-medium text-amber-800">
                                {formatCurrency(inv.balanceDue, currencyCode)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const currentOthers = Object.entries(allocations).reduce(
                                  (s, [id, v]) => (id === inv.id ? s : s + (parseFloat(v) || 0)),
                                  0,
                                );
                                const avail = Math.max(0, numAmount - currentOthers);
                                const toAlloc = Math.min(inv.balanceDue, avail > 0 ? avail : inv.balanceDue);
                                handleAllocationChange(inv.id, toAlloc > 0 ? toAlloc.toFixed(2) : "");
                              }}
                              className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-[10px] font-medium text-[#262626] hover:bg-[#F5F5F4]"
                            >
                              Max
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={inv.balanceDue}
                              value={currentVal}
                              onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                              placeholder="0.00"
                              className={`w-24 rounded-md border px-2 py-1 text-xs text-right font-mono focus:outline-none ${
                                isOver
                                  ? "border-red-500"
                                  : "border-[#E5E5E5] focus:border-[#171717]"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              !customerId ||
              numAmount <= 0 ||
              totalAllocated > numAmount
            }
            className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
          >
            {mutation.isPending ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
