"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { useAuth } from "@/providers/auth-provider";
import { getInvoice, updateInvoice } from "@/lib/invoices-api";
import type { UpdateInvoiceRequest } from "@catering/shared-types";

export default function EditInvoicePage() {
  const { tenantSlug, invoiceId } = useParams<{
    tenantSlug: string;
    invoiceId: string;
  }>();
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(invoiceId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!invoiceId,
  });

  const handleUpdate = async (dto: any) => {
    setIsSubmitting(true);
    try {
      await updateInvoice(invoiceId, dto as UpdateInvoiceRequest, accessToken!);
      router.push(`/tenant/${tenantSlug}/invoices/${invoiceId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs text-[#737373]">Loading invoice...</div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
        Invoice not found.
      </div>
    );
  }

  if (invoice.status !== "draft") {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Edit Invoice ${invoice.invoiceNumber}`}
          description="Invoices that have been issued, paid, or voided cannot be modified."
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
          This invoice has status &ldquo;{invoice.status}&rdquo; and is locked from direct edits.
          <div className="mt-3">
            <button
              onClick={() => router.push(`/tenant/${tenantSlug}/invoices/${invoiceId}`)}
              className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              Return to Invoice Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Invoice ${invoice.invoiceNumber}`}
        description="Update line items, pricing, notes, and payment terms for this draft invoice."
      />

      <InvoiceForm
        mode="edit"
        tenantSlug={tenantSlug}
        initialData={invoice}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
