"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listBookings } from "@/lib/bookings-api";
import { listQuotations } from "@/lib/quotations-api";
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

  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["tenant", tenantSlug, "bookings", "dashboard"],
    queryFn: () => listBookings(accessToken!, { limit: 5 }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const { data: quotationsData } = useQuery({
    queryKey: ["tenant", tenantSlug, "quotations", "dashboard"],
    queryFn: () => listQuotations(accessToken!),
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile?.displayName ?? tenantSlug}
        description="Daily catering operations, client accounts, menus, and event management."
        badge={<StatusBadge variant="success">Workspace Active</StatusBadge>}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/tenant/${tenantSlug}/bookings/new`}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
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
            <Link
              href={`/tenant/${tenantSlug}/enquiries/new`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Enquiry</span>
            </Link>
          </div>
        }
      />

      {/* Operational Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Workspace</p>
          <p className="text-lg font-bold text-[#171717]">{tenantSlug}</p>
          <p className="text-[11px] text-[#737373]">Tenant isolation active</p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Currency &amp; Timezone</p>
          <p className="text-lg font-bold text-[#171717]">{currencyCode} ({currencySymbol})</p>
          <p className="text-[11px] text-[#737373]">{profile?.settings?.timezone ?? "UTC"}</p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Active Bookings Value</p>
          <p className="text-lg font-bold text-emerald-700">
            {formatCurrency(bookingStats.totalConfirmedValue)}
          </p>
          <p className="text-[11px] text-[#737373]">
            {bookingStats.confirmedCount + bookingStats.inProgressCount} active confirmed events
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Upcoming 30 Days</p>
          <p className="text-lg font-bold text-[#171717]">{bookingStats.upcomingCount} Events</p>
          <p className="text-[11px] text-[#737373]">Scheduled fulfillment</p>
        </div>
      </div>

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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
          Operational &amp; Commercial Modules
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Enquiries Card */}
          <Link
            href={`/tenant/${tenantSlug}/enquiries`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Sales Enquiries &amp; Pipeline</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Capture leads, qualify guest requirements, log communication timeline, and trigger quotations.
            </p>
          </Link>

          {/* Customers Card */}
          <Link
            href={`/tenant/${tenantSlug}/customers`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Customers &amp; Contacts</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Manage client accounts, corporate accounts, key contact persons, and address records.
            </p>
          </Link>

          {/* Menus Card */}
          <Link
            href={`/tenant/${tenantSlug}/menus`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Menu Builder</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Compose reusable course packages, buffets, plated selections, and price structures.
            </p>
          </Link>

          {/* Food Catalogue Card */}
          <Link
            href={`/tenant/${tenantSlug}/catalogue`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Food Catalogue &amp; Pricing</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Maintain master dishes, portion units, raw costs, selling rates, and dietary tags.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
