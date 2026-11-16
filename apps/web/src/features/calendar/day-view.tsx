"use client";

import Link from "next/link";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import type { CalendarEvent } from "./calendar-types";
import { CALENDAR_HOURS, formatDayHeader, isSameDay } from "./calendar-utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  tenantSlug: string;
}

export function DayView({
  currentDate,
  events,
  onSelectEvent,
  tenantSlug,
}: DayViewProps) {
  const { formatCurrency } = useTenantCurrency();
  const dayEvents = events.filter((e) => isSameDay(e.eventDate, currentDate));
  const totalGuests = dayEvents.reduce((acc, e) => acc + (e.guestCount ?? 0), 0);
  const totalValue = dayEvents.reduce((acc, e) => acc + e.totalAmount, 0);

  return (
    <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg overflow-hidden flex flex-col">
      {/* Day Overview Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] p-4">
        <div>
          <h3 className="text-sm font-bold text-[#171717]">
            {formatDayHeader(currentDate)}
          </h3>
          <p className="text-xs text-[#737373] mt-0.5">
            {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"} scheduled • {totalGuests} total guests expected
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-3 text-xs">
          <div className="rounded border border-[#E5E5E5] bg-white px-3 py-1 text-[#171717]">
            <span className="text-[#737373]">Day Contract Value: </span>
            <span className="font-mono font-bold">{formatCurrency(totalValue)}</span>
          </div>
          <Link
            href={`/tenant/${tenantSlug}/bookings/new?date=${currentDate.toISOString().split("T")[0]}`}
            className="rounded bg-[#171717] px-3 py-1 font-medium text-white hover:bg-[#262626] transition-colors"
          >
            + Add Event
          </Link>
        </div>
      </div>

      {/* Hourly Timeline */}
      <div className="max-h-[620px] overflow-y-auto divide-y divide-[#F0F0F0]">
        {dayEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#737373] space-y-2">
            <p>No catering events or bookings scheduled for this day.</p>
            <Link
              href={`/tenant/${tenantSlug}/bookings/new?date=${currentDate.toISOString().split("T")[0]}`}
              className="inline-block rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
            >
              + Schedule an Event on this Date
            </Link>
          </div>
        ) : (
          CALENDAR_HOURS.map((hour) => {
            const hourLabel = `${String(hour).padStart(2, "0")}:00`;
            const matchingEvents = dayEvents.filter((e) => {
              if (e.startTime) {
                const startH = parseInt(e.startTime.split(":")[0] ?? "0", 10);
                return startH === hour;
              }
              return hour === 9; // Place un-timed events at 09:00
            });

            return (
              <div key={hour} className="flex min-h-[64px] border-b border-[#F0F0F0] last:border-b-0">
                {/* Hour Timestamp */}
                <div className="w-16 sm:w-20 border-r border-[#E5E5E5] p-2 text-right text-xs font-mono text-[#737373] select-none shrink-0 bg-[#FAFAFA]/40">
                  {hourLabel}
                </div>

                {/* Events Column */}
                <div className="flex-1 p-2 space-y-2">
                  {matchingEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="rounded-lg border border-[#E5E5E5] bg-white p-3 shadow-xs hover:border-[#171717] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#171717] group-hover:underline">
                            {event.bookingNumber}
                          </span>
                          <BookingStatusBadge status={event.status} />
                          <span className="text-xs font-bold text-[#171717]">
                            {event.title}
                          </span>
                          {event.startTime && (
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono text-[#737373]">
                              {event.startTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#737373] flex-wrap">
                          <span>Client: {event.customerName}</span>
                          {event.venueName && <span>• Venue: {event.venueName}</span>}
                          {event.guestCount && <span>• {event.guestCount} Guests</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:justify-end shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-[#171717]">
                            {formatCurrency(event.totalAmount)}
                          </span>
                          <span className="block text-[10px] text-[#737373]">Contract Total</span>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                        >
                          Quick View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
