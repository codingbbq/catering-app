"use client";

import Link from "next/link";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import type { CalendarEvent } from "./calendar-types";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  tenantSlug: string;
  onClose: () => void;
}

export function EventDetailModal({
  event,
  tenantSlug,
  onClose,
}: EventDetailModalProps) {
  const { formatCurrency } = useTenantCurrency();

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] p-4 sm:p-5">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#171717]">
                {event.bookingNumber}
              </span>
              <BookingStatusBadge status={event.status} />
            </div>
            <h3 className="text-base font-bold text-[#171717] leading-snug">
              {event.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#737373] hover:bg-[#E5E5E5] hover:text-[#171717] transition-colors"
            title="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F5F5F4] text-[#171717] shrink-0 mt-0.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#171717]">
                {event.eventDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {event.startTime ? (
                <p className="text-[#737373]">Scheduled Start: {event.startTime}</p>
              ) : (
                <p className="text-[#737373]">All-day catering engagement</p>
              )}
            </div>
          </div>

          {/* Customer / Client */}
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F5F5F4] text-[#171717] shrink-0 mt-0.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#171717]">{event.customerName}</p>
              <div className="text-[#737373] space-x-2">
                {event.customerPhone && <span>Tel: {event.customerPhone}</span>}
                {event.customerEmail && <span>• {event.customerEmail}</span>}
              </div>
            </div>
          </div>

          {/* Venue & Guests */}
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F5F5F4] text-[#171717] shrink-0 mt-0.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#171717]">
                {event.venueName || "Venue Address Unspecified"}
              </p>
              {event.venueAddress && <p className="text-[#737373]">{event.venueAddress}</p>}
              <p className="text-[#737373] mt-0.5 font-medium">
                {event.guestCount ? `${event.guestCount} Guests expected` : "Guest count not specified"}
              </p>
            </div>
          </div>

          {/* Contract Value */}
          <div className="flex items-start gap-3 border-t border-[#F0F0F0] pt-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F5F5F4] text-[#171717] shrink-0 mt-0.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#737373]">
                Total Booking Contract
              </p>
              <p className="font-mono text-base font-bold text-[#171717]">
                {formatCurrency(event.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 sm:px-5">
          <Link
            href={`/tenant/${tenantSlug}/invoices/new?bookingId=${event.id}`}
            className="text-xs font-medium text-[#737373] hover:text-[#171717] hover:underline"
          >
            Create Invoice
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              Close
            </button>
            <Link
              href={`/tenant/${tenantSlug}/bookings/${event.id}`}
              className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              Open Booking Details &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
