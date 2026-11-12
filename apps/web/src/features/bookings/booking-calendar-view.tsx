"use client";

import type { BookingListItem } from "@catering/shared-types";
import Link from "next/link";
import { useMemo } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { BookingStatusBadge } from "./booking-status-badge";

interface BookingCalendarViewProps {
  data: BookingListItem[];
  tenantSlug: string;
}

interface GroupedBookings {
  label: string;
  items: BookingListItem[];
}

export function BookingCalendarView({ data, tenantSlug }: BookingCalendarViewProps) {
  const { formatCurrency } = useTenantCurrency();

  const groups = useMemo<GroupedBookings[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const todayItems: BookingListItem[] = [];
    const tomorrowItems: BookingListItem[] = [];
    const next7DaysItems: BookingListItem[] = [];
    const next30DaysItems: BookingListItem[] = [];
    const laterItems: BookingListItem[] = [];
    const pastItems: BookingListItem[] = [];

    // Sort by event date ascending
    const sorted = [...data].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );

    for (const b of sorted) {
      const d = new Date(b.eventDate);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() < today.getTime()) {
        pastItems.push(b);
      } else if (d.getTime() === today.getTime()) {
        todayItems.push(b);
      } else if (d.getTime() === tomorrow.getTime()) {
        tomorrowItems.push(b);
      } else if (d.getTime() <= sevenDays.getTime()) {
        next7DaysItems.push(b);
      } else if (d.getTime() <= thirtyDays.getTime()) {
        next30DaysItems.push(b);
      } else {
        laterItems.push(b);
      }
    }

    const result: GroupedBookings[] = [];
    if (todayItems.length > 0) result.push({ label: "Today's Events", items: todayItems });
    if (tomorrowItems.length > 0) result.push({ label: "Tomorrow", items: tomorrowItems });
    if (next7DaysItems.length > 0) result.push({ label: "Upcoming (Next 7 Days)", items: next7DaysItems });
    if (next30DaysItems.length > 0) result.push({ label: "Later This Month", items: next30DaysItems });
    if (laterItems.length > 0) result.push({ label: "Future Bookings", items: laterItems });
    if (pastItems.length > 0) result.push({ label: "Past Executed / Completed", items: pastItems.reverse() });

    return result;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center">
        <p className="text-sm font-medium text-[#737373]">
          No bookings to display on the operational calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
              {group.label}
            </h3>
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-[#737373]">
              {group.items.length} {group.items.length === 1 ? "event" : "events"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((b) => {
              const eventDate = new Date(b.eventDate);
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs hover:border-[#171717] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Date + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-semibold text-[#171717]">
                        {eventDate.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>

                    {/* Booking Title & Number */}
                    <Link
                      href={`/tenant/${tenantSlug}/bookings/${b.id}`}
                      className="block group"
                    >
                      <h4 className="text-xs font-medium text-[#171717] group-hover:underline line-clamp-1">
                        {b.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#737373]">
                        <span>{b.bookingNumber}</span>
                        {b.quotationNumber && <span>• {b.quotationNumber}</span>}
                      </div>
                    </Link>

                    {/* Customer & Venue Info */}
                    <div className="mt-3 space-y-1 text-xs text-[#737373]">
                      <div className="flex items-center gap-1.5 truncate">
                        <svg className="w-3.5 h-3.5 shrink-0 text-[#A3A3A3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-[#262626] truncate">{b.customerName}</span>
                      </div>
                      {b.venueName && (
                        <div className="flex items-center gap-1.5 truncate">
                          <svg className="w-3.5 h-3.5 shrink-0 text-[#A3A3A3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{b.venueName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0 text-[#A3A3A3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{b.guestCount ? `${b.guestCount} guests` : "Guests not set"}</span>
                        <span>•</span>
                        <span className="capitalize">{b.serviceType.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-[#F0F0F0] flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#171717]">
                      {formatCurrency(b.totalAmount)}
                    </span>
                    <Link
                      href={`/tenant/${tenantSlug}/bookings/${b.id}`}
                      className="text-xs font-medium text-[#171717] hover:underline"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
