"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listBookings } from "@/lib/bookings-api";
import { getDashboardOverview } from "@/lib/reports-api";
import { getTenantProfile } from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";

export default function TenantDashboardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { currencyCode, currencySymbol, formatCurrency } = useTenantCurrency();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => getTenantProfile(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const { data: overviewData } = useQuery({
    queryKey: ["tenant", tenantSlug, "dashboard-overview"],
    queryFn: () => getDashboardOverview(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["tenant", tenantSlug, "bookings", "dashboard"],
    queryFn: () => listBookings(accessToken!, { limit: 5 }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access your catering workspace.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
      </div>
    );
  }

  const kpis = overviewData?.kpi ?? {
    activeBookingsValue: 0,
    confirmedBookingsCount: 0,
    upcomingBookingsCount: 0,
    pipelineQuotedValue: 0,
    pendingQuotesCount: 0,
    totalRevenueCollected: 0,
    outstandingInvoiced: 0,
    overdueInvoicesCount: 0,
    lowStockAlertsCount: 0,
    mealOrdersScheduledCount: 0,
  };

  const bookingStats = bookingsData?.stats ?? {
    totalBookings: 0,
    confirmedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    draftCount: 0,
    upcomingCount: 0,
    totalConfirmedValue: 0,
  };

  const upcomingBookings = (bookingsData?.items ?? []).filter(
    (b) => b.status === "confirmed" || b.status === "in_progress" || b.status === "draft",
  );

  const alerts = overviewData?.recentAlerts ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile?.displayName ?? tenantSlug}
        description="Daily catering operations, client accounts, live financial tracking, and event fulfillment."
        badge={<StatusBadge variant="success">Workspace Active</StatusBadge>}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/tenant/${tenantSlug}/reports`}
              className="inline-flex items-center gap-1.5 rounded border border-[#171717] bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Executive Reports</span>
            </Link>
            <Link
              href={`/tenant/${tenantSlug}/bookings/new`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Booking</span>
            </Link>
            <Link
              href={`/tenant/${tenantSlug}/quotations/new`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Quotation</span>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Bookings Revenue */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Active Bookings Value
            </p>
            <span className="text-[10px] font-mono text-[#737373]">{kpis.confirmedBookingsCount} Events</span>
          </div>
          <p className="text-xl font-bold font-mono text-[#171717]">
            {formatCurrency(kpis.activeBookingsValue || bookingStats.totalConfirmedValue)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#737373]">
            <span>{kpis.upcomingBookingsCount} upcoming in calendar</span>
            <Link href={`/tenant/${tenantSlug}/bookings`} className="hover:underline font-medium text-[#171717]">
              View &rarr;
            </Link>
          </div>
        </div>

        {/* Total Cash Collected */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Revenue Collected
            </p>
            <StatusBadge variant="success">Receipts</StatusBadge>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700">
            {formatCurrency(kpis.totalRevenueCollected)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#737373]">
            <span>{formatCurrency(kpis.outstandingInvoiced)} uncollected balance</span>
            <Link href={`/tenant/${tenantSlug}/payments`} className="hover:underline font-medium text-[#171717]">
              Payments &rarr;
            </Link>
          </div>
        </div>

        {/* Quotation Pipeline */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Pipeline Quoted Value
            </p>
            <span className="text-[10px] font-mono text-[#737373]">{kpis.pendingQuotesCount} Pending</span>
          </div>
          <p className="text-xl font-bold font-mono text-[#171717]">
            {formatCurrency(kpis.pipelineQuotedValue)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#737373]">
            <span>Awaiting client approval</span>
            <Link href={`/tenant/${tenantSlug}/quotations`} className="hover:underline font-medium text-[#171717]">
              Quotes &rarr;
            </Link>
          </div>
        </div>

        {/* Operational Health & Currency */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Workspace &amp; Stock
            </p>
            <span className="text-[10px] font-mono font-medium text-[#171717]">{currencyCode}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold font-mono text-[#171717]">
              {kpis.lowStockAlertsCount > 0 ? (
                <span className="text-amber-700">{kpis.lowStockAlertsCount} Low Stock</span>
              ) : (
                <span className="text-emerald-700">Stock Optimal</span>
              )}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#737373]">
            <span>{kpis.mealOrdersScheduledCount} meal orders queued</span>
            <Link href={`/tenant/${tenantSlug}/inventory`} className="hover:underline font-medium text-[#171717]">
              Inventory &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Attention Alerts (if any) */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
              Operational Attention &amp; Action Required
            </h3>
            <span className="text-[11px] text-[#737373]">{alerts.length} Active Items</span>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {alerts.map((alert) => (
              <div key={alert.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      alert.severity === "error"
                        ? "bg-rose-500"
                        : alert.severity === "warning"
                          ? "bg-amber-500"
                          : "bg-neutral-400"
                    }`}
                  />
                  <div className="truncate">
                    <span className="font-medium text-[#171717]">{alert.title}</span>
                    <span className="text-[#737373] ml-2 text-[11px] truncate">{alert.description}</span>
                  </div>
                </div>
                <Link
                  href={`/tenant/${tenantSlug}${alert.link}`}
                  className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors shrink-0"
                >
                  Resolve &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Event Execution Schedule Widget */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
              Upcoming Event Execution Schedule
            </h3>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Confirmed and pending bookings requiring kitchen preparation and delivery coordination.
            </p>
          </div>
          <Link
            href={`/tenant/${tenantSlug}/bookings`}
            className="text-xs font-medium text-[#171717] hover:underline flex items-center gap-1"
          >
            <span>View All Bookings ({bookingStats.totalBookings})</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {isLoadingBookings ? (
          <div className="py-6 text-center text-xs text-[#737373]">
            Loading schedule...
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#737373] space-y-2">
            <p>No upcoming events currently scheduled.</p>
            <Link
              href={`/tenant/${tenantSlug}/bookings/new`}
              className="inline-block rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              + Create First Booking
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {upcomingBookings.slice(0, 5).map((booking) => {
              const eventDate = new Date(booking.eventDate);
              return (
                <div
                  key={booking.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAFAFA] px-2 rounded-md transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tenant/${tenantSlug}/bookings/${booking.id}`}
                        className="font-mono text-xs font-semibold text-[#171717] hover:underline"
                      >
                        {booking.bookingNumber}
                      </Link>
                      <BookingStatusBadge status={booking.status} />
                      <span className="text-xs font-medium text-[#262626] truncate max-w-[240px]">
                        {booking.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#737373]">
                      <span>Account: {booking.customerName}</span>
                      {booking.venueName && <span>• Venue: {booking.venueName}</span>}
                      {booking.guestCount && <span>• {booking.guestCount} guests</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-[#171717]">
                        {formatCurrency(booking.totalAmount)}
                      </div>
                      <div className="font-mono text-[10px] text-[#737373]">
                        {eventDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <Link
                      href={`/tenant/${tenantSlug}/bookings/${booking.id}`}
                      className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                    >
                      Manage &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Launchpad Navigation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Operational &amp; Commercial Modules
          </h3>
          <Link
            href={`/tenant/${tenantSlug}/reports`}
            className="text-xs font-medium text-[#171717] hover:underline flex items-center gap-1"
          >
            <span>Open Executive Reporting Suite</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Executive Reports Card */}
          <Link
            href={`/tenant/${tenantSlug}/reports`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Executive Reporting Suite</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Domain performance analytics across Sales Pipeline, Bookings, Finance, and Kitchen Inventory.
            </p>
          </Link>

          {/* Bookings Card */}
          <Link
            href={`/tenant/${tenantSlug}/bookings`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Event Bookings &amp; Operations</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Track confirmed events, manage kitchen &amp; service schedules, venue logistics, and fulfillment.
            </p>
          </Link>

          {/* Invoices Card */}
          <Link
            href={`/tenant/${tenantSlug}/invoices`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Invoicing &amp; Balances</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Issue commercial invoices, track balances due, overdue notices, and print-ready accounts.
            </p>
          </Link>

          {/* Quotations Card */}
          <Link
            href={`/tenant/${tenantSlug}/quotations`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Quotations &amp; Revisions</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Prepare itemized proposals, track revision histories, margin calculations, and client acceptance.
            </p>
          </Link>

          {/* Inventory Card */}
          <Link
            href={`/tenant/${tenantSlug}/inventory`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Inventory &amp; Stock Levels</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Track ingredient stock quantities, reorder levels, cost valuations, and movement ledger.
            </p>
          </Link>

          {/* Daily Meal Orders Card */}
          <Link
            href={`/tenant/${tenantSlug}/meal-orders`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Daily Meal Orders</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Manage recurring subscription plans, meal dispatch boards, and automated order generation.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
