"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { useAuth } from "@/providers/auth-provider";
import { createInvoice } from "@/lib/invoices-api";
import type { CreateInvoiceRequest } from "@catering/shared-types";

export default function NewInvoicePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || undefined;
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (dto: any) => {
    setIsSubmitting(true);
    try {
      const created = await createInvoice(dto as CreateInvoiceRequest, accessToken!);
      router.push(`/tenant/${tenantSlug}/invoices/${created.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Draft a customer invoice with line items, applicable taxes, and payment terms."
      />

      <InvoiceForm
        mode="create"
        tenantSlug={tenantSlug}
        initialBookingId={bookingId}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
