"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { voidInvoice } from "@/lib/invoices-api";

interface VoidInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  onSuccess?: () => void;
}

export function VoidInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  onSuccess,
}: VoidInvoiceModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [voidReason, setVoidReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!voidReason.trim()) {
        throw new Error("Please specify a reason for voiding this invoice");
      }
      return voidInvoice(invoiceId, { voidReason: voidReason.trim() }, accessToken!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to void invoice");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-red-600">
              Void Invoice {invoiceNumber}
            </h3>
            <p className="text-xs text-[#737373] mt-0.5">
              This action cancels the invoice and marks it as void in your records.
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
              Reason for Voiding *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Booking cancelled, duplicate invoice generated, clerical error..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
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
              className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Voiding..." : "Confirm Void"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
