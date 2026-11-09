"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TenantNavProps {
  tenantSlug: string;
}

export function TenantNav({ tenantSlug }: TenantNavProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/tenant/${tenantSlug}`,
      label: "Dashboard",
      exact: true,
    },
    {
      href: `/tenant/${tenantSlug}/customers`,
      label: "Customers",
      exact: false,
    },
    {
      href: `/tenant/${tenantSlug}/users`,
      label: "Team & Users",
      exact: false,
    },
    {
      href: `/tenant/${tenantSlug}/settings`,
      label: "Settings",
      exact: false,
    },
  ];

  return (
    <nav className="border-b border-base-200 bg-base-100">
      <div className="mx-auto flex w-full max-w-6xl gap-1 px-6">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-base-content/70 hover:border-base-300 hover:text-base-content"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
