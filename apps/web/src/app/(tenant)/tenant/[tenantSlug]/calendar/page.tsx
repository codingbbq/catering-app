"use client";

import type { BookingStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { AgendaView } from "@/features/calendar/agenda-view";
import { CalendarHeader } from "@/features/calendar/calendar-header";
import type { CalendarEvent, CalendarViewMode } from "@/features/calendar/calendar-types";
import {
  formatDayHeader,
  formatMonthYear,
  formatWeekRange,
  mapBookingToEvent,
} from "@/features/calendar/calendar-utils";
import { DayView } from "@/features/calendar/day-view";
import { EventDetailModal } from "@/features/calendar/event-detail-modal";
import { MonthView } from "@/features/calendar/month-view";
import { WeekView } from "@/features/calendar/week-view";
import { listBookings } from "@/lib/bookings-api";
import { useAuth } from "@/providers/auth-provider";

export default function TenantCalendarPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Compute fromDate & toDate to bound the query appropriately
  const { fromDate, toDate } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month" || viewMode === "agenda") {
      // 1 month before to 1 month after to cover leading/trailing dates
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0);
      return {
        fromDate: start.toISOString().split("T")[0],
        toDate: end.toISOString().split("T")[0],
      };
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek - 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 9);
      return {
        fromDate: start.toISOString().split("T")[0],
        toDate: end.toISOString().split("T")[0],
      };
    } else {
      // Day view: 1 day range
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 1);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 1);
      return {
        fromDate: start.toISOString().split("T")[0],
        toDate: end.toISOString().split("T")[0],
      };
    }
  }, [currentDate, viewMode]);

  const statusParam = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: [
      "tenant",
      tenantSlug,
      "calendar-bookings",
      { fromDate, toDate, status: statusParam },
    ],
    queryFn: () =>
      listBookings(accessToken!, {
        fromDate,
        toDate,
        status: statusParam,
        limit: 100,
      }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const events: CalendarEvent[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map(mapBookingToEvent);
  }, [data]);

  // Navigation handlers
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() - 7);
      } else if (viewMode === "day") {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() + 7);
      } else if (viewMode === "day") {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === "month" || viewMode === "agenda") {
      return formatMonthYear(currentDate);
    } else if (viewMode === "week") {
      return formatWeekRange(currentDate);
    } else {
      return formatDayHeader(currentDate);
    }
  }, [currentDate, viewMode]);

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Access Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access your operational calendar.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Operations Calendar"
        description="Master spatial calendar for banquets, corporate catering events, guest capacities, and fulfillment timelines."
        badge={<StatusBadge variant="neutral">{events.length} Events in Period</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/tenant/${tenantSlug}/bookings`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <span>Switch to List View</span>
            </Link>
          </div>
        }
      />

      {/* Main Calendar Card */}
      <div className="rounded-lg shadow-xs">
        <CalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          title={headerTitle}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tenantSlug={tenantSlug}
        />

        {isLoading ? (
          <div className="bg-white border-x border-b border-[#E5E5E5] rounded-b-lg p-20 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent mx-auto" />
            <p className="text-xs text-[#737373] mt-3">Loading calendar schedule...</p>
          </div>
        ) : viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            onSelectEvent={setSelectedEvent}
            tenantSlug={tenantSlug}
          />
        ) : viewMode === "week" ? (
          <WeekView
            currentDate={currentDate}
            events={events}
            onSelectEvent={setSelectedEvent}
            tenantSlug={tenantSlug}
          />
        ) : viewMode === "day" ? (
          <DayView
            currentDate={currentDate}
            events={events}
            onSelectEvent={setSelectedEvent}
            tenantSlug={tenantSlug}
          />
        ) : (
          <AgendaView
            events={events}
            onSelectEvent={setSelectedEvent}
            tenantSlug={tenantSlug}
          />
        )}
      </div>

      {/* Interactive Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        tenantSlug={tenantSlug}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
