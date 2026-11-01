"use client";

import type { TenantStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listTenants } from "@/lib/platform-api";
import { useAuth } from "@/providers/auth-provider";

const STATUS_BADGE: Record<TenantStatus, string> = {
  onboarding: "badge-info",
  active: "badge-success",
  suspended: "badge-warning",
  archived: "badge-neutral",
};

export default function PlatformPage() {
  const { accessToken, isAuthenticated, isPlatform } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => listTenants(accessToken!),
    enabled: isAuthenticated && isPlatform && !!accessToken,
  });

  if (!isAuthenticated || !isPlatform) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Platform access required</h2>
        <p className="text-base-content/70">Sign in as a platform admin to continue.</p>
        <Link href="/platform/sign-in" className="btn btn-secondary btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tenants</h2>
          <p className="text-sm text-base-content/70">
            Manage tenant businesses, lifecycle state, and platform governance.
          </p>
        </div>
        <Link href="/platform/tenants/new" className="btn btn-secondary btn-sm">
          Create tenant
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error instanceof Error ? error.message : "Failed to load tenants."}</span>
        </div>
      )}

      {data && data.total === 0 && (
        <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-base-content/70">
          <p>No tenants yet. Create the first one to get started.</p>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Users</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="font-medium">{tenant.displayName}</td>
                  <td className="font-mono text-sm">{tenant.slug}</td>
                  <td>
                    <span className={`badge badge-sm ${STATUS_BADGE[tenant.status]}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td>{tenant.userCount}</td>
                  <td className="text-sm text-base-content/70">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="btn btn-ghost btn-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p className="text-xs text-base-content/50">
          {data.total} tenant{data.total !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
