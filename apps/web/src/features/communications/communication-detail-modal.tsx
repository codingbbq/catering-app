"use client";

import type { CommunicationItem } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { retryCommunication } from "@/lib/communications-api";
import { CommunicationChannelBadge } from "./communication-channel-badge";
import { CommunicationStatusBadge } from "./communication-status-badge";

interface CommunicationDetailModalProps {
  item: CommunicationItem | null;
  tenantSlug: string;
  onClose: () => void;
  onUpdated?: (() => void) | undefined;
}

export function CommunicationDetailModal({
  item,
  tenantSlug,
  onClose,
  onUpdated,
}: CommunicationDetailModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [retryError, setRetryError] = useState<string | null>(null);

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!item || !accessToken) throw new Error("Missing item or token");
      return retryCommunication(item.id, accessToken);
    },
    onSuccess: () => {
      setRetryError(null);
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      queryClient.invalidateQueries({ queryKey: ["communication-stats"] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => {
      setRetryError(err.message || "Failed to retry delivery.");
    },
  });

  if (!item) return null;

  const canRetry = item.status === "failed" || item.status === "pending";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-[#E5E5E5] bg-white shadow-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <div className="flex items-center gap-3">
            <CommunicationChannelBadge channel={item.channel} />
            <CommunicationStatusBadge status={item.status} />
            <span className="text-xs text-[#737373] uppercase tracking-wider font-mono">
              {item.direction}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {retryError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {retryError}
            </div>
          )}

          {/* Subject & Recipient Info */}
          <div className="space-y-3">
            {item.subject && (
              <h3 className="text-base font-semibold text-[#171717]">
                {item.subject}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                <span className="text-[#737373] block font-medium">Recipient</span>
                <span className="font-semibold text-[#171717] break-all">{item.recipient}</span>
                {item.customer && (
                  <span className="text-[#737373] block text-[11px]">
                    Customer: {item.customer.name}
                  </span>
                )}
              </div>
              <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                <span className="text-[#737373] block font-medium">Sender</span>
                <span className="font-semibold text-[#171717]">{item.sender || "System Dispatch"}</span>
                <span className="text-[#737373] block text-[11px]">
                  Provider: {item.provider || "Standard Provider"}
                </span>
              </div>
            </div>
          </div>

          {/* Message Text */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Message Content
            </span>
            <div className="rounded-md border border-[#E5E5E5] bg-[#F5F5F4]/60 p-4 text-xs text-[#262626] whitespace-pre-wrap leading-relaxed font-sans">
              {item.content}
            </div>
          </div>

          {/* Linked Business Context */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Linked Context Records
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {item.customer && (
                <Link
                  href={`/tenant/${tenantSlug}/customers/${item.customer.id}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] hover:border-[#171717] transition-colors"
                >
                  <span className="text-[#737373]">Customer:</span>
                  <span className="font-medium">{item.customer.name}</span>
                </Link>
              )}
              {item.enquiry && (
                <Link
                  href={`/tenant/${tenantSlug}/enquiries/${item.enquiry.id}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] hover:border-[#171717] transition-colors"
                >
                  <span className="text-[#737373]">Enquiry:</span>
                  <span className="font-medium">{item.enquiry.title}</span>
                </Link>
              )}
              {item.quotation && (
                <Link
                  href={`/tenant/${tenantSlug}/quotations/${item.quotation.id}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] hover:border-[#171717] transition-colors"
                >
                  <span className="text-[#737373]">Quotation:</span>
                  <span className="font-medium font-mono">{item.quotation.quotationNumber}</span>
                </Link>
              )}
              {item.booking && (
                <Link
                  href={`/tenant/${tenantSlug}/bookings/${item.booking.id}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] hover:border-[#171717] transition-colors"
                >
                  <span className="text-[#737373]">Booking:</span>
                  <span className="font-medium font-mono">{item.booking.bookingNumber}</span>
                </Link>
              )}
              {!item.customer && !item.enquiry && !item.quotation && !item.booking && (
                <span className="text-[#737373] text-xs">Direct communication (no linked entity)</span>
              )}
            </div>
          </div>

          {/* Delivery & Provider Diagnostics */}
          <div className="space-y-2 border-t border-[#E5E5E5] pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Delivery Tracking & Metadata
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded border border-[#E5E5E5] p-2 bg-[#FAFAFA]">
                <span className="text-[#737373] text-[11px] block">Created At</span>
                <span className="font-medium text-[#171717]">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="rounded border border-[#E5E5E5] p-2 bg-[#FAFAFA]">
                <span className="text-[#737373] text-[11px] block">Sent At</span>
                <span className="font-medium text-[#171717]">
                  {item.sentAt ? new Date(item.sentAt).toLocaleString() : "Not sent yet"}
                </span>
              </div>
              <div className="rounded border border-[#E5E5E5] p-2 bg-[#FAFAFA]">
                <span className="text-[#737373] text-[11px] block">Delivered At</span>
                <span className="font-medium text-[#171717]">
                  {item.deliveredAt ? new Date(item.deliveredAt).toLocaleString() : "Pending"}
                </span>
              </div>
              <div className="rounded border border-[#E5E5E5] p-2 bg-[#FAFAFA]">
                <span className="text-[#737373] text-[11px] block">Retry Attempts</span>
                <span className="font-medium text-[#171717]">{item.retryCount}</span>
              </div>
            </div>

            {item.providerMessageId && (
              <div className="text-[11px] text-[#737373] font-mono">
                Provider Reference ID: {item.providerMessageId}
              </div>
            )}

            {item.errorMessage && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
                <span className="font-semibold block">Delivery Failure Reason:</span>
                <p>{item.errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#FAFAFA] px-6 py-3">
          <div className="text-xs text-[#737373] font-mono">
            ID: {item.id.slice(0, 8)}...
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors"
            >
              Close
            </button>
            {canRetry && (
              <button
                type="button"
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                {retryMutation.isPending ? "Retrying..." : "Retry Delivery"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
