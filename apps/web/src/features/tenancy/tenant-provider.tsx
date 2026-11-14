"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getTenantProfile } from "@/lib/tenant-admin-api";
import { getPublicTenantInfo } from "@/lib/auth-api";
import {
  formatCurrency as formatCurrencyUtil,
  getCurrencySymbol,
  type FormatCurrencyOptions,
} from "@/lib/currency";
import type { TenantProfile } from "@catering/shared-types";

export interface TenantContextValue {
  tenantSlug: string;
  profile: TenantProfile | null;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  isLoading: boolean;
  formatCurrency: {
    (amount: number | null | undefined, options?: FormatCurrencyOptions): string;
    (
      amount: number | null | undefined,
      overrideCurrency?: string,
      options?: FormatCurrencyOptions,
    ): string;
  };
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  tenantSlug,
}: {
  children: ReactNode;
  tenantSlug: string;
}) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  // Fetch public tenant info by slug (always works to immediately get database currency)
  const { data: publicInfo } = useQuery({
    queryKey: ["tenant", "public", tenantSlug],
    queryFn: () => getPublicTenantInfo(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch authenticated full profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: () => getTenantProfile(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  const currencyCode = (
    profile?.settings?.currencyCode ||
    publicInfo?.currencyCode ||
    "INR"
  ).toUpperCase();

  const currencySymbol = useMemo(() => getCurrencySymbol(currencyCode), [currencyCode]);
  const locale =
    profile?.settings?.locale ||
    publicInfo?.locale ||
    (currencyCode === "INR" ? "en-IN" : "en-US");
  const timezone =
    profile?.settings?.timezone || publicInfo?.timezone || "Asia/Kolkata";

  const formatCurrency = useMemo(
    () =>
      ((
        amount: number | null | undefined,
        overrideCurrencyOrOptions?: string | FormatCurrencyOptions,
        options?: FormatCurrencyOptions,
      ): string => {
        let overrideCurrency: string | undefined;
        let effectiveOptions: FormatCurrencyOptions | undefined;

        if (typeof overrideCurrencyOrOptions === "string") {
          overrideCurrency = overrideCurrencyOrOptions;
          effectiveOptions = options;
        } else if (
          typeof overrideCurrencyOrOptions === "object" &&
          overrideCurrencyOrOptions !== null
        ) {
          effectiveOptions = overrideCurrencyOrOptions;
        }

        const activeCode = (overrideCurrency || currencyCode || "INR").toUpperCase();
        const activeLocale =
          activeCode === "INR"
            ? "en-IN"
            : activeCode === "USD"
              ? "en-US"
              : locale;
        return formatCurrencyUtil(amount, activeCode, activeLocale, effectiveOptions);
      }) as TenantContextValue["formatCurrency"],
    [currencyCode, locale],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenantSlug,
      profile: profile ?? null,
      currencyCode,
      currencySymbol,
      locale,
      timezone,
      isLoading,
      formatCurrency,
    }),
    [tenantSlug, profile, currencyCode, currencySymbol, locale, timezone, isLoading, formatCurrency],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context) return context;

  // Resilient fallback if rendered outside TenantProvider (e.g. tests or isolated preview)
  return {
    tenantSlug: "",
    profile: null,
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    isLoading: false,
    formatCurrency: ((
      amount: number | null | undefined,
      overrideCurrencyOrOptions?: string | FormatCurrencyOptions,
      options?: FormatCurrencyOptions,
    ): string => {
      let overrideCurrency: string | undefined;
      let effectiveOptions: FormatCurrencyOptions | undefined;
      if (typeof overrideCurrencyOrOptions === "string") {
        overrideCurrency = overrideCurrencyOrOptions;
        effectiveOptions = options;
      } else if (
        typeof overrideCurrencyOrOptions === "object" &&
        overrideCurrencyOrOptions !== null
      ) {
        effectiveOptions = overrideCurrencyOrOptions;
      }
      return formatCurrencyUtil(
        amount,
        overrideCurrency || "INR",
        "en-IN",
        effectiveOptions,
      );
    }) as TenantContextValue["formatCurrency"],
  };
}

export function useTenantCurrency() {
  const tenant = useTenant();
  return {
    currencyCode: tenant.currencyCode,
    currencySymbol: tenant.currencySymbol,
    locale: tenant.locale,
    formatCurrency: tenant.formatCurrency,
    isLoading: tenant.isLoading,
  };
}
