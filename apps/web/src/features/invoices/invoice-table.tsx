"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listInvoices } from "@/lib/invoices-api";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { InvoiceListItem } from "@catering/shared-types";

interface InvoiceTableProps {
  tenantSlug: string;
}

export function InvoiceTable({ tenantSlug }: InvoiceTableProps) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoices", { tab: activeTab, search, page, limit }],
    queryFn: () =>
      listInvoices(accessToken!, {
        status: (activeTab as any) || undefined,
        search: search.trim() || undefined,
        page,
        limit,
      }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const stats = data?.stats;
  const items = data?.items || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const tabs = [
    { id: "all", label: "All Invoices" },
    { id: "draft", label: "Draft", count: stats?.draftCount },
    { id: "issued", label: "Issued", count: stats?.issuedCount },
    { id: "partially_paid", label: "Partially Paid", count: stats?.partiallyPaidCount },
    { id: "paid", label: "Paid", count: stats?.paidCount },
    { id: "overdue", label: "Overdue", count: stats?.overdueCount },
    { id: "void", label: "Void", count: stats?.voidCount },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Invoiced */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Total Invoiced
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-[#171717]">
              {formatCurrency(stats?.totalInvoiced ?? 0, currencyCode || "INR")}
            </span>
            <span className="text-[11px] text-[#737373]">{currencyCode || "INR"}</span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Outstanding Receivables
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-amber-600">
              {formatCurrency(stats?.totalOutstanding ?? 0, currencyCode || "INR")}
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Unsettled
            </span>
          </div>
        </div>

        {/* Total Settled */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Total Collected
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-emerald-700">
              {formatCurrency(stats?.totalPaid ?? 0, currencyCode || "INR")}
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Collected
            </span>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Overdue Invoices
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-red-600">
              {stats?.overdueCount ?? 0}
            </span>
            {stats && stats.overdueCount > 0 ? (
              <span className="text-[11px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                Action required
              </span>
            ) : (
              <span className="text-[11px] text-[#737373]">All current</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
        {/* Controls Header */}
        <div className="border-b border-[#E5E5E5] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-transparent">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#171717] text-white"
                        : "text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[#F0F0F0] text-[#737373]"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by invoice #, customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#737373]">
            Loading invoices...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-red-600">
            Error loading invoices. Please check connection.
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No invoices found"
              description={
                search || activeTab !== "all"
                  ? "No invoices match your current filter or search criteria."
                  : "You haven't generated any invoices yet. Create an invoice directly or from a confirmed booking."
              }
              action={
                <Link
                  href={`/tenant/${tenantSlug}/invoices/new`}
                  className="rounded-md bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
                >
                  Create Invoice
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                  <th className="py-3 px-4 font-medium">Invoice Number</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Booking / Event</th>
                  <th className="py-3 px-4 font-medium">Issue / Due Date</th>
                  <th className="py-3 px-4 font-medium text-right">Total Amount</th>
                  <th className="py-3 px-4 font-medium text-right">Balance Due</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {items.map((invoice: InvoiceListItem) => {
                  const issueDateFormatted = new Date(
                    invoice.issueDate,
                  ).toLocaleDateString();
                  const dueDateFormatted = new Date(
                    invoice.dueDate,
                  ).toLocaleDateString();

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      {/* Invoice Number & Title */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/tenant/${tenantSlug}/invoices/${invoice.id}`}
                          className="font-mono font-semibold text-[#171717] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-[11px] text-[#737373] truncate max-w-xs">
                          {invoice.title}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#171717]">
                          {invoice.customerName}
                        </div>
                        {invoice.customerEmail && (
                          <div className="text-[11px] text-[#737373]">
                            {invoice.customerEmail}
                          </div>
                        )}
                      </td>

                      {/* Booking */}
                      <td className="py-3 px-4">
                        {invoice.bookingNumber ? (
                          <Link
                            href={`/tenant/${tenantSlug}/bookings/${invoice.bookingId}`}
                            className="font-mono text-xs text-[#171717] hover:underline"
                          >
                            {invoice.bookingNumber}
                          </Link>
                        ) : (
                          <span className="text-[#A3A3A3] text-[11px]">
                            Standalone
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4">
                        <div className="text-[#171717]">{issueDateFormatted}</div>
                        <div className="text-[11px] text-[#737373]">
                          Due: {dueDateFormatted}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-[#171717]">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right font-mono">
                        {invoice.balanceDue > 0 ? (
                          <span
                            className={
                              invoice.isOverdue
                                ? "text-red-600 font-semibold"
                                : "text-amber-700 font-medium"
                            }
                          >
                            {formatCurrency(invoice.balanceDue, invoice.currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">
                            Settled
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <InvoiceStatusBadge
                          status={invoice.status}
                          isOverdue={invoice.isOverdue}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/tenant/${tenantSlug}/invoices/${invoice.id}`}
                          className="rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E5E5] px-4 py-3 sm:px-6">
            <span className="text-xs text-[#737373]">
              Showing {items.length} of {totalCount} invoices
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1 text-xs text-[#171717] hover:bg-[#F5F5F4] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-xs text-[#737373]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1 text-xs text-[#171717] hover:bg-[#F5F5F4] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
