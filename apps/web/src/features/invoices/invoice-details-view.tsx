"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenant, useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { getCurrencySymbol } from "@/lib/currency";
import { issueInvoice, deleteDraftInvoice } from "@/lib/invoices-api";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { RecordPaymentModal } from "./record-payment-modal";
import { VoidInvoiceModal } from "./void-invoice-modal";
import type { InvoiceDetail } from "@catering/shared-types";

interface InvoiceDetailsViewProps {
  invoice: InvoiceDetail;
  tenantSlug: string;
}

export function InvoiceDetailsView({
  invoice,
  tenantSlug,
}: InvoiceDetailsViewProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { profile } = useTenant();
  const { formatCurrency, currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  const invoiceCurrency = invoice.currency || currencyCode || "INR";
  const invoiceSymbol = getCurrencySymbol(invoiceCurrency);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Issue Invoice Mutation
  const issueMutation = useMutation({
    mutationFn: () => issueInvoice(invoice.id, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to issue invoice");
    },
  });

  // Delete Draft Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteDraftInvoice(invoice.id, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      router.push(`/tenant/${tenantSlug}/invoices`);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to delete draft invoice");
    },
  });

  const isDraft = invoice.status === "draft";
  const isVoid = invoice.status === "void";
  const isPaid = invoice.status === "paid";
  const canRecordPayment = !isVoid && !isPaid;
  const canVoid = !isVoid && invoice.paidAmount === 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenant/${tenantSlug}/invoices`}
            className="rounded-md border border-[#E5E5E5] bg-white p-2 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
          >
            ← Back to Invoices
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#171717]">
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge
                status={invoice.status}
                isOverdue={invoice.isOverdue}
              />
            </div>
            <p className="text-xs text-[#737373]">{invoice.title}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / PDF
          </button>

          {/* Send via Communication */}
          <Link
            href={`/tenant/${tenantSlug}/communications?entityType=invoice&entityId=${invoice.id}`}
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send Email
          </Link>

          {/* Draft Actions */}
          {isDraft && (
            <>
              <Link
                href={`/tenant/${tenantSlug}/invoices/${invoice.id}/edit`}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
              >
                Edit Draft
              </Link>
              <button
                type="button"
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="rounded-md bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
              >
                {issueMutation.isPending ? "Issuing..." : "Issue Invoice"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this draft invoice?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Delete Draft
              </button>
            </>
          )}

          {/* Record Payment Action */}
          {canRecordPayment && !isDraft && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="rounded-md bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              Record Payment
            </button>
          )}

          {/* Void Action */}
          {canVoid && !isDraft && (
            <button
              type="button"
              onClick={() => setShowVoidModal(true)}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Void Invoice
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 p-4 text-xs text-red-700 border border-red-200 print:hidden">
          {actionError}
        </div>
      )}

      {/* Printable Invoice Document */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-8 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-8 border-b border-[#E5E5E5]">
          <div>
            <div className="text-lg font-bold text-[#171717]">
              {profile?.displayName || "Catering Services"}
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Commercial Sales & Catering Management
            </p>
          </div>

          <div className="sm:text-right">
            <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
              INVOICE
            </h2>
            <p className="font-mono text-sm font-semibold text-[#171717] mt-0.5">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2 inline-block">
              <InvoiceStatusBadge
                status={invoice.status}
                isOverdue={invoice.isOverdue}
              />
            </div>
          </div>
        </div>

        {/* Parties & Dates Meta */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 py-6 border-b border-[#E5E5E5]">
          {/* Billed To */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
              Billed To
            </h3>
            <div className="text-sm font-semibold text-[#171717]">
              {invoice.customer.name}
            </div>
            {invoice.customer.company && (
              <div className="text-xs text-[#737373]">
                {invoice.customer.company}
              </div>
            )}
            {invoice.customer.email && (
              <div className="text-xs text-[#737373] mt-1">
                {invoice.customer.email}
              </div>
            )}
            {invoice.customer.phone && (
              <div className="text-xs text-[#737373]">
                {invoice.customer.phone}
              </div>
            )}
            {invoice.customer.address && (
              <div className="text-xs text-[#737373] mt-1">
                {invoice.customer.address}
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="sm:text-right text-xs space-y-1.5">
            <div>
              <span className="text-[#737373]">Issue Date: </span>
              <span className="font-medium text-[#171717]">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-[#737373]">Due Date: </span>
              <span className="font-medium text-[#171717]">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </span>
            </div>
            {invoice.booking && (
              <div>
                <span className="text-[#737373]">Booking Ref: </span>
                <Link
                  href={`/tenant/${tenantSlug}/bookings/${invoice.booking.id}`}
                  className="font-mono font-medium text-[#171717] hover:underline"
                >
                  {invoice.booking.bookingNumber} ({invoice.booking.title})
                </Link>
              </div>
            )}
            <div>
              <span className="text-[#737373]">Currency: </span>
              <span className="font-mono font-semibold text-[#171717]">
                {invoiceCurrency} ({invoiceSymbol})
              </span>
            </div>
            {invoice.voidReason && (
              <div className="pt-2 text-red-600 font-medium">
                Void Reason: {invoice.voidReason}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-[#737373]">
                <th className="pb-3 font-medium w-12">#</th>
                <th className="pb-3 font-medium">Item & Description</th>
                <th className="pb-3 font-medium w-20 text-center">Qty</th>
                <th className="pb-3 font-medium w-28 text-right">Unit Price</th>
                <th className="pb-3 font-medium w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {invoice.lineItems.map((item, index) => (
                <tr key={item.id} className="align-top py-3">
                  <td className="py-3 text-[#737373]">{index + 1}</td>
                  <td className="py-3">
                    <div className="font-medium text-[#171717]">
                      {item.description}
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-[#737373] mt-0.5">
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right font-mono text-[#737373]">
                    {formatCurrency(item.unitPrice, invoiceCurrency)}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-[#171717]">
                    {formatCurrency(item.totalAmount, invoiceCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Box */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 border-t border-[#E5E5E5] pt-6">
          {/* Notes & Terms */}
          <div className="w-full sm:w-1/2 space-y-4 text-xs">
            {invoice.notes && (
              <div>
                <h4 className="font-semibold text-[#171717] mb-1">Notes</h4>
                <p className="text-[#737373] whitespace-pre-line leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className="font-semibold text-[#171717] mb-1">
                  Payment Instructions & Terms
                </h4>
                <p className="text-[#737373] whitespace-pre-line leading-relaxed">
                  {invoice.terms}
                </p>
              </div>
            )}
          </div>

          {/* Totals Table */}
          <div className="w-full sm:w-80 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] p-5 text-xs space-y-2.5">
            <div className="flex justify-between text-[#737373]">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-[#171717]">
                {formatCurrency(invoice.subtotal, invoiceCurrency)}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-[#737373]">
                <span>Discount:</span>
                <span className="font-mono text-emerald-700">
                  - {formatCurrency(invoice.discountAmount, invoiceCurrency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#737373]">
              <span>Tax ({invoice.taxRate}%):</span>
              <span className="font-mono font-medium text-[#171717]">
                {formatCurrency(invoice.taxAmount, invoiceCurrency)}
              </span>
            </div>
            <div className="border-t border-[#E5E5E5] pt-2.5 flex justify-between text-sm font-semibold text-[#171717]">
              <span>Total Invoiced:</span>
              <span className="font-mono text-base">
                {formatCurrency(invoice.totalAmount, invoiceCurrency)}
              </span>
            </div>
            <div className="border-t border-[#E5E5E5] pt-2 flex justify-between text-[#737373]">
              <span>Amount Paid:</span>
              <span className="font-mono font-medium text-emerald-700">
                {formatCurrency(invoice.paidAmount, invoiceCurrency)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1">
              <span className={invoice.balanceDue > 0 ? "text-[#171717]" : "text-emerald-700"}>
                Balance Due:
              </span>
              <span
                className={`font-mono text-base ${
                  invoice.balanceDue > 0
                    ? invoice.isOverdue
                      ? "text-red-600"
                      : "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {formatCurrency(invoice.balanceDue, invoiceCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History Section */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-8 border-t border-[#E5E5E5] pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] mb-3">
              Payment Transactions ({invoice.payments.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-[#737373] bg-[#FAFAFA]">
                    <th className="py-2.5 px-3 font-medium">Payment Date</th>
                    <th className="py-2.5 px-3 font-medium">Method</th>
                    <th className="py-2.5 px-3 font-medium">Reference</th>
                    <th className="py-2.5 px-3 font-medium">Notes</th>
                    <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-mono text-[#171717]">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-[#171717]">
                        {p.paymentMethod.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#737373]">
                        {p.reference || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-[#737373]">
                        {p.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(p.amount, invoiceCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        balanceDue={invoice.balanceDue}
        currency={invoiceCurrency}
      />

      {/* Void Modal */}
      <VoidInvoiceModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
      />
    </div>
  );
}
