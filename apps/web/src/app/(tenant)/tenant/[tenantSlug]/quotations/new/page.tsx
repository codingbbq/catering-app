"use client";

import type { CreateQuotationRequest } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { QuotationForm } from "@/features/quotations/quotation-form";
import { createQuotation } from "@/lib/quotations-api";
import { useAuth } from "@/providers/auth-provider";

export default function NewQuotationPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const enquiryIdFromQuery = searchParams.get("enquiryId") || undefined;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const createMutation = useMutation({
    mutationFn: (dto: CreateQuotationRequest) =>
      createQuotation(dto, accessToken!),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "quotations"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "enquiries"] });
      router.push(`/tenant/${tenantSlug}/quotations/${created.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Quotation"
        description="Build a commercial proposal linked to a sales enquiry, configure itemized line items, and generate Revision 1."
        backHref={`/tenant/${tenantSlug}/quotations`}
        backLabel="Back to Quotations"
      />

      <QuotationForm
        mode="create_quotation"
        initialEnquiryId={enquiryIdFromQuery}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
        isSubmitting={createMutation.isPending}
        onCancel={() => router.push(`/tenant/${tenantSlug}/quotations`)}
      />
    </div>
  );
}
