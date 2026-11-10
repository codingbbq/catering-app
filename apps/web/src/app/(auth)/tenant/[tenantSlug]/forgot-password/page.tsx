"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { forgotPassword } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword({ email, tenantSlug });
    } catch {
      // Always show success to avoid user enumeration
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#171717]">Check your email</h2>
            <p className="text-xs text-[#737373] max-w-xs mx-auto">
              If an account exists for that email, a password reset link has been dispatched.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/tenant/${tenantSlug}/sign-in`}
              className="inline-flex items-center justify-center rounded bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Password Reset</CardTitle>
        <CardDescription>
          Enter your registered email for workspace: <span className="font-semibold text-[#171717]">{tenantSlug}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="reset-email">
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-[#171717] py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="text-center">
            <Link
              href={`/tenant/${tenantSlug}/sign-in`}
              className="text-xs text-[#737373] hover:text-[#171717] transition-colors"
            >
              &larr; Back to sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
