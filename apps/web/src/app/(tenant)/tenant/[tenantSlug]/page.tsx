"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTenantProfile } from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

export default function TenantDashboardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { currencyCode, currencySymbol } = useTenantCurrency();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => getTenantProfile(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access your catering workspace.</p>
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
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile?.displayName ?? tenantSlug}
        description="Daily catering operations, client accounts, menus, and event management."
        badge={<StatusBadge variant="success">Workspace Active</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/tenant/${tenantSlug}/enquiries/new`}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Enquiry</span>
            </Link>
            <Link
              href={`/tenant/${tenantSlug}/customers/new`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Customer</span>
            </Link>
          </div>
        }
      />

      {/* Operational Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Workspace</p>
          <p className="text-lg font-bold text-[#171717]">{tenantSlug}</p>
          <p className="text-[11px] text-[#737373]">Tenant isolation active</p>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Currency &amp; Timezone</p>
          <p className="text-lg font-bold text-[#171717]">{currencyCode} ({currencySymbol})</p>
          <p className="text-[11px] text-[#737373]">{profile?.settings?.timezone ?? "UTC"}</p>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">CRM Pipeline</p>
          <p className="text-lg font-bold text-[#171717]">Customer Accounts</p>
          <p className="text-[11px] text-[#737373]">Contacts &amp; Profiles</p>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Operational Health</p>
          <p className="text-lg font-bold text-emerald-700">100% Online</p>
          <p className="text-[11px] text-[#737373]">Database synced</p>
        </div>
      </div>

      {/* Quick Launchpad Navigation */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
          Operational Modules
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/tenant/${tenantSlug}/customers`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Customers &amp; Contacts</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Manage client accounts, corporate accounts, key contact persons, and address records.
            </p>
          </Link>

          <Link
            href={`/tenant/${tenantSlug}/enquiries`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Sales Enquiries &amp; Pipeline</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Capture event opportunities, qualify leads, track timeline history, and prepare quotations.
            </p>
          </Link>

          <Link
            href={`/tenant/${tenantSlug}/catalogue`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Food Catalogue &amp; Pricing</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Maintain master dishes, portion units, raw costs, selling rates, and dietary tags for menus.
            </p>
          </Link>

          <Link
            href={`/tenant/${tenantSlug}/users`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <StatusBadge variant="neutral">Team</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Team &amp; Access Roles</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Invite team members, assign granular permissions (Owner, Admin, Manager, Staff), and manage access.
            </p>
          </Link>

          <Link
            href={`/tenant/${tenantSlug}/settings`}
            className="group rounded-lg border border-[#E5E5E5] bg-white p-5 hover:border-[#171717] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <StatusBadge variant="neutral">Config</StatusBadge>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#171717]">Business Settings</h4>
            <p className="mt-1 text-xs text-[#737373] leading-relaxed">
              Configure business profile, default currency, operating timezone, and regional locales.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
