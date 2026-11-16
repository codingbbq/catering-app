"use client";

import React from "react";
import type { InventorySummary } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface InventoryKpiCardsProps {
  summary: InventorySummary | null;
  isLoading: boolean;
}

export function InventoryKpiCards({ summary, isLoading }: InventoryKpiCardsProps) {
  const { formatCurrency, currencyCode } = useTenantCurrency();

  const totalSkus = summary?.totalActiveSkus ?? 0;
  const totalValuation = summary?.totalValuation ?? 0;
  const lowStock = summary?.lowStockCount ?? 0;
  const outOfStock = summary?.outOfStockCount ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Active SKUs */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Active Catalog SKUs
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F4] text-[#171717]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-[#171717]">
          {isLoading ? "—" : totalSkus}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Tracked stock items in active catalog
        </p>
      </div>

      {/* Total Inventory Valuation (Currency Formatted) */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Total Stock Valuation
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F4] text-[#171717]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-[#171717]">
          {isLoading ? "—" : formatCurrency(totalValuation)}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Current on-hand stock value ({currencyCode})
        </p>
      </div>

      {/* Low Stock Alerts */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Low Stock Alerts
          </p>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${lowStock > 0 ? "bg-amber-50 text-amber-700" : "bg-[#F5F5F4] text-[#171717]"}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
        </div>
        <p className={`mt-3 text-2xl font-bold tracking-tight ${lowStock > 0 ? "text-amber-800" : "text-[#171717]"}`}>
          {isLoading ? "—" : lowStock}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Items at or below configured par level
        </p>
      </div>

      {/* Out of Stock */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Out of Stock
          </p>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${outOfStock > 0 ? "bg-red-50 text-red-700" : "bg-[#F5F5F4] text-[#171717]"}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
        </div>
        <p className={`mt-3 text-2xl font-bold tracking-tight ${outOfStock > 0 ? "text-red-700" : "text-[#171717]"}`}>
          {isLoading ? "—" : outOfStock}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Zero on-hand quantity requiring immediate intake
        </p>
      </div>
    </div>
  );
}
