"use client";

import type { TenantDetail, TenantStatus } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  activateTenant,
  archiveTenant,
  getTenant,
  suspendTenant,
  updateTenant,
} from "@/lib/platform-api";
import { useAuth } from "@/providers/auth-provider";

const STATUS_BADGE: Record<TenantStatus, string> = {
  onboarding: "badge-info",
  active: "badge-success",
  suspended: "badge-warning",
  archived: "badge-neutral",
};

const LIFECYCLE_ACTIONS: Record<TenantStatus, { label: string; action: string; css: string }[]> = {
  onboarding: [
    { label: "Activate", action: "activate", css: "btn-success" },
    { label: "Archive", action: "archive", css: "btn-neutral" },
  ],
  active: [
    { label: "Suspend", action: "suspend", css: "btn-warning" },
    { label: "Archive", action: "archive", css: "btn-neutral" },
  ],
  suspended: [
    { label: "Reactivate", action: "activate", css: "btn-success" },
    { label: "Archive", action: "archive", css: "btn-neutral" },
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

  const lifecycleMutation = useMutation({
    mutationFn: ({ action }: { action: string }) => {
      const fn = ACTION_FN[action];
      if (!fn) throw new Error(`Unknown action: ${action}`);
      return fn(tenantId, accessToken!);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Action failed.");
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
    onSuccess: () => {
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed.");
    },
  });

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant not found</h2>
        <Link href="/platform" className="btn btn-ghost btn-sm">
          Back to tenants
        </Link>
      </div>
    );
  }

  const actions = LIFECYCLE_ACTIONS[tenant.status];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/platform" className="btn btn-ghost btn-sm">
        &larr; Back to tenants
      </Link>

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{tenant.displayName}</h2>
          <p className="font-mono text-sm text-base-content/60">{tenant.slug}</p>
        </div>
        <span className={`badge ${STATUS_BADGE[tenant.status]}`}>{tenant.status}</span>
      </div>

      {/* Detail card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {editMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <fieldset className="fieldset">
                <label className="fieldset-label" htmlFor="editDisplayName">Display name</label>
                <input
                  id="editDisplayName"
                  type="text"
                  className="input input-bordered w-full"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-3">
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="editTimezone">Timezone</label>
                  <input
                    id="editTimezone"
                    type="text"
                    className="input input-bordered w-full"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="editCurrency">Currency</label>
                  <input
                    id="editCurrency"
                    type="text"
                    className="input input-bordered w-full"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <label className="fieldset-label" htmlFor="editLocale">Locale</label>
                  <input
                    id="editLocale"
                    type="text"
                    className="input input-bordered w-full"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  />
                </fieldset>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
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
                  className="btn btn-secondary btn-sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
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
                  <p className="text-xs font-medium uppercase text-base-content/50">Tenant ID</p>
                  <p className="font-mono text-sm">{tenant.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Users</p>
                  <p className="text-sm">{tenant.userCount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Timezone</p>
                  <p className="text-sm">{tenant.settings?.timezone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Currency</p>
                  <p className="text-sm">{tenant.settings?.currencyCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Locale</p>
                  <p className="text-sm">{tenant.settings?.locale ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-base-content/50">Created</p>
                  <p className="text-sm">{new Date(tenant.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="card-actions justify-end pt-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lifecycle actions */}
      {actions.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Lifecycle Actions</h3>
            <p className="text-sm text-base-content/70">
              Change the tenant&apos;s status. These actions are audited.
            </p>
            <div className="flex gap-2 pt-2">
              {actions.map(({ label, action, css }) => (
                <button
                  key={action}
                  className={`btn btn-sm ${css}`}
                  onClick={() => lifecycleMutation.mutate({ action })}
                  disabled={lifecycleMutation.isPending}
                >
                  {lifecycleMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tenant.status === "archived" && (
        <div className="rounded-2xl border border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">
          This tenant is archived. No further lifecycle transitions are available.
        </div>
      )}
    </div>
  );
}
