"use client";

import type { TenantStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import { listTenants } from "@/lib/platform-api";
import { getPlatformTenantSummary } from "@/lib/reports-api";
import { useAuth } from "@/providers/auth-provider";

const STATUS_VARIANT: Record<TenantStatus, StatusVariant> = {
  onboarding: "neutral",
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

export default function PlatformPage() {
  const { accessToken, isAuthenticated, isPlatform } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => listTenants(accessToken!),
    enabled: isAuthenticated && isPlatform && !!accessToken,
  });

  const { data: summaryData } = useQuery({
    queryKey: ["platform", "reports", "tenant-summary"],
    queryFn: () => getPlatformTenantSummary(accessToken!),
    enabled: isAuthenticated && isPlatform && !!accessToken,
  });

  if (!isAuthenticated || !isPlatform) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Platform Access Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in as a platform administrator to manage tenants.</p>
        <Link
          href="/platform/sign-in"
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In to Platform
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants & Organizations"
        description="Govern multi-tenant organizations, lifecycle statuses, database schemas, and platform oversight metrics."
        actions={
          <Link
            href="/platform/tenants/new"
            className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
          >
            <span className="text-sm leading-none">+</span>
            <span>Create Tenant</span>
          </Link>
        }
      />

      {/* Super Admin Platform Overview Cards */}
      {summaryData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Tenants</p>
              <StatusBadge variant="success">Platform Active</StatusBadge>
            </div>
            <p className="text-xl font-bold font-mono text-[#171717]">{summaryData.totalTenants}</p>
            <div className="text-[11px] text-[#737373] flex items-center gap-2">
              <span>{summaryData.tenantsByStatus.active ?? 0} active</span>
              <span>•</span>
              <span>{summaryData.tenantsByStatus.onboarding ?? 0} onboarding</span>
              {summaryData.tenantsByStatus.suspended ? (
                <>
                  <span>•</span>
                  <span className="text-amber-700">{summaryData.tenantsByStatus.suspended} suspended</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">User Accounts</p>
            <p className="text-xl font-bold font-mono text-[#171717]">{summaryData.totalTenantUsers}</p>
            <p className="text-[11px] text-[#737373]">
              Across all workspaces ({summaryData.totalPlatformUsers} platform operators)
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Platform Events</p>
            <p className="text-xl font-bold font-mono text-[#171717]">{summaryData.totalBookingsCount}</p>
            <p className="text-[11px] text-[#737373]">
              {summaryData.totalInvoicesCount} commercial invoices issued
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Catalogue Scale</p>
            <p className="text-xl font-bold font-mono text-[#171717]">{summaryData.totalCatalogueItemsCount}</p>
            <p className="text-[11px] text-[#737373]">Master food dishes in database</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          {error instanceof Error ? error.message : "Failed to load platform tenants."}
        </div>
      )}

      {data && data.total === 0 && (
        <EmptyState
          title="No tenants registered"
          description="Provision the first catering tenant business to begin operational workflows."
          action={
            <Link
              href="/platform/tenants/new"
              className="inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              Create Tenant
            </Link>
          }
        />
      )}

      {data && data.total > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Slug Identifier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Users</th>
                  <th className="py-3 px-4">Provisioned</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {data.data.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#171717]">
                      {tenant.displayName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#737373]">
                      {tenant.slug}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge variant={STATUS_VARIANT[tenant.status]}>
                        {tenant.status}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4 text-[#737373]">{tenant.userCount}</td>
                    <td className="py-3 px-4 text-[#737373]">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/platform/tenants/${tenant.id}`}
                        className="inline-flex items-center rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                      >
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] px-4 py-2 text-[11px] text-[#737373]">
            {data.total} tenant {data.total === 1 ? "organization" : "organizations"} active on platform
          </div>
        </Card>
      )}
    </div>
  );
}
