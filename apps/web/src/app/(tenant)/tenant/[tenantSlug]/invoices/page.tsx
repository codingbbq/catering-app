"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceTable } from "@/features/invoices/invoice-table";

export default function InvoicesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Billing"
        description="Issue customer invoices, track payments, receivables, and commercial billing commitments."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/invoices/new`}
            className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors flex items-center gap-1.5"
          >
            <span>+</span> Create Invoice
          </Link>
        }
      />

      <InvoiceTable tenantSlug={tenantSlug} />
    </div>
  );
}
