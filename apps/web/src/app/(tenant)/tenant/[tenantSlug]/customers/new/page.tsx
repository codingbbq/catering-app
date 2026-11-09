"use client";

import type { CreateCustomerRequest } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant access required</h2>
        <Link href={`/tenant/${tenantSlug}/sign-in`} className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb / Back Link */}
      <div>
        <Link
          href={`/tenant/${tenantSlug}/customers`}
          className="btn btn-ghost btn-sm -ml-2 mb-2 gap-1 text-base-content/70"
        >
          &larr; Back to Customers
        </Link>
        <h2 className="text-2xl font-semibold">Add New Customer</h2>
        <p className="text-sm text-base-content/70">
          Create an account for an event host, wedding client, or recurring corporate customer.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Card with Customer Form */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-6">
          <CustomerForm
            onSubmit={(values) => {
              setError(null);
              mutation.mutate(values);
            }}
            onCancel={() => router.push(`/tenant/${tenantSlug}/customers`)}
            isPending={mutation.isPending}
            submitLabel="Create Customer"
          />
        </div>
      </div>
    </div>
  );
}
