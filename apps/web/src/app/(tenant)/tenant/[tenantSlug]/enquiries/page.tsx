"use client";

import type { EnquiryStatus } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { EnquiryTable } from "@/features/enquiries/enquiry-table";
import { listEnquiries } from "@/lib/enquiries-api";
import { useAuth } from "@/providers/auth-provider";

export default function EnquiriesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EnquiryStatus>("all");

  const statusParam = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tenant", tenantSlug, "enquiries", { search: searchTerm, status: statusParam }],
    queryFn: () =>
      listEnquiries(accessToken!, { search: searchTerm || undefined, status: statusParam }),
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
        <p className="mt-1 text-xs text-[#737373]">Sign in to access your sales enquiries.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const enquiries = data?.data ?? [];
  const newCount = enquiries.filter((e) => e.status === "new").length;
  const qualifiedCount = enquiries.filter((e) => e.status === "qualified").length;
  const convertedCount = enquiries.filter((e) => e.status === "converted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Enquiries"
        description="Capture and qualify event catering and recurring meal opportunities."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/enquiries/new`}
            className="inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
          >
            + New Enquiry
          </Link>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Total Enquiries
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-[#171717]">
            {data?.total ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            New / Unqualified
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-stone-700">
            {newCount}
          </div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Qualified for Quote
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-emerald-700">
            {qualifiedCount}
          </div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Converted to Bookings
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-emerald-800">
            {convertedCount}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "new", label: "New" },
                { id: "qualified", label: "Qualified" },
                { id: "proposal_sent", label: "Proposal Sent" },
                { id: "converted", label: "Converted" },
                { id: "lost", label: "Lost" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as "all" | EnquiryStatus)}
                  className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === tab.id
                      ? "bg-[#171717] text-white"
                      : "bg-[#FAFAFA] text-[#737373] hover:bg-[#F0F0F0] hover:text-[#171717]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search title, customer, event..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-56 sm:w-64 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#737373] hover:text-[#171717]"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA]"
              >
                Search
              </button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Main Table or Loading/Error State */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white">
          <p className="text-xs text-[#737373]">Loading enquiries...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-xs font-medium text-red-800">
            Failed to load enquiries: {(error as Error)?.message || "Unknown error"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : enquiries.length === 0 && !searchTerm && statusFilter === "all" ? (
        <EmptyState
          title="No enquiries recorded yet"
          description="Log sales opportunities to begin preparing proposals and quotations."
          action={
            <Link
              href={`/tenant/${tenantSlug}/enquiries/new`}
              className="inline-flex rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + New Enquiry
            </Link>
          }
        />
      ) : (
        <EnquiryTable data={enquiries} tenantSlug={tenantSlug} />
      )}
    </div>
  );
}
