"use client";

import type { QuotationStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { QuotationTable } from "@/features/quotations/quotation-table";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listQuotations } from "@/lib/quotations-api";
import { useAuth } from "@/providers/auth-provider";

export default function QuotationsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency } = useTenantCurrency();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QuotationStatus>("all");

  const statusParam = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "tenant",
      tenantSlug,
      "quotations",
      { search: searchTerm, status: statusParam },
    ],
    queryFn: () =>
      listQuotations(accessToken!, {
        search: searchTerm || undefined,
        status: statusParam,
      }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">
          Workspace Authentication Required
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Sign in to access your quotations and proposals.
        </p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const items = data?.items ?? [];
  const stats = data?.stats ?? {
    totalQuotations: 0,
    totalValue: 0,
    acceptedCount: 0,
    acceptedValue: 0,
    pendingCount: 0,
    pendingValue: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations & Revisions"
        description="Manage customer proposals, track revision histories, and streamline quotation conversion into bookings."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/quotations/new`}
            className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
          >
            + Create Quotation
          </Link>
        }
      />

      {/* Commercial Pipeline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Total Pipeline
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-[#171717]">
              {formatCurrency(stats.totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-[#737373]">({stats.totalQuotations} quotes)</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Pending Decision
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-amber-800">
              {formatCurrency(stats.pendingValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-[#737373]">({stats.pendingCount} active)</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Accepted Revenue
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-emerald-800">
              {formatCurrency(stats.acceptedValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-[#737373]">({stats.acceptedCount} accepted)</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5E5E5]">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Win Conversion Rate
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-[#171717]">
              {stats.totalQuotations > 0
                ? `${Math.round((stats.acceptedCount / stats.totalQuotations) * 100)}%`
                : "—"}
            </span>
            <span className="text-xs text-[#737373]">of proposals</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by quote #, title, customer, enquiry..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 pr-8 text-xs text-[#171717] placeholder-[#A3A3A3] focus:outline-hidden focus:border-[#171717]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737373] hover:text-[#171717]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  "all",
                  "draft",
                  "sent",
                  "accepted",
                  "rejected",
                  "expired",
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded px-2.5 py-1 capitalize transition-colors ${
                    statusFilter === st
                      ? "bg-[#171717] text-white font-medium"
                      : "border border-[#E5E5E5] bg-white text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worklist Table / Empty State */}
      {isLoading ? (
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
          Loading quotations...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-xs font-medium text-red-800">
            Failed to load quotations: {(error as Error)?.message || "Unknown error"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs font-semibold text-red-800 underline"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={searchTerm || statusFilter !== "all" ? "No matching quotations" : "No quotations created yet"}
          description={
            searchTerm || statusFilter !== "all"
              ? "Try adjusting your search criteria or status filter."
              : "Generate professional quotations from your enquiries, revise them with full history, and convert them to bookings."
          }
          action={
            <Link
              href={`/tenant/${tenantSlug}/quotations/new`}
              className="rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + Create First Quotation
            </Link>
          }
        />
      ) : (
        <QuotationTable data={items} tenantSlug={tenantSlug} />
      )}
    </div>
  );
}
