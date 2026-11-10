"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createTenant } from "@/lib/platform-api";
import { useAuth } from "@/providers/auth-provider";

export default function CreateTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isPlatform } = useAuth();
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !isPlatform) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Platform Access Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in as a platform administrator to proceed.</p>
        <Link
          href="/platform/sign-in"
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tenant = await createTenant(
        {
          slug,
          displayName,
          settings: { timezone, currencyCode, locale },
        },
        accessToken!,
      );
      await queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      router.push(`/platform/tenants/${tenant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Provision Tenant Organization"
        description="Onboard a new catering business organization with isolated schema governance."
        backHref="/platform"
        backLabel="Back to Tenants"
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="tenant-name">
                Business Display Name *
              </label>
              <input
                id="tenant-name"
                type="text"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                placeholder="e.g. Apex Catering Co."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="tenant-slug">
                Workspace Slug *
              </label>
              <div className="flex items-center rounded border border-[#E5E5E5] bg-white focus-within:border-[#171717] focus-within:ring-1 focus-within:ring-[#171717]">
                <span className="pl-3 text-xs text-[#A3A3A3] font-mono">/tenant/</span>
                <input
                  id="tenant-slug"
                  type="text"
                  className="w-full bg-transparent px-1 py-2 text-sm text-[#262626] font-mono placeholder-[#A3A3A3] focus:outline-none"
                  placeholder="apex-catering"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  required
                />
              </div>
              <p className="text-[11px] text-[#737373]">Lowercase alphanumeric and hyphens only.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-[#F0F0F0]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="tenant-tz">
                  Timezone
                </label>
                <input
                  id="tenant-tz"
                  type="text"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="UTC"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="tenant-curr">
                  Currency Code
                </label>
                <input
                  id="tenant-curr"
                  type="text"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] uppercase font-mono focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="tenant-locale">
                  Locale
                </label>
                <input
                  id="tenant-locale"
                  type="text"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  placeholder="en"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0F0F0]">
              <Link
                href="/platform"
                className="rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Provisioning..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
