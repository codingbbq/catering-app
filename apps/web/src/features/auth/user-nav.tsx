"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export function UserNav({ signInHref }: { signInHref: string }) {
  const { session, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push(signInHref);
  }

  if (!isAuthenticated || !session) {
    return (
      <a href={signInHref} className="btn btn-sm btn-outline">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <p className="font-medium">{session.displayName}</p>
        <p className="text-xs text-base-content/60">{session.email}</p>
      </div>
      <button onClick={handleSignOut} className="btn btn-sm btn-ghost">
        Sign out
      </button>
    </div>
  );
}
