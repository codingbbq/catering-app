"use client";

import type { CreateBookingRequest, UpdateBookingRequest } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { BookingForm } from "@/features/bookings/booking-form";
import { getBooking, updateBooking } from "@/lib/bookings-api";
import { useAuth } from "@/providers/auth-provider";

export default function EditBookingPage() {
  const { tenantSlug, bookingId } = useParams<{
    tenantSlug: string;
    bookingId: string;
  }>();
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: booking, isLoading, isError, error } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!bookingId,
  });

  const handleSubmit = async (data: CreateBookingRequest | UpdateBookingRequest) => {
    if (!accessToken) throw new Error("Not authenticated");
    setIsSubmitting(true);
    try {
      await updateBooking(bookingId, data as UpdateBookingRequest, accessToken);
      router.push(`/tenant/${tenantSlug}/bookings/${bookingId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
        Loading booking for editing...
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700 space-y-3">
        <p>Failed to load booking: {(error as any)?.message || "Not found."}</p>
        <Link
          href={`/tenant/${tenantSlug}/bookings`}
          className="inline-block rounded border border-red-300 bg-white px-3 py-1.5 text-xs text-red-700"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Booking ${booking.bookingNumber}`}
        description="Update event execution schedule, venue instructions, contact information, and contracted totals."
      />

      <BookingForm
        mode="edit"
        tenantSlug={tenantSlug}
        initialData={booking}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
