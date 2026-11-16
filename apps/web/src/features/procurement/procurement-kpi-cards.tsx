"use client";

import React from "react";
import type { ProcurementSummary } from "@catering/shared-types";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface ProcurementKpiCardsProps {
  summary: ProcurementSummary | null | undefined;
  isLoading: boolean;
}

export function ProcurementKpiCards({ summary, isLoading }: ProcurementKpiCardsProps) {
  const { formatCurrency, currencyCode } = useTenantCurrency();

  const totalOrders = summary?.totalOrders ?? 0;
  const pendingDelivery = (summary?.orderedCount ?? 0) + (summary?.partiallyReceivedCount ?? 0);
  const totalSpend = summary?.totalSpend ?? 0;
  const activeSuppliers = summary?.activeSuppliersCount ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Purchase Orders */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Total Purchase Orders
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F4] text-[#171717]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-[#171717] tabular-nums">
          {isLoading ? "—" : totalOrders}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          {summary ? `${summary.receivedCount} completed, ${summary.draftOrders} draft` : "All recorded orders"}
        </p>
      </div>

      {/* Awaiting Delivery */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Pending Delivery
          </p>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${pendingDelivery > 0 ? "bg-amber-50 text-amber-800" : "bg-[#F5F5F4] text-[#171717]"}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        </div>
        <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${pendingDelivery > 0 ? "text-amber-900" : "text-[#171717]"}`}>
          {isLoading ? "—" : pendingDelivery}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Orders confirmed and awaiting delivery
        </p>
      </div>

      {/* Total Procurement Spend */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Procurement Spend
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F4] text-[#171717]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-[#171717] tabular-nums">
          {isLoading ? "—" : formatCurrency(totalSpend)}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Committed spend in tenant currency ({currencyCode})
        </p>
      </div>

      {/* Active Suppliers */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Active Suppliers
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F4] text-[#171717]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-[#171717] tabular-nums">
          {isLoading ? "—" : activeSuppliers}
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Verified suppliers available for ordering
        </p>
      </div>
    </div>
  );
}
