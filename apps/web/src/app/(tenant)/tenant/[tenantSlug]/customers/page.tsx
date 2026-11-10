"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerTable } from "@/features/customers/customer-table";
import { listCustomers } from "@/lib/customers-api";
import { useAuth } from "@/providers/auth-provider";

export default function CustomersPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const isActiveParam =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tenant", tenantSlug, "customers", { search: searchTerm, isActive: isActiveParam }],
    queryFn: () =>
      listCustomers(accessToken!, { search: searchTerm || undefined, isActive: isActiveParam }),
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
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access your customer database.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers &amp; Accounts"
        description="Client database, corporate accounts, contacts, and billing profiles."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/customers/new`}
            className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            <span>Add Customer</span>
          </Link>
        }
      />

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by account name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded border border-[#E5E5E5] bg-white py-1.5 pl-3 pr-8 text-xs text-[#262626] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#A3A3A3] hover:text-[#171717]"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
              >
                Search
              </button>
            </form>

            {/* Status Filter Segmented Control */}
            <div className="flex items-center rounded border border-[#E5E5E5] bg-[#FAFAFA] p-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "active"
                    ? "bg-white text-[#171717] shadow-xs"
                    : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "inactive"
                    ? "bg-white text-[#171717] shadow-xs"
                    : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                Inactive
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-white text-[#171717] shadow-xs"
                    : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {isError && (
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          <span>{error instanceof Error ? error.message : "Failed to load customers."}</span>
          <button
            type="button"
            className="text-xs font-medium underline hover:no-underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
          <p className="text-xs text-[#737373]">Loading customer accounts...</p>
        </div>
      )}

      {/* Data Table or Empty State */}
      {!isLoading && data && (
        <>
          {data.data.length === 0 ? (
            <EmptyState
              title={searchTerm || statusFilter !== "active" ? "No matching records" : "No customers registered"}
              description={
                searchTerm || statusFilter !== "active"
                  ? "Adjust search parameters or filter toggles to view existing accounts."
                  : "Add your first catering client or corporate account to begin preparing quotations and bookings."
              }
              action={
                searchTerm || statusFilter !== "active" ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                    onClick={() => {
                      setSearchInput("");
                      setSearchTerm("");
                      setStatusFilter("active");
                    }}
                  >
                    Reset Filters
                  </button>
                ) : (
                  <Link
                    href={`/tenant/${tenantSlug}/customers/new`}
                    className="inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
                  >
                    Add First Customer
                  </Link>
                )
              }
            />
          ) : (
            <CustomerTable data={data.data} tenantSlug={tenantSlug} />
          )}
        </>
      )}
    </div>
  );
}
