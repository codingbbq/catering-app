"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookingDetailsView } from "@/features/bookings/booking-details-view";
import { getBooking } from "@/lib/bookings-api";
import { useAuth } from "@/providers/auth-provider";

export default function BookingDetailPage() {
  const { tenantSlug, bookingId } = useParams<{
    tenantSlug: string;
    bookingId: string;
  }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const { data: booking, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
        Loading booking details...
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700 space-y-3">
        <p>Failed to load booking details: {(error as any)?.message || "Booking not found."}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded bg-red-700 px-3 py-1.5 text-xs text-white"
          >
            Retry
          </button>
          <Link
            href={`/tenant/${tenantSlug}/bookings`}
            className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs text-red-700"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return <BookingDetailsView booking={booking} tenantSlug={tenantSlug} />;
}
