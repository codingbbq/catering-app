import type { ReactNode } from "react";
import Link from "next/link";
import { AccessContextBadge } from "@/features/tenancy/access-context-badge";
import { UserNav } from "@/features/auth/user-nav";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F4]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/platform"
              className="flex items-center gap-2 text-xs font-semibold text-[#171717] tracking-tight hover:opacity-80 transition-opacity"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#171717] text-[11px] font-bold text-white">
                P
              </span>
              <span>Super Admin Console</span>
            </Link>
            <div className="h-4 w-px bg-[#E5E5E5]" />
            <AccessContextBadge scope="platform" />
            <div className="h-4 w-px bg-[#E5E5E5] hidden md:block" />
            <nav className="hidden md:flex items-center gap-1 text-xs">
              <Link
                href="/platform"
                className="px-2.5 py-1 text-[#262626] hover:text-[#171717] hover:bg-stone-100 rounded-md font-medium transition-colors"
              >
                Tenants
              </Link>
              <Link
                href="/platform/communications"
                className="px-2.5 py-1 text-[#262626] hover:text-[#171717] hover:bg-stone-100 rounded-md font-medium transition-colors"
              >
                Gateways & Quotas
              </Link>
            </nav>
          </div>
          <UserNav signInHref="/platform/sign-in" />
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
