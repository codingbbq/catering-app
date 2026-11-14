"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listPayments, getPaymentStats } from "@/lib/payments-api";
import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentRecordModal } from "./payment-record-modal";
import type { PaymentListItem, PaymentStatus, PaymentMethod } from "@catering/shared-types";

interface PaymentTableProps {
  tenantSlug: string;
}

export function PaymentTable({ tenantSlug }: PaymentTableProps) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency, currencyCode } = useTenantCurrency();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Fetch KPI stats
  const { data: stats } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: () => getPaymentStats(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Fetch payments list
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", { search, status: statusFilter, method: methodFilter, page }],
    queryFn: () =>
      listPayments(accessToken!, {
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        paymentMethod: methodFilter ? (methodFilter as PaymentMethod) : undefined,
        page,
        limit: 15,
      }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const activeCurrency = stats?.currency || currencyCode || "INR";

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: "all", label: "All" },
    { id: "unallocated", label: "Unallocated" },
    { id: "partially_allocated", label: "Partially Allocated" },
    { id: "allocated", label: "Fully Allocated" },
    { id: "void", label: "Void" },
  ];

  const methodLabel: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    credit_card: "Card",
    cheque: "Cheque",
    online: "UPI / Online",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      {/* Financial Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Total Payments Received</span>
          <p className="mt-1 text-2xl font-semibold text-[#171717] font-mono">
            {formatCurrency(stats?.totalReceived ?? 0, activeCurrency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-0.5 block">
            Across {stats?.totalPayments ?? 0} total records
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Allocated to Invoices</span>
          <p className="mt-1 text-2xl font-semibold text-[#171717] font-mono">
            {formatCurrency(stats?.totalAllocated ?? 0, activeCurrency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-0.5 block">
            Applied against billing obligations
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-[#737373]">Unallocated Customer Credit</span>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 font-mono">
            {formatCurrency(stats?.totalUnallocated ?? 0, activeCurrency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-0.5 block">
            {stats?.unallocatedPaymentsCount ?? 0} payments with available credit
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-[#737373]">Payment Processing</span>
            <p className="mt-1 text-xs text-[#262626]">
              Record receipts directly from bank deposits or customer cheques.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRecordOpen(true)}
            className="mt-3 w-full rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
          >
            + Record Payment
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs space-y-4">
        {/* Status Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#F0F0F0] pb-3">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-[#171717] text-white"
                  : "bg-[#F5F5F4] text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Method Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:max-w-xs relative">
            <input
              type="text"
              placeholder="Search payment #, ref, customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#262626] focus:border-[#171717] focus:outline-none"
            >
              <option value="">All Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online / UPI</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner text-[#171717]" />
          </div>
        ) : paymentsData?.items?.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#737373]">
            <p className="font-semibold text-sm text-[#171717] mb-1">
              No payments found
            </p>
            <p>
              {search || statusFilter !== "all" || methodFilter
                ? "Try adjusting your search criteria or filters."
                : "Record your first customer payment receipt to track allocations."}
            </p>
            <button
              type="button"
              onClick={() => setIsRecordOpen(true)}
              className="mt-4 rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626]"
            >
              + Record Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment #</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Allocated</th>
                  <th className="px-4 py-3 font-medium text-right">Unallocated</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {paymentsData?.items?.map((item: PaymentListItem) => (
                  <tr key={item.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono font-medium text-[#171717]">
                      <Link
                        href={`/tenant/${tenantSlug}/payments/${item.id}`}
                        className="hover:underline"
                      >
                        {item.paymentNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#737373]">
                      {item.paymentDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#171717]">
                        {item.customerName}
                      </div>
                      {item.customerEmail && (
                        <div className="text-[11px] text-[#737373]">
                          {item.customerEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#737373]">
                      {methodLabel[item.paymentMethod] || item.paymentMethod}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#737373]">
                      {item.reference || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                      {formatCurrency(item.amount, item.currency || activeCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#262626]">
                      {formatCurrency(item.allocatedAmount, item.currency || activeCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span
                        className={
                          item.unallocatedAmount > 0
                            ? "font-semibold text-emerald-700"
                            : "text-[#737373]"
                        }
                      >
                        {formatCurrency(item.unallocatedAmount, item.currency || activeCurrency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tenant/${tenantSlug}/payments/${item.id}`}
                        className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#F5F5F4]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {paymentsData && paymentsData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E5E5] px-4 py-3 text-xs text-[#737373]">
            <span>
              Showing Page {paymentsData.page} of {paymentsData.totalPages} ({paymentsData.total} records)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-[#E5E5E5] px-2.5 py-1 disabled:opacity-40 hover:bg-[#F5F5F4]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(paymentsData.totalPages, p + 1))}
                disabled={page >= paymentsData.totalPages}
                className="rounded border border-[#E5E5E5] px-2.5 py-1 disabled:opacity-40 hover:bg-[#F5F5F4]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <PaymentRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
      />
    </div>
  );
}
