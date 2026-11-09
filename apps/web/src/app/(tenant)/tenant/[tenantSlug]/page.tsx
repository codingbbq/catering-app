"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTenantProfile } from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";

export default function TenantPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => getTenantProfile(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant access required</h2>
        <p className="text-base-content/70">Sign in as a tenant user to continue.</p>
        <Link href={`/tenant/${tenantSlug}/sign-in`} className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{profile?.displayName ?? tenantSlug}</h2>
        <p className="text-sm text-base-content/70">Tenant dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/tenant/${tenantSlug}/customers`}
          className="card bg-base-100 shadow transition-shadow hover:shadow-md border-l-4 border-l-primary"
        >
          <div className="card-body">
            <h3 className="card-title text-base">Customers &amp; Contacts</h3>
            <p className="text-sm text-base-content/70">
              Manage client accounts, contact persons, and booking history.
            </p>
          </div>
        </Link>

        <Link
          href={`/tenant/${tenantSlug}/settings`}
          className="card bg-base-100 shadow transition-shadow hover:shadow-md"
        >
          <div className="card-body">
            <h3 className="card-title text-base">Business Settings</h3>
            <p className="text-sm text-base-content/70">
              Manage display name, timezone, currency, and locale.
            </p>
          </div>
        </Link>

        <Link
          href={`/tenant/${tenantSlug}/users`}
          className="card bg-base-100 shadow transition-shadow hover:shadow-md"
        >
          <div className="card-body">
            <h3 className="card-title text-base">Team &amp; Users</h3>
            <p className="text-sm text-base-content/70">
              View users, invite team members, and manage roles.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
