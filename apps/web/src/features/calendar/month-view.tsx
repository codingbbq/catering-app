"use client";

import Link from "next/link";
import { useState } from "react";
import type { CalendarEvent } from "./calendar-types";
import { getMonthGrid, isSameDay } from "./calendar-utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  tenantSlug: string;
}

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-emerald-600",
  in_progress: "bg-amber-600",
  completed: "bg-neutral-500",
  draft: "bg-neutral-400",
  cancelled: "bg-rose-500",
};

export function MonthView({
  currentDate,
  events,
  onSelectEvent,
  tenantSlug,
}: MonthViewProps) {
  const [overflowDate, setOverflowDate] = useState<Date | null>(null);

  const grid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Helper to get events for a date
  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(e.eventDate, date));
  };

  const overflowEvents = overflowDate ? getEventsForDate(overflowDate) : [];

  return (
    <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg overflow-hidden select-none">
      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-[#E5E5E5] bg-[#FAFAFA] text-center text-[11px] font-semibold tracking-wider text-[#737373]">
        {weekdays.map((day) => (
          <div key={day} className="py-2.5 border-r border-[#E5E5E5] last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-y divide-[#E5E5E5]">
        {grid.map((cell, idx) => {
          const dayEvents = getEventsForDate(cell.date);
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const overflowCount = dayEvents.length - maxVisible;
          const dateParam = cell.date.toISOString().split("T")[0];

          return (
            <div
              key={idx}
              className={`min-h-[115px] sm:min-h-[130px] p-1.5 border-r border-[#E5E5E5] flex flex-col justify-between transition-colors relative group ${
                cell.isCurrentMonth ? "bg-white" : "bg-[#FBFBFA] text-[#A3A3A3]"
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    cell.isToday
                      ? "bg-[#171717] text-white"
                      : cell.isCurrentMonth
                        ? "text-[#171717]"
                        : "text-[#A3A3A3]"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Quick Add Button on Hover */}
                <Link
                  href={`/tenant/${tenantSlug}/bookings/new?date=${dateParam}`}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5] transition-all text-xs"
                  title={`Create event on ${dateParam}`}
                >
                  +
                </Link>
              </div>

              {/* Event Chips List */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left rounded border border-[#E5E5E5] bg-[#FAFAFA] px-1.5 py-0.5 text-[11px] leading-tight hover:border-[#171717] hover:bg-[#F5F5F4] transition-all flex items-center gap-1.5 truncate group/item"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        STATUS_DOT[event.status] ?? "bg-neutral-400"
                      }`}
                    />
                    {event.startTime && (
                      <span className="font-mono text-[10px] text-[#737373] shrink-0">
                        {event.startTime}
                      </span>
                    )}
                    <span className="font-medium text-[#171717] truncate flex-1">
                      {event.title}
                    </span>
                    {event.guestCount ? (
                      <span className="text-[10px] text-[#737373] shrink-0 font-mono">
                        {event.guestCount}g
                      </span>
                    ) : null}
                  </button>
                ))}

                {/* Overflow Pill */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOverflowDate(cell.date)}
                    className="text-[10px] font-semibold text-[#737373] hover:text-[#171717] hover:underline px-1 block w-full text-left"
                  >
                    +{overflowCount} more...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Day Popover Modal */}
      {overflowDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4"
          onClick={() => setOverflowDate(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
              <h4 className="text-xs font-bold text-[#171717]">
                Events on {overflowDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </h4>
              <button
                type="button"
                onClick={() => setOverflowDate(null)}
                className="text-xs text-[#737373] hover:text-[#171717]"
              >
                ✕
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {overflowEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => {
                    setOverflowDate(null);
                    onSelectEvent(event);
                  }}
                  className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-2 text-xs hover:border-[#171717] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#171717]">
                      {event.bookingNumber}
                    </span>
                    <span className="text-[10px] text-[#737373]">{event.startTime || "All Day"}</span>
                  </div>
                  <p className="font-medium text-[#171717] mt-0.5">{event.title}</p>
                  <p className="text-[11px] text-[#737373]">{event.customerName} • {event.guestCount ?? 0} guests</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
