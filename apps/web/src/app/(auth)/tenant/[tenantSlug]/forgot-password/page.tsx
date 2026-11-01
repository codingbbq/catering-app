"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-2xl">Check your email</h1>
          <p className="text-sm text-base-content/70">
            If an account exists for that email, a password reset link has been sent.
          </p>
          <Link
            href={`/tenant/${tenantSlug}/sign-in`}
            className="btn btn-primary btn-sm mt-4"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md bg-base-100 shadow-xl">
      <div className="card-body">
        <h1 className="card-title text-2xl">Forgot Password</h1>
        <p className="text-sm text-base-content/70">
          Enter your email to receive a password reset link for{" "}
          <span className="font-semibold">{tenantSlug}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <fieldset className="fieldset">
            <label className="fieldset-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input input-bordered w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </fieldset>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Send reset link"}
          </button>

          <div className="text-center text-sm">
            <Link
              href={`/tenant/${tenantSlug}/sign-in`}
              className="link link-hover text-base-content/70"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
