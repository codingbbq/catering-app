"use client";

import type {
  CreateQuotationRevisionRequest,
  Quotation,
  QuotationRevision,
  SendQuotationRequest,
  UpdateDraftRevisionRequest,
} from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  acceptQuotation,
  createQuotationRevision,
  rejectQuotation,
  sendQuotation,
  updateDraftRevision,
} from "@/lib/quotations-api";
import { useAuth } from "@/providers/auth-provider";
import { QuotationForm } from "./quotation-form";
import { QuotationStatusBadge } from "./quotation-status-badge";

interface QuotationDetailsViewProps {
  quotation: Quotation;
  tenantSlug: string;
}

export function QuotationDetailsView({
  quotation,
  tenantSlug,
}: QuotationDetailsViewProps) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { formatCurrency, currencySymbol } = useTenantCurrency();

  // Active viewing revision (defaults to current revision)
  const [selectedRevisionNumber, setSelectedRevisionNumber] = useState<number>(
    quotation.currentRevisionNumber,
  );

  // View modes: 'view', 'edit_draft', 'new_revision', 'presentation'
  const [viewMode, setViewMode] = useState<
    "view" | "edit_draft" | "new_revision" | "presentation"
  >("view");

  // Dialogs
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendNotes, setSendNotes] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(
    quotation.customerEmail || "",
  );

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = ["tenant", tenantSlug, "quotation", quotation.id];

  // Selected revision object
  const activeRevision: QuotationRevision =
    quotation.revisions?.find((r) => r.revisionNumber === selectedRevisionNumber) ??
    quotation.currentRevision ??
    quotation.revisions?.[0]!;

  // Previous revision for comparison
  const previousRevision = quotation.revisions?.find(
    (r) => r.revisionNumber === selectedRevisionNumber - 1,
  );

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (dto: SendQuotationRequest) =>
      sendQuotation(quotation.id, dto, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "enquiry"] });
      setShowSendDialog(false);
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      acceptQuotation(quotation.id, activeRevision?.id, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "enquiry"] });
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectQuotation(quotation.id, rejectReason, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "enquiry"] });
      setShowRejectDialog(false);
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const createRevisionMutation = useMutation({
    mutationFn: (dto: CreateQuotationRevisionRequest) =>
      createQuotationRevision(quotation.id, dto, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      setSelectedRevisionNumber(updated.currentRevisionNumber);
      setViewMode("view");
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const updateDraftMutation = useMutation({
    mutationFn: (dto: UpdateDraftRevisionRequest) =>
      updateDraftRevision(quotation.id, activeRevision.id, dto, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      setViewMode("view");
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  // Presentation Mode View (Customer-Ready Clean Printable Quote)
  if (viewMode === "presentation") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Presentation Top Bar */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("view")}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA]"
            >
              ← Back to Details
            </button>
            <span className="text-xs font-semibold text-[#171717]">
              Customer Presentation View (Rev {activeRevision.revisionNumber})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Client-Facing Document Canvas */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-8 sm:p-12 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#E5E5E5] pb-6">
            <div>
              <div className="text-xl font-bold uppercase tracking-tight text-[#171717]">
                Quotation Proposal
              </div>
              <div className="text-xs font-mono text-[#737373] mt-1">
                Ref: {quotation.quotationNumber} • Rev {activeRevision.revisionNumber}
              </div>
            </div>
            <div className="text-right text-xs text-[#737373] space-y-1">
              <div>
                Date:{" "}
                <span className="font-mono text-[#171717]">
                  {new Date(activeRevision.createdAt).toLocaleDateString()}
                </span>
              </div>
              {quotation.validUntil && (
                <div>
                  Valid Until:{" "}
                  <span className="font-mono text-[#171717]">
                    {new Date(quotation.validUntil).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div>
                Status: <span className="font-medium uppercase text-[#171717]">{quotation.status}</span>
              </div>
            </div>
          </div>

          {/* Prepared For & Event Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-[#737373] uppercase tracking-wider text-[11px]">
                Prepared For:
              </div>
              <div className="font-medium text-sm text-[#171717]">{quotation.customerName}</div>
              {quotation.customerEmail && <div className="text-[#737373]">{quotation.customerEmail}</div>}
              {quotation.customerPhone && <div className="text-[#737373]">{quotation.customerPhone}</div>}
            </div>

            <div className="space-y-1 sm:text-right">
              <div className="font-semibold text-[#737373] uppercase tracking-wider text-[11px]">
                Event Reference:
              </div>
              <div className="font-medium text-sm text-[#171717]">{quotation.title}</div>
              <div className="text-[#737373]">Enquiry: {quotation.enquiryTitle}</div>
              {activeRevision.guestCount && (
                <div className="font-mono text-[#171717]">
                  Guest Count: {activeRevision.guestCount} guests
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#171717] text-[#171717] font-semibold">
                  <th className="py-2.5 pr-4">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {activeRevision.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-[#171717]">{it.name}</div>
                      {it.description && (
                        <div className="text-[11px] text-[#737373] mt-0.5">{it.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#171717]">
                      {it.quantity}
                    </td>
                    <td className="py-3 px-3 text-[#737373]">{it.unit}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#171717]">
                      {formatCurrency(it.unitPrice)}
                    </td>
                    <td className="py-3 pl-4 text-right font-mono font-medium text-[#171717]">
                      {formatCurrency(it.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Presentation Totals */}
          <div className="flex justify-end pt-4 border-t border-[#E5E5E5]">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-[#737373]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#171717]">
                  {formatCurrency(activeRevision.subtotal)}
                </span>
              </div>
              {Number(activeRevision.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{formatCurrency(activeRevision.discountAmount)}
                  </span>
                </div>
              )}
              {Number(activeRevision.taxPercent) > 0 && (
                <div className="flex justify-between text-[#737373]">
                  <span>Tax ({activeRevision.taxPercent}%):</span>
                  <span className="font-mono text-[#171717]">
                    {formatCurrency(activeRevision.taxAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#171717] border-t-2 border-[#171717] pt-2">
                <span>Total Amount:</span>
                <span className="font-mono">
                  {formatCurrency(activeRevision.totalAmount)}
                </span>
              </div>
              {activeRevision.pricePerPerson != null && (
                <div className="flex justify-between text-[11px] text-[#737373] pt-1">
                  <span>Price per Guest:</span>
                  <span className="font-mono font-medium text-[#171717]">
                    {formatCurrency(activeRevision.pricePerPerson)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          {(quotation.notes || quotation.terms) && (
            <div className="space-y-4 pt-6 border-t border-[#E5E5E5] text-xs">
              {quotation.notes && (
                <div>
                  <div className="font-semibold text-[#171717] mb-1">Notes:</div>
                  <p className="text-[#737373] whitespace-pre-line">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <div className="font-semibold text-[#171717] mb-1">Terms & Conditions:</div>
                  <p className="text-[#737373] whitespace-pre-line">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={quotation.title}
        description={`Quotation Ref: ${quotation.quotationNumber} • Created for ${quotation.customerName}`}
        backHref={`/tenant/${tenantSlug}/quotations`}
        backLabel="Back to Quotations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Customer Presentation Mode Toggle */}
            <button
              onClick={() => setViewMode("presentation")}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
            >
              Customer View / Print
            </button>

            {/* Edit Draft Revision (if current revision is draft) */}
            {activeRevision.status === "draft" && viewMode === "view" && (
              <button
                onClick={() => setViewMode("edit_draft")}
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
              >
                Edit Draft
              </button>
            )}

            {/* Create New Revision */}
            {quotation.status !== "accepted" && viewMode === "view" && (
              <button
                onClick={() => setViewMode("new_revision")}
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
              >
                + New Revision
              </button>
            )}

            {/* Send Quotation to Customer */}
            {quotation.status !== "accepted" && (
              <button
                onClick={() => setShowSendDialog(true)}
                className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                Send to Customer
              </button>
            )}

            {/* Accept Quotation */}
            {quotation.status !== "accepted" && (
              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {acceptMutation.isPending ? "Accepting..." : "✓ Mark Accepted"}
              </button>
            )}

            {/* Reject Quotation */}
            {quotation.status !== "accepted" && quotation.status !== "rejected" && (
              <button
                onClick={() => setShowRejectDialog(true)}
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
              >
                Reject
              </button>
            )}
          </div>
        }
      />

      {/* Status & Revision Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E5E5E5] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#737373]">Status:</span>
          <QuotationStatusBadge status={quotation.status} />
          <span className="text-xs text-[#737373]">•</span>
          <span className="text-xs font-medium text-[#171717]">
            Active Version: Rev {quotation.currentRevisionNumber}
          </span>
          {activeRevision.revisionNumber !== quotation.currentRevisionNumber && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
              Viewing Historical Rev {activeRevision.revisionNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-[#737373]">
          <div>
            Valid Until:{" "}
            <span className="font-mono text-[#262626]">
              {quotation.validUntil
                ? new Date(quotation.validUntil).toLocaleDateString()
                : "No expiry"}
            </span>
          </div>
          <div>
            Created:{" "}
            <span className="font-mono text-[#262626]">
              {new Date(quotation.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Send to Client Dialog */}
      {showSendDialog && (
        <div className="rounded-lg border border-neutral-300 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#171717]">
              Send Quotation {quotation.quotationNumber} (Rev {activeRevision.revisionNumber})
            </h4>
            <button
              onClick={() => setShowSendDialog(false)}
              className="text-xs text-[#737373] hover:text-[#171717]"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[#737373]">
            This will record the proposal as sent to the client, update the enquiry status to
            &quot;Proposal Sent&quot;, and log a delivery activity in the CRM timeline.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Cover Note / Message
              </label>
              <textarea
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                rows={2}
                placeholder="Thank you for considering our catering services..."
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowSendDialog(false)}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                sendMutation.mutate({
                  revisionId: activeRevision.id,
                  recipientEmail: recipientEmail || undefined,
                  sendNotes: sendNotes || undefined,
                })
              }
              disabled={sendMutation.isPending}
              className="rounded bg-[#171717] px-4 py-1 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {sendMutation.isPending ? "Sending..." : "Confirm & Send"}
            </button>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-red-900">Mark Quotation as Rejected</h4>
          <p className="text-xs text-red-700">
            Provide the reason for quotation rejection for sales analytics and future follow-up.
          </p>
          <input
            type="text"
            placeholder="Reason (e.g. Budget constraints, selected competitor)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full rounded border border-red-200 bg-white px-3 py-1.5 text-xs text-[#171717]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowRejectDialog(false)}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {rejectMutation.isPending ? "Saving..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}

      {/* Revision Form Modes */}
      {viewMode === "new_revision" && (
        <QuotationForm
          mode="create_revision"
          initialValues={{
            menuId: activeRevision.menuId ?? null,
            costSheetId: activeRevision.costSheetId ?? null,
            guestCount: activeRevision.guestCount ?? null,
            taxPercent: activeRevision.taxPercent,
            discountAmount: activeRevision.discountAmount,
            changeSummary: "",
            items: activeRevision.items.map((it) => ({
              name: it.name,
              description: it.description,
              category: it.category,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: it.unitPrice,
              unitCost: it.unitCost,
              sortOrder: it.sortOrder,
            })),
          }}
          onSubmit={async (data) => {
            await createRevisionMutation.mutateAsync(data);
          }}
          isSubmitting={createRevisionMutation.isPending}
          onCancel={() => setViewMode("view")}
        />
      )}

      {viewMode === "edit_draft" && (
        <QuotationForm
          mode="edit_draft_revision"
          initialValues={{
            menuId: activeRevision.menuId ?? null,
            costSheetId: activeRevision.costSheetId ?? null,
            guestCount: activeRevision.guestCount ?? null,
            taxPercent: activeRevision.taxPercent,
            discountAmount: activeRevision.discountAmount,
            changeSummary: activeRevision.changeSummary || "",
            items: activeRevision.items.map((it) => ({
              name: it.name,
              description: it.description,
              category: it.category,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: it.unitPrice,
              unitCost: it.unitCost,
              sortOrder: it.sortOrder,
            })),
          }}
          onSubmit={async (data) => {
            await updateDraftMutation.mutateAsync(data);
          }}
          isSubmitting={updateDraftMutation.isPending}
          onCancel={() => setViewMode("view")}
        />
      )}

      {/* Standard Detail View Mode */}
      {viewMode === "view" && (
        <div className="space-y-6">
          {/* Revisions History Tabs */}
          <div className="border-b border-[#E5E5E5] pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#171717]">
                Commercial Revision History ({quotation.revisions?.length ?? 1} versions)
              </span>
              <span className="text-[11px] text-[#737373]">
                Click any revision to inspect immutable snapshot
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {quotation.revisions?.map((rev) => {
                const isSelected = rev.revisionNumber === selectedRevisionNumber;
                return (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedRevisionNumber(rev.revisionNumber)}
                    className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors border ${
                      isSelected
                        ? "border-[#171717] bg-[#171717] text-white font-medium"
                        : "border-[#E5E5E5] bg-white text-[#262626] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <span>Rev {rev.revisionNumber}</span>
                    <span
                      className={`text-[10px] uppercase font-mono px-1 py-0.2 rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-[#737373]"
                      }`}
                    >
                      {rev.status}
                    </span>
                    <span className="font-mono text-[11px]">
                      {formatCurrency(rev.totalAmount, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Revision Summary Bar */}
          <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-[#171717]">
                Revision {activeRevision.revisionNumber}: &quot;{activeRevision.changeSummary}&quot;
              </div>
              <div className="text-[11px] text-[#737373]">
                Prepared on {new Date(activeRevision.createdAt).toLocaleDateString()}
                {activeRevision.menuName && ` • Sourced from Menu: ${activeRevision.menuName}`}
                {activeRevision.costSheetName && ` • Linked Cost Sheet: ${activeRevision.costSheetName}`}
              </div>
            </div>

            {/* Quick comparison indicator with previous version */}
            {previousRevision && (
              <div className="text-[11px] text-[#737373] bg-white border border-[#E5E5E5] px-2.5 py-1 rounded">
                Diff vs Rev {previousRevision.revisionNumber}:{" "}
                <span
                  className={`font-mono font-medium ${
                    Number(activeRevision.totalAmount) >= Number(previousRevision.totalAmount)
                      ? "text-neutral-900"
                      : "text-amber-700"
                  }`}
                >
                  {Number(activeRevision.totalAmount) - Number(previousRevision.totalAmount) >= 0 ? "+" : ""}
                  {formatCurrency(Number(activeRevision.totalAmount) - Number(previousRevision.totalAmount))}
                </span>
              </div>
            )}
          </div>

          {/* Main Grid: Line Items & Commercial Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Line Items Table */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Line Items Breakdown</CardTitle>
                    <span className="text-xs text-[#737373]">
                      {activeRevision.items.length} item{activeRevision.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded border border-[#E5E5E5]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373]">
                        <tr>
                          <th className="px-3 py-2.5 font-medium">Item & Description</th>
                          <th className="px-3 py-2.5 font-medium">Category</th>
                          <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                          <th className="px-3 py-2.5 font-medium text-right">Unit Price</th>
                          <th className="px-3 py-2.5 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0]">
                        {activeRevision.items.map((it) => (
                          <tr key={it.id} className="hover:bg-[#FAFAFA]/60">
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-[#171717]">{it.name}</div>
                              {it.description && (
                                <div className="text-[11px] text-[#737373] mt-0.5">{it.description}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-[#737373]">{it.category}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-[#171717]">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[#171717]">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#171717]">
                              {formatCurrency(it.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Notes and Terms Card */}
              {(quotation.notes || quotation.terms) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Notes & Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    {quotation.notes && (
                      <div>
                        <span className="font-semibold text-[#171717]">Special Notes:</span>
                        <p className="text-[#737373] mt-1 whitespace-pre-line">{quotation.notes}</p>
                      </div>
                    )}
                    {quotation.terms && (
                      <div className="border-t border-[#E5E5E5] pt-3">
                        <span className="font-semibold text-[#171717]">Payment & Contract Terms:</span>
                        <p className="text-[#737373] mt-1 whitespace-pre-line">{quotation.terms}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Financial Breakdown & Context Cards */}
            <div className="lg:col-span-1 space-y-6">
              {/* Financial Summary Box */}
              <Card>
                <CardHeader>
                  <CardTitle>Commercial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs text-[#737373]">
                    <span>Items Subtotal:</span>
                    <span className="font-mono text-[#171717]">
                      {formatCurrency(activeRevision.subtotal)}
                    </span>
                  </div>

                  {Number(activeRevision.discountAmount) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono">
                        -{formatCurrency(activeRevision.discountAmount)}
                      </span>
                    </div>
                  )}

                  {Number(activeRevision.taxPercent) > 0 && (
                    <div className="flex justify-between text-xs text-[#737373]">
                      <span>Tax ({activeRevision.taxPercent}%):</span>
                      <span className="font-mono text-[#171717]">
                        {formatCurrency(activeRevision.taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E5E5E5] flex justify-between text-sm font-semibold text-[#171717]">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-[#171717]">
                      {formatCurrency(activeRevision.totalAmount)}
                    </span>
                  </div>

                  {activeRevision.pricePerPerson != null && (
                    <div className="flex justify-between text-xs text-[#737373] pt-1">
                      <span>Price / Guest:</span>
                      <span className="font-mono font-medium text-[#171717]">
                        {formatCurrency(activeRevision.pricePerPerson)}
                      </span>
                    </div>
                  )}

                  {/* Internal Team Cost & Margin Analysis */}
                  {activeRevision.estimatedCost != null && (
                    <div className="mt-4 pt-3 border-t border-[#E5E5E5] bg-[#FAFAFA] p-3 rounded space-y-1.5 text-xs">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                        Internal Margin Analysis
                      </div>
                      <div className="flex justify-between text-[#737373]">
                        <span>Estimated Cost:</span>
                        <span className="font-mono text-[#171717]">
                          {formatCurrency(activeRevision.estimatedCost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#737373]">
                        <span>Estimated Margin:</span>
                        <span
                          className={`font-mono font-semibold ${
                            (activeRevision.estimatedMarginPercent ?? 0) >= 30
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {activeRevision.estimatedMarginPercent != null
                            ? `${Number(activeRevision.estimatedMarginPercent).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked Enquiry & Customer Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Linked Enquiry & Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <div className="text-[11px] font-medium text-[#737373]">Customer:</div>
                    <Link
                      href={`/tenant/${tenantSlug}/customers/${quotation.customerId}`}
                      className="font-medium text-[#171717] hover:underline"
                    >
                      {quotation.customerName} →
                    </Link>
                    <div className="text-[#737373] mt-0.5">
                      {quotation.customerEmail || "No email"} • {quotation.customerPhone || "No phone"}
                    </div>
                  </div>

                  <div className="border-t border-[#E5E5E5] pt-3">
                    <div className="text-[11px] font-medium text-[#737373]">CRM Enquiry:</div>
                    <Link
                      href={`/tenant/${tenantSlug}/enquiries/${quotation.enquiryId}`}
                      className="font-medium text-[#171717] hover:underline"
                    >
                      {quotation.enquiryTitle} →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
