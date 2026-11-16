"use client";

import Link from "next/link";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import type { CalendarEvent } from "./calendar-types";
import { isSameDay } from "./calendar-utils";

interface AgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  tenantSlug: string;
}

interface DateGroup {
  date: Date;
  dateLabel: string;
  isToday: boolean;
  events: CalendarEvent[];
}

export function AgendaView({
  events,
  onSelectEvent,
  tenantSlug,
}: AgendaViewProps) {
  const { formatCurrency } = useTenantCurrency();
  const today = new Date();

  // Sort chronologically
  const sorted = [...events].sort(
    (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
  );

  // Group by date
  const groups: DateGroup[] = [];
  for (const event of sorted) {
    const existing = groups.find((g) => isSameDay(g.date, event.eventDate));
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({
        date: event.eventDate,
        dateLabel: event.eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        isToday: isSameDay(event.eventDate, today),
        events: [event],
      });
    }
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg p-16 text-center text-xs text-[#737373] space-y-2">
        <p>No upcoming catering events in this period.</p>
        <Link
          href={`/tenant/${tenantSlug}/bookings/new`}
          className="inline-block rounded bg-[#171717] px-3.5 py-1.5 font-medium text-white hover:bg-[#262626] transition-colors"
        >
          + Create Booking
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg divide-y divide-[#E5E5E5] max-h-[620px] overflow-y-auto">
      {groups.map((group) => (
        <div key={group.date.toISOString()} className="p-4 sm:p-5 space-y-3">
          {/* Group Date Header */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                group.isToday
                  ? "bg-[#171717] text-white"
                  : "bg-neutral-100 text-[#171717]"
              }`}
            >
              {group.dateLabel}
            </span>
            <span className="text-xs text-[#737373]">
              ({group.events.length} {group.events.length === 1 ? "event" : "events"})
            </span>
          </div>

          {/* Events list */}
          <div className="space-y-2">
            {group.events.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] hover:bg-white hover:border-[#171717] p-3 text-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#171717] group-hover:underline">
                      {event.bookingNumber}
                    </span>
                    <BookingStatusBadge status={event.status} />
                    <span className="font-semibold text-[#171717]">{event.title}</span>
                    {event.startTime && (
                      <span className="font-mono text-[11px] text-[#737373]">
                        @ {event.startTime}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[#737373] text-[11px] flex-wrap">
                    <span>Account: {event.customerName}</span>
                    {event.venueName && <span>• Venue: {event.venueName}</span>}
                    {event.guestCount && <span>• {event.guestCount} guests</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end shrink-0">
                  <div className="text-right">
                    <p className="font-mono font-bold text-[#171717]">
                      {formatCurrency(event.totalAmount)}
                    </p>
                    <p className="text-[10px] text-[#737373]">Contract Value</p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
                  >
                    Details &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
