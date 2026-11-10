"use client";

import type { TenantDetail, TenantStatus } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import {
  activateTenant,
  archiveTenant,
  getTenant,
  suspendTenant,
  updateTenant,
} from "@/lib/platform-api";
import { useAuth } from "@/providers/auth-provider";

const STATUS_VARIANT: Record<TenantStatus, StatusVariant> = {
  onboarding: "neutral",
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

interface LifecycleConfig {
  label: string;
  action: string;
  styleClass: string;
}

const LIFECYCLE_ACTIONS: Record<TenantStatus, LifecycleConfig[]> = {
  onboarding: [
    {
      label: "Activate Tenant",
      action: "activate",
      styleClass: "bg-[#171717] text-white hover:bg-[#262626] border-[#171717]",
    },
    {
      label: "Archive",
      action: "archive",
      styleClass: "bg-white text-[#737373] hover:text-[#171717] border-[#E5E5E5] hover:bg-[#F5F5F5]",
    },
  ],
  active: [
    {
      label: "Suspend Access",
      action: "suspend",
      styleClass: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    },
    {
      label: "Archive",
      action: "archive",
      styleClass: "bg-white text-[#737373] hover:text-[#171717] border-[#E5E5E5] hover:bg-[#F5F5F5]",
    },
  ],
  suspended: [
    {
      label: "Reactivate Access",
      action: "activate",
      styleClass: "bg-[#171717] text-white hover:bg-[#262626] border-[#171717]",
    },
    {
      label: "Archive",
      action: "archive",
      styleClass: "bg-white text-[#737373] hover:text-[#171717] border-[#E5E5E5] hover:bg-[#F5F5F5]",
    },
  ],
  archived: [],
};

const ACTION_FN: Record<string, (id: string, token: string) => Promise<TenantDetail>> = {
  activate: activateTenant,
  suspend: suspendTenant,
  archive: archiveTenant,
};

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isPlatform } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [locale, setLocale] = useState("");
  const [error, setError] = useState("");

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["platform", "tenant", tenantId],
    queryFn: () => getTenant(tenantId, accessToken!),
    enabled: isAuthenticated && isPlatform && !!accessToken,
    select(data) {
      if (!editMode && !displayName) {
        setDisplayName(data.displayName);
        setTimezone(data.settings?.timezone ?? "UTC");
        setCurrencyCode(data.settings?.currencyCode ?? "USD");
        setLocale(data.settings?.locale ?? "en");
      }
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTenant(
        tenantId,
        {
          displayName,
          settings: { timezone, currencyCode, locale },
        },
        accessToken!,
      ),
    onSuccess: (updated) => {
      setEditMode(false);
      queryClient.setQueryData(["platform", "tenant", tenantId], updated);
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to update tenant.");
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ action }: { action: string }) => {
      const fn = ACTION_FN[action];
      if (!fn) throw new Error(`Unknown action: ${action}`);
      return fn(tenantId, accessToken!);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform", "tenant", tenantId], updated);
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Lifecycle transition failed.");
    },
  });

  if (!isAuthenticated || !isPlatform) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Platform Access Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in as a platform administrator to inspect this tenant.</p>
        <Link
          href="/platform/sign-in"
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

  if (!tenant) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <h2 className="text-base font-semibold text-[#171717]">Tenant Not Found</h2>
        <p className="text-xs text-[#737373]">The requested tenant record could not be found or has been removed.</p>
        <Link
          href="/platform"
          className="inline-flex items-center justify-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
        >
          &larr; Back to Platform
        </Link>
      </div>
    );
  }

  const actions = LIFECYCLE_ACTIONS[tenant.status] ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={tenant.displayName}
        description={`Organization Slug: /tenant/${tenant.slug}`}
        backHref="/platform"
        backLabel="Back to Tenants"
        badge={
          <StatusBadge variant={STATUS_VARIANT[tenant.status]}>
            {tenant.status}
          </StatusBadge>
        }
        actions={
          <Link
            href={`/tenant/${tenant.slug}`}
            className="inline-flex items-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
          >
            Open Workspace &rarr;
          </Link>
        }
      />

      {error && (
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-medium text-rose-800 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Detail Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Organization Settings &amp; Configuration</CardTitle>
          {!editMode && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
            >
              Edit Profile
            </button>
          )}
        </CardHeader>

        <CardContent>
          {editMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-name">
                  Display Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-tz">
                    Timezone
                  </label>
                  <input
                    id="edit-tz"
                    type="text"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-curr">
                    Currency
                  </label>
                  <input
                    id="edit-curr"
                    type="text"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] uppercase font-mono focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-locale">
                    Locale
                  </label>
                  <input
                    id="edit-locale"
                    type="text"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
                <button
                  type="button"
                  className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => {
                    setEditMode(false);
                    setDisplayName(tenant.displayName);
                    setTimezone(tenant.settings?.timezone ?? "UTC");
                    setCurrencyCode(tenant.settings?.currencyCode ?? "USD");
                    setLocale(tenant.settings?.locale ?? "en");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Internal Tenant ID
                </span>
                <p className="font-mono text-[#262626] select-all">{tenant.id}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Registered Users
                </span>
                <p className="text-[#262626] font-medium">{tenant.userCount} users</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Timezone &amp; Currency
                </span>
                <p className="text-[#262626]">
                  {tenant.settings?.timezone ?? "UTC"} ({tenant.settings?.currencyCode ?? "USD"})
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Provisioned Timestamp
                </span>
                <p className="text-[#262626]">{new Date(tenant.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Actions */}
      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle &amp; Access Controls</CardTitle>
            <CardDescription>
              Regulate tenant status across the platform cluster. State transitions trigger audit logging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2.5">
              {actions.map(({ label, action, styleClass }) => (
                <button
                  key={action}
                  type="button"
                  className={`inline-flex items-center rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${styleClass}`}
                  onClick={() => lifecycleMutation.mutate({ action })}
                  disabled={lifecycleMutation.isPending}
                >
                  {lifecycleMutation.isPending ? "Updating..." : label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tenant.status === "archived" && (
        <div className="rounded border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-4 text-center text-xs text-[#737373]">
          This tenant organization is archived. Data remains preserved under immutable read status.
        </div>
      )}
    </div>
  );
}
