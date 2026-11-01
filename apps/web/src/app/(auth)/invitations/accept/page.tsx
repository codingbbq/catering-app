"use client";

import type { AuthSession } from "@catering/shared-types";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
    <div className="card w-full max-w-md bg-base-100 shadow-xl">
      <div className="card-body">
        <h1 className="card-title text-2xl">Accept Invitation</h1>
        <p className="text-sm text-base-content/70">
          Set up your account to join the team.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="displayName">Your name</label>
            <input
              id="displayName"
              type="text"
              className="input input-bordered w-full"
              placeholder="Your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input input-bordered w-full"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input input-bordered w-full"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </fieldset>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
