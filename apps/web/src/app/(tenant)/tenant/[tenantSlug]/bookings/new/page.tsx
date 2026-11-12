"use client";

import type { CreateBookingRequest, UpdateBookingRequest } from "@catering/shared-types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { BookingForm } from "@/features/bookings/booking-form";
import { createBooking } from "@/lib/bookings-api";
import { useAuth } from "@/providers/auth-provider";

export default function NewBookingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("quotationId") || undefined;
  const router = useRouter();
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateBookingRequest | UpdateBookingRequest) => {
    if (!accessToken) throw new Error("Not authenticated");
    setIsSubmitting(true);
    try {
      const created = await createBooking(data as CreateBookingRequest, accessToken);
      router.push(`/tenant/${tenantSlug}/bookings/${created.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotationId ? "Convert Quotation to Booking" : "Create New Booking"}
        description={
          quotationId
            ? "Confirm commercial agreement, schedule service milestones, and initialize fulfillment details."
            : "Directly schedule an event booking and define operational execution milestones."
        }
      />

      <BookingForm
        mode="create"
        tenantSlug={tenantSlug}
        initialQuotationId={quotationId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
