"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentTable } from "@/features/payments/payment-table";
import { PaymentRecordModal } from "@/features/payments/payment-record-modal";

export default function PaymentsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Receipts"
        description="Track incoming customer payments, allocate credits across invoices, and reconcile outstanding balances."
        actions={
          <button
            type="button"
            onClick={() => setIsRecordOpen(true)}
            className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors flex items-center gap-1.5"
          >
            <span>+</span> Record Payment
          </button>
        }
      />

      <PaymentTable tenantSlug={tenantSlug} />

      <PaymentRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
      />
    </div>
  );
}
