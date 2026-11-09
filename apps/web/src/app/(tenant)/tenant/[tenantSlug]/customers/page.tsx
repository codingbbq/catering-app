"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
    queryFn: () => listCustomers(accessToken!, { search: searchTerm || undefined, isActive: isActiveParam }),
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
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant access required</h2>
        <p className="text-base-content/70">Sign in as a tenant user to continue.</p>
        <Link href={`/tenant/${tenantSlug}/sign-in`} className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Customers</h2>
          <p className="text-sm text-base-content/70">
            Manage your client accounts, contacts, and relationship records.
          </p>
        </div>
        <Link
          href={`/tenant/${tenantSlug}/customers/new`}
          className="btn btn-primary btn-sm gap-2"
        >
          <span className="text-base leading-none">+</span> Add Customer
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input input-bordered input-sm w-full pr-8"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-base-content/50 hover:text-base-content"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-sm btn-outline">
                Search
              </button>
            </form>

            {/* Status Filter Tabs */}
            <div className="join self-start sm:self-auto">
              <button
                type="button"
                className={`btn btn-sm join-item ${statusFilter === "active" ? "btn-active btn-neutral" : "btn-ghost"}`}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${statusFilter === "inactive" ? "btn-active btn-neutral" : "btn-ghost"}`}
                onClick={() => setStatusFilter("inactive")}
              >
                Inactive
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${statusFilter === "all" ? "btn-active btn-neutral" : "btn-ghost"}`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {isError && (
        <div className="alert alert-error text-sm">
          <span>{error instanceof Error ? error.message : "Failed to load customers."}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <span className="loading loading-spinner loading-md text-primary" />
          <p className="text-sm text-base-content/60">Loading customers...</p>
        </div>
      )}

      {/* Table & Empty State */}
      {!isLoading && data && (
        <>
          {data.data.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center py-16 text-center">
                <div className="text-4xl mb-2">👥</div>
                <h3 className="text-lg font-semibold">
                  {searchTerm || statusFilter !== "active"
                    ? "No matching customers found"
                    : "No customers yet"}
                </h3>
                <p className="max-w-md text-sm text-base-content/60">
                  {searchTerm || statusFilter !== "active"
                    ? "Try adjusting your search criteria or filter to see more results."
                    : "Add your first catering client or corporate account to start preparing menus and quotations."}
                </p>
                <div className="mt-4">
                  {searchTerm || statusFilter !== "active" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSearchInput("");
                        setSearchTerm("");
                        setStatusFilter("active");
                      }}
                    >
                      Reset filters
                    </button>
                  ) : (
                    <Link
                      href={`/tenant/${tenantSlug}/customers/new`}
                      className="btn btn-primary btn-sm"
                    >
                      Add Your First Customer
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <CustomerTable data={data.data} tenantSlug={tenantSlug} />
          )}
        </>
      )}
    </div>
  );
}
