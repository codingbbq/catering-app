"use client";

import Link from "next/link";
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
      <Link
        href={signInHref}
        className="inline-flex items-center justify-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = session.displayName
    ? session.displayName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : session.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block text-right">
        <div className="text-xs font-medium text-[#171717]">{session.displayName}</div>
        <div className="text-[11px] text-[#737373]">{session.email}</div>
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171717] text-[10px] font-semibold text-white select-none">
        {initials}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded border border-transparent px-2 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
