"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { voidPayment } from "@/lib/payments-api";

interface VoidPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string;
  paymentNumber: string;
  allocatedAmount: number;
  currency?: string;
  onSuccess?: () => void;
}

export function VoidPaymentModal({
  isOpen,
  onClose,
  paymentId,
  paymentNumber,
  allocatedAmount,
  currency,
  onSuccess,
}: VoidPaymentModalProps) {
  const { accessToken } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  const [voidReason, setVoidReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!voidReason.trim()) {
        throw new Error("Please provide a reason for voiding this payment");
      }
      return voidPayment(paymentId, { voidReason: voidReason.trim() }, accessToken!);
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
      setErrorMessage(err.message || "Failed to void payment");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-[#171717]">
              Void Payment
            </h3>
            <p className="text-xs text-[#737373]">{paymentNumber}</p>
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

        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-medium">Warning: Irreversible Action</p>
            <p>
              Voiding this payment will cancel the transaction record and immediately
              reverse all allocations totaling{" "}
              <span className="font-semibold">
                {formatCurrency(allocatedAmount, currency || currencyCode)}
              </span>
              . Linked invoices will automatically have their outstanding balances restored.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g., Cheque returned unpaid, duplicate payment entry, customer requested refund..."
              rows={3}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>
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
            disabled={mutation.isPending || !voidReason.trim()}
            className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Voiding..." : "Confirm & Void Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
