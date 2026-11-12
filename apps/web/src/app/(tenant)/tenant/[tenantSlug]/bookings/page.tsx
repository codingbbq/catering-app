"use client";

import type { BookingStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { BookingCalendarView } from "@/features/bookings/booking-calendar-view";
import { BookingTable } from "@/features/bookings/booking-table";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listBookings } from "@/lib/bookings-api";
import { useAuth } from "@/providers/auth-provider";

export default function BookingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency } = useTenantCurrency();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");

  const statusParam = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "tenant",
      tenantSlug,
      "bookings",
      { search: searchTerm, status: statusParam },
    ],
    queryFn: () =>
      listBookings(accessToken!, {
        search: searchTerm || undefined,
        status: statusParam,
      }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">
          Workspace Authentication Required
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Sign in to access event bookings and operational execution schedules.
        </p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const items = data?.items ?? [];
  const stats = data?.stats ?? {
    totalBookings: 0,
    confirmedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    draftCount: 0,
    upcomingCount: 0,
    totalConfirmedValue: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Bookings"
        description="Track confirmed events, manage fulfillment details, and coordinate kitchen and service schedules."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/bookings/new`}
            className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
          >
            + New Booking
          </Link>
        }
      />

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Total Bookings
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            {stats.totalBookings}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            {stats.draftCount} tentative / draft
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Confirmed & Active
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-700">
            {stats.confirmedCount + stats.inProgressCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            {stats.inProgressCount} currently in execution
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Upcoming (Next 30 Days)
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            {stats.upcomingCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            Scheduled fulfillment
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Active Contracted Value
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            {formatCurrency(stats.totalConfirmedValue)}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            {stats.completedCount} executed & completed
          </div>
        </Card>
      </div>

      {/* Controls: View Mode Tabs + Search + Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E5E5E5]">
        {/* View Switcher: List vs Calendar */}
        <div className="inline-flex rounded-md border border-[#E5E5E5] p-0.5 bg-[#FAFAFA]">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "list"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#737373] hover:text-[#171717]"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#737373] hover:text-[#171717]"
            }`}
          >
            Operational Calendar
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] focus:outline-hidden"
          >
            <option value="all">All Statuses ({stats.totalBookings})</option>
            <option value="confirmed">Confirmed ({stats.confirmedCount})</option>
            <option value="in_progress">In Progress ({stats.inProgressCount})</option>
            <option value="completed">Completed ({stats.completedCount})</option>
            <option value="draft">Draft ({stats.draftCount})</option>
            <option value="cancelled">Cancelled ({stats.cancelledCount})</option>
          </select>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search booking #, title, customer..."
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1 text-xs text-[#171717] focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-xs text-[#737373] hover:text-[#171717] px-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="rounded bg-[#171717] px-3 py-1 text-xs font-medium text-white hover:bg-[#262626]"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
          Loading bookings...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
          Failed to load bookings: {(error as any)?.message || "Unknown error."}
          <button
            onClick={() => refetch()}
            className="mt-2 block mx-auto underline font-medium"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description={
            searchTerm || statusFilter !== "all"
              ? "No bookings match the selected search or status criteria. Try resetting your filters."
              : "Convert an accepted quotation into your first booking or create a booking directly."
          }
          action={
            <Link
              href={`/tenant/${tenantSlug}/bookings/new`}
              className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + Create Booking
            </Link>
          }
        />
      ) : viewMode === "list" ? (
        <BookingTable data={items} tenantSlug={tenantSlug} />
      ) : (
        <BookingCalendarView data={items} tenantSlug={tenantSlug} />
      )}
    </div>
  );
}
