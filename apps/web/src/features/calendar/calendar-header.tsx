"use client";

import type { BookingStatus } from "@catering/shared-types";
import Link from "next/link";
import type { CalendarViewMode } from "./calendar-types";

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  statusFilter: "all" | BookingStatus;
  onStatusFilterChange: (status: "all" | BookingStatus) => void;
  tenantSlug: string;
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  title,
  onPrev,
  onNext,
  onToday,
  statusFilter,
  onStatusFilterChange,
  tenantSlug,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5E5] bg-white p-4 rounded-t-lg">
      {/* Left: Navigation and Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] transition-colors"
        >
          Today
        </button>

        <div className="flex items-center rounded border border-[#E5E5E5] bg-white">
          <button
            type="button"
            onClick={onPrev}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors rounded-l"
            title="Previous period"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="h-4 w-px bg-[#E5E5E5]" />
          <button
            type="button"
            onClick={onNext}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors rounded-r"
            title="Next period"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <h2 className="text-base font-bold text-[#171717] tracking-tight">{title}</h2>
      </div>

      {/* Right: Filters, View Selector & New Booking */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "all" | BookingStatus)}
          className="h-8 rounded border border-[#E5E5E5] bg-white px-2.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* View Switcher (Google Calendar Style) */}
        <div className="inline-flex rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-0.5 text-xs">
          {(["month", "week", "day", "agenda"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                viewMode === mode
                  ? "bg-white text-[#171717] shadow-xs font-semibold"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Create Booking */}
        <Link
          href={`/tenant/${tenantSlug}/bookings/new`}
          className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
        >
          <span className="text-sm leading-none">+</span>
          <span>New Event</span>
        </Link>
      </div>
    </div>
  );
}
