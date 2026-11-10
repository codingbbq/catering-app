"use client";

import type { TenantRole } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import {
  createInvitation,
  deactivateTenantUser,
  listInvitations,
  listTenantUsers,
  updateTenantUserRole,
} from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";

const ROLES: TenantRole[] = ["owner", "admin", "manager", "staff"];

export default function TenantUsersPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isTenant, session } = useAuth();
  const isAdmin = session?.role === "owner" || session?.role === "admin";
  const isOwner = session?.role === "owner";

  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TenantRole>("staff");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["tenant", "users"],
    queryFn: () => listTenantUsers(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const { data: invitations } = useQuery({
    queryKey: ["tenant", "invitations"],
    queryFn: () => listInvitations(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvitation({ email: inviteEmail, role: inviteRole }, accessToken!),
    onSuccess: () => {
      setInviteEmail("");
      setInviteRole("staff");
      setShowInviteForm(false);
      void queryClient.invalidateQueries({ queryKey: ["tenant", "invitations"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Invitation dispatch failed.");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TenantRole }) =>
      updateTenantUserRole(userId, { role }, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Role modification failed.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateTenantUser(userId, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "User deactivation failed.");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team &amp; Access Controls"
        description="Manage catering staff, kitchen managers, event coordinators, and permission roles."
        actions={
          isAdmin && (
            <button
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>{showInviteForm ? "Close Invite" : "Invite Member"}</span>
            </button>
          )
        }
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

      {/* Invite Member Form Card */}
      {showInviteForm && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Send Workspace Invitation</CardTitle>
            <CardDescription>
              Invite a new team member with pre-configured catering workspace permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[240px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="invite-email">
                  Staff Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  placeholder="colleague@catering.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="w-40 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="invite-role">
                  Permission Role
                </label>
                <select
                  id="invite-role"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#262626] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TenantRole)}
                >
                  {ROLES.filter((r) => isOwner || r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table Card */}
      {usersLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Active Workspace Members</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {users?.data.map((user) => (
                  <tr key={user.id} className={`hover:bg-[#FAFAFA] transition-colors ${!user.isActive ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4 font-medium text-[#171717]">{user.displayName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#737373]">{user.email}</td>
                    <td className="py-3 px-4">
                      {isAdmin && user.isActive && user.id !== session?.userId ? (
                        <select
                          className="rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-xs text-[#262626] focus:outline-none focus:border-[#171717]"
                          value={user.role}
                          onChange={(e) =>
                            roleMutation.mutate({
                              userId: user.id,
                              role: e.target.value as TenantRole,
                            })
                          }
                          disabled={
                            roleMutation.isPending || (user.role === "owner" && !isOwner)
                          }
                        >
                          {ROLES.filter((r) => isOwner || r !== "owner").map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge variant="neutral" showDot={false}>
                          {user.role.toUpperCase()}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge variant={user.isActive ? "success" : "neutral"} showDot={true}>
                        {user.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        {user.isActive && user.id !== session?.userId && (
                          <button
                            type="button"
                            className="rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
                            onClick={() => deactivateMutation.mutate(user.id)}
                            disabled={
                              deactivateMutation.isPending || (user.role === "owner" && !isOwner)
                            }
                          >
                            Deactivate
                          </button>
                        )}
                        {user.id === session?.userId && (
                          <span className="text-[11px] text-[#A3A3A3] italic">Current Session</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users && (
            <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] px-4 py-2 text-[11px] text-[#737373]">
              {users.total} team member{users.total !== 1 ? "s" : ""} registered
            </div>
          )}
        </Card>
      )}

      {/* Invitations Table Card */}
      {isAdmin && invitations && invitations.total > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Pending &amp; Sent Invitations</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4">Recipient Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Invite Status</th>
                  <th className="py-3 px-4">Expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {invitations.data.map((inv) => {
                  const variant: StatusVariant =
                    inv.status === "pending"
                      ? "warning"
                      : inv.status === "accepted"
                        ? "success"
                        : "error";

                  return (
                    <tr key={inv.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#262626]">{inv.email}</td>
                      <td className="py-3 px-4">
                        <StatusBadge variant="neutral" showDot={false}>
                          {inv.role.toUpperCase()}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge variant={variant}>{inv.status}</StatusBadge>
                      </td>
                      <td className="py-3 px-4 text-[#737373]">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
