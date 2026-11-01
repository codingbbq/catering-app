"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Platform access required</h2>
        <Link href="/platform/sign-in" className="btn btn-secondary btn-sm">
          Sign in
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
      <div>
        <Link href="/platform" className="btn btn-ghost btn-sm mb-2">
          &larr; Back to tenants
        </Link>
        <h2 className="text-2xl font-semibold">Create Tenant</h2>
        <p className="text-sm text-base-content/70">
          Onboard a new tenant business. It will start in &ldquo;onboarding&rdquo; status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow">
        <div className="card-body space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              type="text"
              className="input input-bordered w-full"
              placeholder="Acme Catering Co"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={160}
            />
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="slug">Slug</label>
            <input
              id="slug"
              type="text"
              className="input input-bordered w-full font-mono"
              placeholder="acme-catering"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              minLength={2}
              maxLength={64}
            />
            <p className="mt-1 text-xs text-base-content/50">
              Lowercase letters, numbers, and hyphens. Used in URLs.
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <fieldset className="fieldset">
              <label className="fieldset-label" htmlFor="timezone">Timezone</label>
              <input
                id="timezone"
                type="text"
                className="input input-bordered w-full"
                placeholder="UTC"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset">
              <label className="fieldset-label" htmlFor="currencyCode">Currency</label>
              <input
                id="currencyCode"
                type="text"
                className="input input-bordered w-full"
                placeholder="USD"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                minLength={3}
              />
            </fieldset>

            <fieldset className="fieldset">
              <label className="fieldset-label" htmlFor="locale">Locale</label>
              <input
                id="locale"
                type="text"
                className="input input-bordered w-full"
                placeholder="en"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              />
            </fieldset>
          </div>

          <div className="card-actions justify-end pt-2">
            <Link href="/platform" className="btn btn-ghost btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Create tenant"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
