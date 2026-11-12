"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuotationDetailsView } from "@/features/quotations/quotation-details-view";
import { getQuotation } from "@/lib/quotations-api";
import { useAuth } from "@/providers/auth-provider";

export default function QuotationDetailPage() {
  const { tenantSlug, quotationId } = useParams<{
    tenantSlug: string;
    quotationId: string;
  }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const queryKey = ["tenant", tenantSlug, "quotation", quotationId];

  const { data: quotation, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getQuotation(quotationId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!quotationId,
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">
          Workspace Authentication Required
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Sign in to view this quotation.
        </p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
        Loading quotation details...
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-xs font-medium text-red-800">
          Failed to load quotation: {(error as Error)?.message || "Not found"}
        </p>
        <div className="mt-3 flex justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-red-800 underline"
          >
            Retry
          </button>
          <Link
            href={`/tenant/${tenantSlug}/quotations`}
            className="text-xs text-[#737373] underline"
          >
            Back to Quotations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <QuotationDetailsView quotation={quotation} tenantSlug={tenantSlug} />
  );
}
