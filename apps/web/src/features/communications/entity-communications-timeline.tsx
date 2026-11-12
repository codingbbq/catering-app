"use client";

import type { CommunicationItem } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { listCommunications } from "@/lib/communications-api";
import { CommunicationChannelBadge } from "./communication-channel-badge";
import { CommunicationComposerModal } from "./communication-composer-modal";
import { CommunicationDetailModal } from "./communication-detail-modal";
import { CommunicationStatusBadge } from "./communication-status-badge";

interface EntityCommunicationsTimelineProps {
  tenantSlug: string;
  entityType: "enquiry" | "quotation" | "booking" | "customer";
  entityId: string;
  entityLabel?: string;
  customerName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  quotationNumber?: string;
  bookingNumber?: string;
  eventDate?: string;
  venue?: string;
  amount?: number;
}

export function EntityCommunicationsTimeline({
  tenantSlug,
  entityType,
  entityId,
  entityLabel,
  customerName,
  recipientEmail,
  recipientPhone,
  quotationNumber,
  bookingNumber,
  eventDate,
  venue,
  amount,
}: EntityCommunicationsTimelineProps) {
  const { accessToken } = useAuth();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["entity-communications", entityType, entityId],
    queryFn: () =>
      listCommunications(accessToken!, {
        entityType,
        entityId,
        limit: 50,
      }),
    enabled: !!accessToken && !!entityId,
  });

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Communication History
          </h4>
          <span className="rounded-full bg-[#E5E5E5] px-2 py-0.5 text-[11px] font-mono text-[#737373]">
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Send Message
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 text-center text-xs text-[#737373]">
          Loading communications...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-8 text-center text-xs text-[#737373] space-y-2">
          <p>No communications recorded for this record yet.</p>
          <p className="text-[11px] text-[#A3A3A3]">
            Send an email, SMS, WhatsApp update, or log an internal memo.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-[#E5E5E5] ml-3 space-y-4 py-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative pl-6 cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              {/* Dot */}
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-[#171717]" />

              <div className="rounded-lg border border-[#E5E5E5] bg-white p-3.5 space-y-2 group-hover:border-[#171717] transition-colors shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CommunicationChannelBadge channel={item.channel} />
                    <CommunicationStatusBadge status={item.status} />
                  </div>
                  <span className="text-[11px] text-[#A3A3A3] font-mono">
                    {new Date(item.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#171717]">To: {item.recipient}</span>
                    <span className="text-[11px] text-[#737373]">
                      {item.sender ? `From: ${item.sender}` : ""}
                    </span>
                  </div>
                  {item.subject && (
                    <div className="font-semibold text-[#171717] mt-1">
                      {item.subject}
                    </div>
                  )}
                  <p className="text-[#737373] mt-1 line-clamp-3 whitespace-pre-line leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {item.errorMessage && (
                  <div className="rounded bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] text-rose-800">
                    Failed: {item.errorMessage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer Modal */}
      {isComposerOpen && (
        <CommunicationComposerModal
          tenantSlug={tenantSlug}
          initialContext={{
            type: entityType,
            id: entityId,
            label: entityLabel,
            customerName,
            recipientEmail,
            recipientPhone,
            quotationNumber,
            bookingNumber,
            eventDate,
            venue,
            amount,
          }}
          onClose={() => setIsComposerOpen(false)}
          onCreated={() => refetch()}
        />
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <CommunicationDetailModal
          item={selectedItem}
          tenantSlug={tenantSlug}
          onClose={() => setSelectedItem(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
}
