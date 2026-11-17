"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TenantQuotaCard } from "@/features/communications/tenant-quota-card";
import {
  CommunicationComposerForm,
  type ContextEntityInfo,
} from "@/features/communications/communication-composer-form";

export default function NewCommunicationPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();

  const entityType = searchParams.get("entityType") as
    | "enquiry"
    | "quotation"
    | "booking"
    | "customer"
    | null;
  const entityId = searchParams.get("entityId") || undefined;
  const label = searchParams.get("label") || undefined;
  const customerName = searchParams.get("customerName") || undefined;
  const recipientEmail = searchParams.get("recipientEmail") || searchParams.get("recipient") || undefined;
  const recipientPhone = searchParams.get("recipientPhone") || undefined;
  const quotationNumber = searchParams.get("quotationNumber") || undefined;
  const bookingNumber = searchParams.get("bookingNumber") || undefined;
  const eventDate = searchParams.get("eventDate") || undefined;
  const venue = searchParams.get("venue") || undefined;
  const amountParam = searchParams.get("amount");
  const amount = amountParam ? Number(amountParam) : undefined;

  const initialContext: ContextEntityInfo | undefined =
    entityType && entityId
      ? {
          type: entityType,
          id: entityId,
          label: label || quotationNumber || bookingNumber,
          customerName,
          recipientEmail,
          recipientPhone,
          quotationNumber,
          bookingNumber,
          eventDate,
          venue,
          amount,
        }
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compose Message"
        description="Send multichannel client communications across Email, SMS, WhatsApp, or log internal operational notes."
        backHref={`/tenant/${tenantSlug}/communications`}
        backLabel="Back to Communications"
      />

      <TenantQuotaCard />

      <CommunicationComposerForm
        tenantSlug={tenantSlug}
        initialContext={initialContext}
      />
    </div>
  );
}
