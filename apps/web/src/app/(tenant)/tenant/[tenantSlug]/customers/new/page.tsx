"use client";

import type { CreateCustomerRequest } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/features/customers/customer-form";
import { createCustomer } from "@/lib/customers-api";
import { useAuth } from "@/providers/auth-provider";

export default function NewCustomerPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (dto: CreateCustomerRequest) => createCustomer(dto, accessToken!),
    onSuccess: (newCustomer) => {
      void queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "customers"],
      });
      router.push(`/tenant/${tenantSlug}/customers/${newCustomer.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create customer.");
    },
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to add a new customer.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Add Customer Account"
        description="Provision an account for a wedding host, corporate client, or recurring catering account."
        backHref={`/tenant/${tenantSlug}/customers`}
        backLabel="Back to Customers"
      />

      {error && (
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span>{error}</span>
          <button
            type="button"
            className="text-xs font-medium underline hover:no-underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardContent>
          <CustomerForm
            onSubmit={(values) => {
              setError(null);
              mutation.mutate(values);
            }}
            onCancel={() => router.push(`/tenant/${tenantSlug}/customers`)}
            isPending={mutation.isPending}
            submitLabel="Create Customer"
          />
        </CardContent>
      </Card>
    </div>
  );
}
