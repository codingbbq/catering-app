"use client";

import type { AuthSession } from "@catering/shared-types";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { acceptInvitation } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { setAuth } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invitation token is missing.");
      return;
    }

    setLoading(true);

    try {
      const res = await acceptInvitation({ token, password, displayName });
      const session: AuthSession = {
        userId: res.user.id,
        email: res.user.email,
        displayName: res.user.displayName,
        scope: "tenant",
        role: res.user.role,
        tenantId: res.user.tenantId,
        tenantSlug: res.user.tenantSlug,
      };
      setAuth(res.accessToken, res.refreshToken, session);
      router.push(`/tenant/${res.user.tenantSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Accept Team Invitation</CardTitle>
        <CardDescription>
          Complete your account setup to join the catering workspace
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="full-name">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="e.g. Sarah Jenkins"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="invitation-password">
              Create Password
            </label>
            <input
              id="invitation-password"
              type="password"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="confirm-invitation-password">
              Confirm Password
            </label>
            <input
              id="confirm-invitation-password"
              type="password"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-[#171717] py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Activating..." : "Join Workspace"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
