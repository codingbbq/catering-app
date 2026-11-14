"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { getCurrencySymbol } from "@/lib/currency";
import { recordInvoicePayment } from "@/lib/invoices-api";
import type { InvoicePaymentMethod } from "@catering/shared-types";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  currency: string;
  onSuccess?: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  balanceDue,
  currency,
  onSuccess,
}: RecordPaymentModalProps) {
  const { accessToken } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  const activeCurrency = currency || currencyCode || "INR";
  const activeSymbol = getCurrencySymbol(activeCurrency);

  const [amount, setAmount] = useState<string>(String(balanceDue ?? 0));
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] =
    useState<InvoicePaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid positive payment amount");
      }
      return recordInvoicePayment(
        invoiceId,
        {
          amount: numAmount,
          paymentDate,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        accessToken!,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
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
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-[#171717]">
              Record Payment
            </h3>
            <p className="text-xs text-[#737373]">
              {invoiceNumber} • Remaining balance: {formatCurrency(balanceDue, activeCurrency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] p-1"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Payment Amount ({activeSymbol}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-[#737373]">
                {activeSymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-[#E5E5E5] pl-8 pr-3 py-1.5 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[11px] text-[#737373]">
                Currency: <span className="font-semibold">{activeCurrency} ({activeSymbol})</span>
              </span>
              {balanceDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(balanceDue))}
                  className="text-[11px] text-[#171717] underline hover:text-[#262626]"
                >
                  Pay full balance ({formatCurrency(balanceDue, activeCurrency)})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as InvoicePaymentMethod)
                }
                className="w-full rounded-md border border-[#E5E5E5] px-2 py-1.5 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online / UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / Wire ref # / Cheque #"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="Optional payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {mutation.isPending ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
