"use client";

import type { AuthSession } from "@catering/shared-types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { platformSignIn } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";

export default function PlatformSignInPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await platformSignIn({ email, password });
      const session: AuthSession = {
        userId: res.user.id,
        email: res.user.email,
        displayName: res.user.displayName,
        scope: "platform",
        role: res.user.role,
      };
      setAuth(res.accessToken, res.refreshToken, session);
      router.push("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-md bg-base-100 shadow-xl">
      <div className="card-body">
        <h1 className="card-title text-2xl">Platform Sign In</h1>
        <p className="text-sm text-base-content/70">Super Admin Console access</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input input-bordered w-full"
              placeholder="admin@platform.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input input-bordered w-full"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </fieldset>

          <button type="submit" className="btn btn-secondary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
