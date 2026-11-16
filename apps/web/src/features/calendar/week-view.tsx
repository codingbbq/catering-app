"use client";

import type { CalendarEvent } from "./calendar-types";
import { CALENDAR_HOURS, getWeekDays, isSameDay } from "./calendar-utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  tenantSlug: string;
}

const STATUS_BORDER: Record<string, string> = {
  confirmed: "border-l-emerald-600 bg-emerald-50/40 text-emerald-950",
  in_progress: "border-l-amber-600 bg-amber-50/40 text-amber-950",
  completed: "border-l-neutral-500 bg-neutral-100/50 text-neutral-800",
  draft: "border-l-neutral-400 bg-white text-neutral-800",
  cancelled: "border-l-rose-500 bg-rose-50/40 text-rose-950",
};

export function WeekView({
  currentDate,
  events,
  onSelectEvent,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const today = new Date();

  return (
    <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg overflow-hidden flex flex-col">
      {/* 7-Day Header */}
      <div className="grid grid-cols-8 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="py-3 px-2 border-r border-[#E5E5E5] text-[10px] font-mono text-[#737373] text-center">
          TIME
        </div>
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`py-2.5 px-2 text-center border-r border-[#E5E5E5] last:border-r-0 ${
                isToday ? "bg-neutral-100/60" : ""
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                  isToday ? "bg-[#171717] text-white" : "text-[#171717]"
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hourly Grid */}
      <div className="max-h-[600px] overflow-y-auto divide-y divide-[#F0F0F0]">
        {CALENDAR_HOURS.map((hour) => {
          const hourLabel = `${String(hour).padStart(2, "0")}:00`;

          return (
            <div key={hour} className="grid grid-cols-8 min-h-[52px]">
              {/* Hour Label */}
              <div className="border-r border-[#E5E5E5] pr-2 text-right text-[11px] font-mono text-[#737373] py-1 select-none">
                {hourLabel}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                // Find events matching this day and hour
                const dayEvents = events.filter((e) => {
                  if (!isSameDay(e.eventDate, day)) return false;
                  if (e.startTime) {
                    const startH = parseInt(e.startTime.split(":")[0] ?? "0", 10);
                    return startH === hour;
                  }
                  // If no specific hour, place all-day at 09:00
                  return hour === 9;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="border-r border-[#E5E5E5] last:border-r-0 p-1 relative transition-colors hover:bg-[#FAFAFA]/50"
                  >
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className={`w-full text-left rounded border border-[#E5E5E5] border-l-3 p-1.5 text-xs shadow-2xs hover:border-[#171717] transition-all cursor-pointer block mb-1 ${
                          STATUS_BORDER[event.status] ?? "border-l-neutral-400 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold truncate">
                            {event.bookingNumber}
                          </span>
                          <span className="shrink-0 text-[#737373]">
                            {event.startTime || "All Day"}
                          </span>
                        </div>
                        <p className="font-semibold text-[11px] truncate mt-0.5">
                          {event.title}
                        </p>
                        <div className="text-[10px] text-[#737373] truncate flex items-center justify-between mt-0.5">
                          <span>{event.customerName}</span>
                          {event.guestCount && <span>{event.guestCount} guests</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
