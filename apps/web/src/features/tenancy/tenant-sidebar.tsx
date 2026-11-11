"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface TenantSidebarProps {
  tenantSlug: string;
}

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  implemented: boolean;
  icon: (props: { className?: string }) => React.JSX.Element;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function TenantSidebar({ tenantSlug }: TenantSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation: NavGroup[] = [
    {
      group: "Overview",
      items: [
        {
          label: "Dashboard",
          href: `/tenant/${tenantSlug}`,
          exact: true,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "Sales & CRM",
      items: [
        {
          label: "Customers",
          href: `/tenant/${tenantSlug}/customers`,
          exact: false,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          label: "Enquiries",
          href: `/tenant/${tenantSlug}/enquiries`,
          exact: false,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
        {
          label: "Quotations",
          href: `/tenant/${tenantSlug}/quotations`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: "Bookings",
          href: `/tenant/${tenantSlug}/bookings`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "Kitchen & Operations",
      items: [
        {
          label: "Food Catalogue",
          href: `/tenant/${tenantSlug}/catalogue`,
          exact: false,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          label: "Menus",
          href: `/tenant/${tenantSlug}/menus`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: "Costing & Recipes",
          href: `/tenant/${tenantSlug}/costing`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: "Daily Meal Orders",
          href: `/tenant/${tenantSlug}/meal-orders`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "Finance & Stock",
      items: [
        {
          label: "Invoices",
          href: `/tenant/${tenantSlug}/invoices`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          ),
        },
        {
          label: "Payments",
          href: `/tenant/${tenantSlug}/payments`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          label: "Inventory",
          href: `/tenant/${tenantSlug}/inventory`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "Administration",
      items: [
        {
          label: "Reports",
          href: `/tenant/${tenantSlug}/reports`,
          exact: false,
          implemented: false,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: "Team & Users",
          href: `/tenant/${tenantSlug}/users`,
          exact: false,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: "Settings",
          href: `/tenant/${tenantSlug}/settings`,
          exact: false,
          implemented: true,
          icon: ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto">
      <div>
        {/* Brand / Tenant Header */}
        <div className="flex h-14 items-center gap-3 border-b border-[#E5E5E5] px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#171717] text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-[#171717] uppercase tracking-wide truncate">
              {tenantSlug}
            </p>
            <p className="text-[11px] text-[#737373]">Catering Workspace</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-6 px-3 py-4">
          {navigation.map((group) => (
            <div key={group.group}>
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#737373]/80">
                {group.group}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  if (!item.implemented) {
                    return (
                      <li key={item.label}>
                        <div
                          className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-[#A3A3A3] cursor-not-allowed select-none"
                          title="Roadmap feature"
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon className="h-4 w-4 opacity-50" />
                            <span>{item.label}</span>
                          </div>
                          <span className="text-[10px] text-[#A3A3A3] font-mono">Plan</span>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-[#E5E5E5]/70 text-[#171717]"
                            : "text-[#737373] hover:bg-[#FAFAFA] hover:text-[#171717]"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-[#171717]" : "text-[#737373]"}`} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Monorepo Version */}
      <div className="border-t border-[#E5E5E5] p-3 text-[11px] text-[#737373] flex items-center justify-between">
        <span>Catering Enterprise</span>
        <span className="font-mono text-[10px]">v1.0</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-[#E5E5E5] bg-white h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Menu Button - Floated in Top Bar */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation"
          className="rounded border border-[#E5E5E5] bg-white p-1.5 text-[#171717] hover:bg-[#F5F5F5]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Backdrop & Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex w-64 flex-1 flex-col bg-white border-r border-[#E5E5E5]">
              <div className="absolute right-2 top-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded p-1 text-[#737373] hover:text-[#171717]"
                >
                  ✕
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
