"use client";

import type { CommunicationItem } from "@catering/shared-types";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CommunicationChannelBadge } from "./communication-channel-badge";
import { CommunicationDetailModal } from "./communication-detail-modal";
import { CommunicationStatusBadge } from "./communication-status-badge";

interface CommunicationTableProps {
  items: CommunicationItem[];
  tenantSlug: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function CommunicationTable({
  items,
  tenantSlug,
  isLoading,
  onRefresh,
}: CommunicationTableProps) {
  const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        <p className="mt-2">Loading communication logs...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No communications logged"
        description="Outbound customer communications, delivery statuses, and internal notes will appear here."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] font-medium text-[#737373]">
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recipient / Customer</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Context Entity</th>
                <th className="px-4 py-3">Sent / Logged</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#FAFAFA]/70 cursor-pointer transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Channel & Direction */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <CommunicationChannelBadge channel={item.channel} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <CommunicationStatusBadge status={item.status} />
                  </td>

                  {/* Recipient / Customer */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#171717] truncate max-w-[180px]">
                      {item.recipient}
                    </div>
                    {item.customer && (
                      <div className="text-[11px] text-[#737373] truncate max-w-[180px]">
                        {item.customer.name}
                      </div>
                    )}
                  </td>

                  {/* Message Preview */}
                  <td className="px-4 py-3 max-w-[280px]">
                    {item.subject && (
                      <div className="font-medium text-[#171717] truncate">
                        {item.subject}
                      </div>
                    )}
                    <div className="text-[11px] text-[#737373] truncate">
                      {item.content}
                    </div>
                  </td>

                  {/* Context Entity */}
                  <td
                    className="px-4 py-3 whitespace-nowrap text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.quotation ? (
                      <Link
                        href={`/tenant/${tenantSlug}/quotations/${item.quotation.id}`}
                        className="inline-flex items-center gap-1 rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] text-[#171717] hover:border-[#171717]"
                      >
                        <span>QTN:</span>
                        <span>{item.quotation.quotationNumber}</span>
                      </Link>
                    ) : item.booking ? (
                      <Link
                        href={`/tenant/${tenantSlug}/bookings/${item.booking.id}`}
                        className="inline-flex items-center gap-1 rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] text-[#171717] hover:border-[#171717]"
                      >
                        <span>BK:</span>
                        <span>{item.booking.bookingNumber}</span>
                      </Link>
                    ) : item.enquiry ? (
                      <Link
                        href={`/tenant/${tenantSlug}/enquiries/${item.enquiry.id}`}
                        className="inline-flex items-center gap-1 rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 text-[11px] text-[#171717] hover:border-[#171717] max-w-[140px] truncate"
                      >
                        <span>Enquiry:</span>
                        <span className="truncate">{item.enquiry.title}</span>
                      </Link>
                    ) : (
                      <span className="text-[#A3A3A3] text-[11px]">—</span>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3 whitespace-nowrap text-[#737373] text-[11px]">
                    <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-[#A3A3A3]">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <CommunicationDetailModal
          item={selectedItem}
          tenantSlug={tenantSlug}
          onClose={() => setSelectedItem(null)}
          onUpdated={onRefresh}
        />
      )}
    </>
  );
}
