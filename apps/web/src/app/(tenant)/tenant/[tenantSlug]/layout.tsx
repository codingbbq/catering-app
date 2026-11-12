import type { ReactNode } from "react";
import { AccessContextBadge } from "@/features/tenancy/access-context-badge";
import { TenantSidebar } from "@/features/tenancy/tenant-sidebar";
import { TenantProvider } from "@/features/tenancy/tenant-provider";
import { UserNav } from "@/features/auth/user-nav";

export const instant = false;

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <div className="flex min-h-screen bg-[#F5F5F4]">
        {/* Responsive Enterprise Sidebar */}
        <TenantSidebar tenantSlug={tenantSlug} />

        {/* Main Column */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Breadcrumb / Context */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-[#737373]">Workspace</span>
                <span className="text-[#A3A3A3]">/</span>
                <span className="font-semibold text-[#171717]">{tenantSlug}</span>
              </div>
              <div className="hidden sm:block">
                <AccessContextBadge scope="tenant" tenantSlug={tenantSlug} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserNav signInHref={`/tenant/${tenantSlug}/sign-in`} />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
