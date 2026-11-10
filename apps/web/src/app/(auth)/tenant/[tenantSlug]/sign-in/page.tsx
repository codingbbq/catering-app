"use client";

import type { AuthSession } from "@catering/shared-types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { tenantSignIn } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";

export default function TenantSignInPage() {
  const router = useRouter();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
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
      const res = await tenantSignIn(tenantSlug, { email, password });
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
      router.push(`/tenant/${tenantSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Tenant Sign In</CardTitle>
        <CardDescription>
          Accessing workspace: <span className="font-semibold text-[#171717]">{tenantSlug}</span>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="operator@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="password">
                Password
              </label>
              <Link
                href={`/tenant/${tenantSlug}/forgot-password`}
                className="text-xs text-[#737373] hover:text-[#171717] transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-[#171717] py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
