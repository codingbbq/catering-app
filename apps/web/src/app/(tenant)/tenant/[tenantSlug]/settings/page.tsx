"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant access required</h2>
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/tenant/${tenantSlug}`} className="btn btn-ghost btn-sm mb-2">
          &larr; Dashboard
        </Link>
        <h2 className="text-2xl font-semibold">Business Settings</h2>
        <p className="text-sm text-base-content/70">
          View and manage your tenant business profile.
        </p>
      </div>

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {editMode ? (
            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
              className="space-y-4"
            >
              <fieldset className="fieldset">
                <label className="fieldset-label" htmlFor="displayName">Display name</label>
                <input
                  id="displayName"
                  type="text"
                  className="input input-bordered w-full"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-3">
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="timezone">Timezone</label>
                  <input
                    id="timezone"
                    type="text"
                    className="input input-bordered w-full"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="currency">Currency</label>
                  <input
                    id="currency"
                    type="text"
                    className="input input-bordered w-full"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="locale">Locale</label>
                  <input
                    id="locale"
                    type="text"
                    className="input input-bordered w-full"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  />
                </fieldset>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditMode(false);
                    if (profile) {
                      setDisplayName(profile.displayName);
                      setTimezone(profile.settings?.timezone ?? "UTC");
                      setCurrencyCode(profile.settings?.currencyCode ?? "USD");
                      setLocale(profile.settings?.locale ?? "en");
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Display Name</p>
                  <p className="text-sm">{profile?.displayName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Slug</p>
                  <p className="font-mono text-sm">{profile?.slug}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Status</p>
                  <p className="text-sm">{profile?.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Timezone</p>
                  <p className="text-sm">{profile?.settings?.timezone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Currency</p>
                  <p className="text-sm">{profile?.settings?.currencyCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Locale</p>
                  <p className="text-sm">{profile?.settings?.locale ?? "—"}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="card-actions justify-end pt-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                    Edit
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
