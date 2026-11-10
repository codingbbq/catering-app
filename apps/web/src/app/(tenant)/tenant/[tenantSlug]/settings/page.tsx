"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantProfile, updateTenantProfile } from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";

export default function TenantSettingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isTenant, session } = useAuth();
  const isAdmin = session?.role === "owner" || session?.role === "admin";

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [locale, setLocale] = useState("");
  const [error, setError] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => getTenantProfile(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
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

  const mutation = useMutation({
    mutationFn: () =>
      updateTenantProfile(
        { displayName, settings: { timezone, currencyCode, locale } },
        accessToken!,
      ),
    onSuccess: () => {
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed.");
    },
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Business Profile &amp; Settings"
        description="Configure your catering business identity, accounting currency, and operating timezone."
        backHref={`/tenant/${tenantSlug}`}
        backLabel="Back to Dashboard"
      />

      {error && (
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span>{error}</span>
          <button
            type="button"
            className="text-xs font-medium underline hover:no-underline"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Business Configuration</CardTitle>
            <CardDescription>Primary operating parameters for quotations and invoices.</CardDescription>
          </div>
          {isAdmin && !editMode && (
            <button
              type="button"
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
              onClick={() => setEditMode(true)}
            >
              Edit Settings
            </button>
          )}
        </CardHeader>

        <CardContent>
          {editMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-display-name">
                  Business Display Name
                </label>
                <input
                  id="edit-display-name"
                  type="text"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-timezone">
                    Operating Timezone
                  </label>
                  <input
                    id="edit-timezone"
                    type="text"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-currency">
                    Billing Currency
                  </label>
                  <input
                    id="edit-currency"
                    type="text"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] uppercase font-mono focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="edit-locale-code">
                    Locale Formatting
                  </label>
                  <input
                    id="edit-locale-code"
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
                  className="rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => {
                    setEditMode(false);
                    setDisplayName(profile?.displayName ?? "");
                    setTimezone(profile?.settings?.timezone ?? "UTC");
                    setCurrencyCode(profile?.settings?.currencyCode ?? "USD");
                    setLocale(profile?.settings?.locale ?? "en");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Workspace Slug
                </span>
                <p className="font-mono text-[#262626]">{tenantSlug}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Operating Currency
                </span>
                <p className="font-mono text-[#262626] font-semibold">
                  {profile?.settings?.currencyCode ?? "USD"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Timezone
                </span>
                <p className="text-[#262626]">{profile?.settings?.timezone ?? "UTC"}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                  Locale
                </span>
                <p className="text-[#262626]">{profile?.settings?.locale ?? "en"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
