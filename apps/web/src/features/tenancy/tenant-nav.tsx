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
      href: `/tenant/${tenantSlug}/enquiries`,
      label: "Enquiries",
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
    <nav className="border-b border-[#E5E5E5] bg-white">
      <div className="flex w-full gap-2 px-6 overflow-x-auto">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-[#171717] text-[#171717]"
                  : "border-transparent text-[#737373] hover:border-[#E5E5E5] hover:text-[#171717]"
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
