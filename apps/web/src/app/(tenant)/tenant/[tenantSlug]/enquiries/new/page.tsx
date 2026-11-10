"use client";

import type { CreateEnquiryRequest } from "@catering/shared-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EnquiryForm } from "@/features/enquiries/enquiry-form";
import { listCustomers } from "@/lib/customers-api";
import { createEnquiry } from "@/lib/enquiries-api";
import { useAuth } from "@/providers/auth-provider";

export default function NewEnquiryPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") ?? undefined;
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch active customers to populate the dropdown
  const { data: customerData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["tenant", tenantSlug, "customers-options"],
    queryFn: () => listCustomers(accessToken!, { isActive: true }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const mutation = useMutation({
    mutationFn: (values: CreateEnquiryRequest) => createEnquiry(values, accessToken!),
    onSuccess: (newEnquiry) => {
      router.push(`/tenant/${tenantSlug}/enquiries/${newEnquiry.id}`);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to create enquiry.");
    },
  });

  const handleSubmit = async (values: CreateEnquiryRequest) => {
    setErrorMessage(null);
    await mutation.mutateAsync(values);
  };

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to create sales enquiries.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const customerOptions = (customerData?.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Record New Enquiry"
        description="Capture lead details, guest count, and service preferences."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/enquiries`}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA]"
          >
            ← Back to Enquiries
          </Link>
        }
      />

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      {isLoadingCustomers ? (
        <div className="flex h-36 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white">
          <p className="text-xs text-[#737373]">Loading customer accounts...</p>
        </div>
      ) : customerOptions.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
          <p className="text-xs font-medium text-amber-900">
            No customer accounts found. You must create or import a customer before logging an enquiry.
          </p>
          <Link
            href={`/tenant/${tenantSlug}/customers/new`}
            className="inline-flex rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
          >
            + Create Customer First
          </Link>
        </div>
      ) : (
        <EnquiryForm
          customerOptions={customerOptions}
          initialValues={{ customerId: preselectedCustomerId }}
          isPending={mutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/tenant/${tenantSlug}/enquiries`)}
          submitLabel="Create Enquiry"
        />
      )}
    </div>
  );
}
