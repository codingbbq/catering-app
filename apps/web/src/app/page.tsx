import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F4]">
      {/* Top Navigation */}
      <header className="flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#171717] text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#171717]">
            Catering SaaS Platform
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant="neutral">Enterprise Core</StatusBadge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-4xl space-y-6">
          {/* Hero Card */}
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="success">FND-001 Tenant Isolation</StatusBadge>
                <StatusBadge variant="neutral">IAM-001 Auth & Sessions</StatusBadge>
              </div>
              <CardTitle className="text-2xl font-bold text-[#171717]">
                Enterprise Catering Management SaaS
              </CardTitle>
              <CardDescription className="text-sm text-[#737373] max-w-2xl leading-relaxed">
                Multi-tenant operations platform engineered for catering businesses. Provides strictly
                isolated tenant workspaces, token-based authentication, CRM customer management,
                and centralized platform governance.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Access Portals Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Platform Admin */}
                <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#171717]">Platform Administration</h2>
                    <span className="text-[11px] font-mono text-[#737373]">Super Admin</span>
                  </div>
                  <p className="text-xs text-[#737373] leading-relaxed">
                    Central console for managing tenant lifecycle, tenant organizations, domain configurations,
                    and cross-platform policies.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href="/platform/sign-in"
                      className="inline-flex items-center justify-center rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/platform"
                      className="inline-flex items-center justify-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                    >
                      Console
                    </Link>
                  </div>
                </div>

                {/* Tenant Workspace */}
                <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#171717]">Tenant Catering Workspace</h2>
                    <span className="text-[11px] font-mono text-[#737373]">demo-catering</span>
                  </div>
                  <p className="text-xs text-[#737373] leading-relaxed">
                    Tenant-scoped workspace for managing customer accounts, event bookings, food catalogues,
                    quotations, and operations.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href="/tenant/demo-catering/sign-in"
                      className="inline-flex items-center justify-center rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/tenant/demo-catering"
                      className="inline-flex items-center justify-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                    >
                      Workspace
                    </Link>
                  </div>
                </div>
              </div>

              {/* System Capabilities Checklist */}
              <div className="rounded border border-[#E5E5E5] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2.5">
                  Production Security &amp; Isolation Standards
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs text-[#262626]">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#171717]" />
                    <span>Row-level tenant schema isolation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#171717]" />
                    <span>Dual JWT access &amp; refresh token rotation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#171717]" />
                    <span>Role-based access control (Owner, Admin, Manager, Staff)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#171717]" />
                    <span>TanStack Query cache invalidation &amp; strict Zod validation</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
