"use client";

import { useParams } from "next/navigation";
import { PaymentDetailsView } from "@/features/payments/payment-details-view";

export default function PaymentDetailPage() {
  const { tenantSlug, paymentId } = useParams<{
    tenantSlug: string;
    paymentId: string;
  }>();

  return (
    <PaymentDetailsView
      tenantSlug={tenantSlug}
      paymentId={paymentId}
    />
  );
}
