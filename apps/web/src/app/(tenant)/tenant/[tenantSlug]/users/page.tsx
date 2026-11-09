"use client";

import type { TenantRole } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  createInvitation,
  deactivateTenantUser,
  listInvitations,
  listTenantUsers,
  updateTenantUserRole,
} from "@/lib/tenant-admin-api";
import { useAuth } from "@/providers/auth-provider";

const ROLES: TenantRole[] = ["owner", "admin", "manager", "staff"];

const ROLE_BADGE: Record<TenantRole, string> = {
  owner: "badge-primary",
  admin: "badge-secondary",
  manager: "badge-accent",
  staff: "badge-ghost",
};

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
      setError(err instanceof Error ? err.message : "Invitation failed.");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TenantRole }) =>
      updateTenantUserRole(userId, { role }, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Role change failed.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateTenantUser(userId, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Deactivation failed.");
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

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tenant/${tenantSlug}`} className="btn btn-ghost btn-sm mb-2">
          &larr; Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Team &amp; Users</h2>
            <p className="text-sm text-base-content/70">
              Manage team members, roles, and invitations.
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowInviteForm(!showInviteForm)}
            >
              {showInviteForm ? "Cancel" : "Invite user"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && isAdmin && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Invite a team member</h3>
            <form
              onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }}
              className="flex flex-wrap items-end gap-3"
            >
              <fieldset className="fieldset flex-1">
                <label className="fieldset-label" htmlFor="inviteEmail">Email</label>
                <input
                  id="inviteEmail"
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </fieldset>
              <fieldset className="fieldset w-40">
                <label className="fieldset-label" htmlFor="inviteRole">Role</label>
                <select
                  id="inviteRole"
                  className="select select-bordered w-full"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TenantRole)}
                >
                  {ROLES.filter((r) => isOwner || r !== "owner").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </fieldset>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Send invitation"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User list */}
      {usersLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Users</h3>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users?.data.map((user) => (
                    <tr key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                      <td className="font-medium">{user.displayName}</td>
                      <td className="text-sm">{user.email}</td>
                      <td>
                        {isAdmin && user.isActive && user.id !== session?.userId ? (
                          <select
                            className="select select-bordered select-xs"
                            value={user.role}
                            onChange={(e) =>
                              roleMutation.mutate({
                                userId: user.id,
                                role: e.target.value as TenantRole,
                              })
                            }
                            disabled={
                              roleMutation.isPending ||
                              (user.role === "owner" && !isOwner)
                            }
                          >
                            {ROLES.filter((r) => isOwner || r !== "owner").map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge badge-sm ${ROLE_BADGE[user.role]}`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${user.isActive ? "badge-success" : "badge-error"}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          {user.isActive && user.id !== session?.userId && (
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => deactivateMutation.mutate(user.id)}
                              disabled={
                                deactivateMutation.isPending ||
                                (user.role === "owner" && !isOwner)
                              }
                            >
                              Deactivate
                            </button>
                          )}
                          {user.id === session?.userId && (
                            <span className="text-xs text-base-content/50">You</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users && (
              <p className="text-xs text-base-content/50 pt-2">
                {users.total} user{users.total !== 1 ? "s" : ""} total
              </p>
            )}
          </div>
        </div>
      )}

      {/* Invitations */}
      {isAdmin && invitations && invitations.total > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Invitations</h3>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.data.map((inv) => (
                    <tr key={inv.id}>
                      <td className="text-sm">{inv.email}</td>
                      <td>
                        <span className={`badge badge-sm ${ROLE_BADGE[inv.role]}`}>
                          {inv.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            inv.status === "pending"
                              ? "badge-warning"
                              : inv.status === "accepted"
                                ? "badge-success"
                                : "badge-error"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/70">
                        {new Date(inv.expiresAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
