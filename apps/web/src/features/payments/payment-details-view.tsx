"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { getPayment, deallocatePayment } from "@/lib/payments-api";
import { PaymentStatusBadge } from "./payment-status-badge";
import { AllocateFundsModal } from "./allocate-funds-modal";
import { VoidPaymentModal } from "./void-payment-modal";
import type { PaymentAllocation } from "@catering/shared-types";

interface PaymentDetailsViewProps {
  paymentId: string;
  tenantSlug: string;
}

export function PaymentDetailsView({
  paymentId,
  tenantSlug,
}: PaymentDetailsViewProps) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [deallocatingId, setDeallocatingId] = useState<string | null>(null);

  const {
    data: payment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => getPayment(paymentId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!paymentId,
  });

  const deallocateMutation = useMutation({
    mutationFn: (allocationId: string) =>
      deallocatePayment(paymentId, allocationId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDeallocatingId(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to remove allocation");
      setDeallocatingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="loading loading-spinner text-[#171717]" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-8 text-center shadow-xs">
        <h3 className="text-base font-semibold text-[#171717]">
          Payment Not Found
        </h3>
        <p className="mt-1 text-xs text-[#737373]">
          The requested payment record could not be loaded.
        </p>
        <Link
          href={`/tenant/${tenantSlug}/payments`}
          className="mt-4 inline-block text-xs font-medium text-[#171717] underline"
        >
          Return to Payments
        </Link>
      </div>
    );
  }

  const activeCurrency = payment.currency || currencyCode || "INR";
  const percentAllocated =
    payment.amount > 0
      ? Math.min(100, Math.round((payment.allocatedAmount / payment.amount) * 100))
      : 0;

  const methodLabel: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    credit_card: "Credit / Debit Card",
    cheque: "Cheque",
    online: "Online / UPI",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenant/${tenantSlug}/payments`}
            className="rounded border border-[#E5E5E5] bg-white p-1.5 text-xs text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4]"
          >
            ← Back
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#171717] tracking-tight">
                {payment.paymentNumber}
              </h1>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <p className="text-xs text-[#737373] mt-0.5">
              Recorded on {payment.paymentDate}
            </p>
          </div>
        </div>

        {payment.status !== "void" && (
          <div className="flex items-center gap-2">
            {payment.unallocatedAmount > 0 && (
              <button
                type="button"
                onClick={() => setIsAllocateOpen(true)}
                className="rounded-md bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors flex items-center gap-1.5"
              >
                <span>+</span> Allocate Funds
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsVoidOpen(true)}
              className="rounded-md border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              Void Payment
            </button>
          </div>
        )}
      </div>

      {/* Void Notice Banner */}
      {payment.status === "void" && (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-800">
          <div className="flex items-center gap-2 font-semibold text-[#171717]">
            <span>⚠️</span> This payment has been voided
          </div>
          <p className="mt-1 text-[#737373]">
            Voided at: {payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "N/A"}
          </p>
          {payment.voidReason && (
            <p className="mt-1 text-[#262626]">
              <span className="font-medium">Reason:</span> {payment.voidReason}
            </p>
          )}
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Total Payment Received</span>
          <p className="mt-2 text-2xl font-semibold text-[#171717] font-mono">
            {formatCurrency(payment.amount, activeCurrency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-1 block">
            via {methodLabel[payment.paymentMethod] || payment.paymentMethod}
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Allocated to Invoices</span>
          <p className="mt-2 text-2xl font-semibold text-[#171717] font-mono">
            {formatCurrency(payment.allocatedAmount, activeCurrency)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#F5F5F4] overflow-hidden">
              <div
                className="h-full bg-[#171717] rounded-full"
                style={{ width: `${percentAllocated}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-[#737373]">
              {percentAllocated}%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Unallocated Credit Balance</span>
          <p
            className={`mt-2 text-2xl font-semibold font-mono ${
              payment.unallocatedAmount > 0 ? "text-emerald-700" : "text-[#737373]"
            }`}
          >
            {formatCurrency(payment.unallocatedAmount, activeCurrency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-1 block">
            {payment.unallocatedAmount > 0
              ? "Available to allocate to customer invoices"
              : "All funds fully distributed"}
          </span>
        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Details */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wider mb-4 border-b border-[#F0F0F0] pb-2">
            Payment Details
          </h2>
          <dl className="grid grid-cols-2 gap-y-3 text-xs">
            <div>
              <dt className="text-[#737373]">Payment Date</dt>
              <dd className="font-medium text-[#171717] mt-0.5">{payment.paymentDate}</dd>
            </div>
            <div>
              <dt className="text-[#737373]">Payment Method</dt>
              <dd className="font-medium text-[#171717] mt-0.5">
                {methodLabel[payment.paymentMethod] || payment.paymentMethod}
              </dd>
            </div>
            <div>
              <dt className="text-[#737373]">Reference / Txn #</dt>
              <dd className="font-medium text-[#171717] mt-0.5 font-mono">
                {payment.reference || "None specified"}
              </dd>
            </div>
            <div>
              <dt className="text-[#737373]">Currency</dt>
              <dd className="font-medium text-[#171717] mt-0.5">{payment.currency}</dd>
            </div>
            {payment.notes && (
              <div className="col-span-2">
                <dt className="text-[#737373]">Notes & Remarks</dt>
                <dd className="mt-1 text-[#262626] bg-[#FAFAFA] rounded p-2.5 border border-[#F0F0F0]">
                  {payment.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Customer Information */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#F0F0F0] pb-2">
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              Customer Information
            </h2>
            <Link
              href={`/tenant/${tenantSlug}/customers/${payment.customerId}`}
              className="text-xs text-[#171717] hover:underline"
            >
              View Profile →
            </Link>
          </div>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-[#737373]">Customer Name</dt>
              <dd className="font-semibold text-[#171717] text-sm mt-0.5">
                {payment.customerName}
              </dd>
            </div>
            {payment.customerEmail && (
              <div>
                <dt className="text-[#737373]">Email</dt>
                <dd className="text-[#262626] mt-0.5">{payment.customerEmail}</dd>
              </div>
            )}
            {payment.customerPhone && (
              <div>
                <dt className="text-[#737373]">Phone</dt>
                <dd className="text-[#262626] mt-0.5">{payment.customerPhone}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Invoice Allocations Breakdown */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <div>
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              Allocated Invoices ({payment.allocations?.length || 0})
            </h2>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Specific billing invoices against which this payment was applied.
            </p>
          </div>
          {payment.status !== "void" && payment.unallocatedAmount > 0 && (
            <button
              type="button"
              onClick={() => setIsAllocateOpen(true)}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
            >
              + Allocate More
            </button>
          )}
        </div>

        {payment.allocations?.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            No invoices allocated yet. All funds currently remain as unallocated customer credit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium text-right">Invoice Total</th>
                  <th className="px-4 py-3 font-medium text-right">Remaining Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Allocated Amount</th>
                  <th className="px-4 py-3 font-medium">Allocated Date</th>
                  {payment.status !== "void" && (
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {payment.allocations.map((alloc: PaymentAllocation) => (
                  <tr key={alloc.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-medium text-[#171717]">
                      <Link
                        href={`/tenant/${tenantSlug}/invoices/${alloc.invoiceId}`}
                        className="text-[#171717] hover:underline font-mono"
                      >
                        {alloc.invoiceNumber || alloc.invoiceId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#737373]">
                      {alloc.invoiceTitle || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#262626]">
                      {alloc.invoiceTotal !== undefined
                        ? formatCurrency(alloc.invoiceTotal, activeCurrency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#737373]">
                      {alloc.invoiceBalanceDue !== undefined
                        ? formatCurrency(alloc.invoiceBalanceDue, activeCurrency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                      {formatCurrency(alloc.amount, activeCurrency)}
                    </td>
                    <td className="px-4 py-3 text-[#737373]">
                      {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                    </td>
                    {payment.status !== "void" && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Remove allocation of ${formatCurrency(
                                  alloc.amount,
                                  activeCurrency,
                                )} from ${alloc.invoiceNumber || "this invoice"}? Funds will return to unallocated balance.`,
                              )
                            ) {
                              setDeallocatingId(alloc.id);
                              deallocateMutation.mutate(alloc.id);
                            }
                          }}
                          disabled={deallocatingId === alloc.id}
                          className="text-red-600 hover:text-red-800 text-[11px] font-medium"
                        >
                          {deallocatingId === alloc.id ? "Removing..." : "Deallocate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AllocateFundsModal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        paymentId={payment.id}
        paymentNumber={payment.paymentNumber}
        customerId={payment.customerId}
        unallocatedAmount={payment.unallocatedAmount}
        currency={payment.currency}
      />

      <VoidPaymentModal
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        paymentId={payment.id}
        paymentNumber={payment.paymentNumber}
        allocatedAmount={payment.allocatedAmount}
        currency={payment.currency}
      />
    </div>
  );
}
