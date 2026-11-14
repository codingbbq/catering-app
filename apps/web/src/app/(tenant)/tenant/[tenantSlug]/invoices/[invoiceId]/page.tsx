"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getInvoice } from "@/lib/invoices-api";
import { InvoiceDetailsView } from "@/features/invoices/invoice-details-view";

export default function InvoiceDetailPage() {
  const { tenantSlug, invoiceId } = useParams<{
    tenantSlug: string;
    invoiceId: string;
  }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(invoiceId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!invoiceId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs text-[#737373]">Loading invoice details...</div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
        Invoice not found or failed to load.
      </div>
    );
  }

  return (
    <InvoiceDetailsView invoice={invoice} tenantSlug={tenantSlug} />
  );
}
