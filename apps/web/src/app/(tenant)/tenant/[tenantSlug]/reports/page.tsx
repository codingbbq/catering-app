"use client";

import type { ReportPeriod } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingStatusBadge } from "@/features/bookings/booking-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  getBookingSummary,
  getDashboardOverview,
  getFinanceSummary,
  getOperationsSummary,
  getSalesSummary,
} from "@/lib/reports-api";
import { useAuth } from "@/providers/auth-provider";

type ReportTab = "overview" | "sales" | "bookings" | "finance" | "operations";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom Range",
};

export default function TenantReportsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { currencyCode, currencySymbol, formatCurrency } = useTenantCurrency();

  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("30d");

  // Queries
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery({
    queryKey: ["tenant", tenantSlug, "reports", "overview"],
    queryFn: () => getDashboardOverview(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && activeTab === "overview",
  });

  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["tenant", tenantSlug, "reports", "sales", selectedPeriod],
    queryFn: () => getSalesSummary(accessToken!, { period: selectedPeriod }),
    enabled: isAuthenticated && isTenant && !!accessToken && (activeTab === "overview" || activeTab === "sales"),
  });

  const { data: bookingData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["tenant", tenantSlug, "reports", "bookings", selectedPeriod],
    queryFn: () => getBookingSummary(accessToken!, { period: selectedPeriod }),
    enabled: isAuthenticated && isTenant && !!accessToken && (activeTab === "overview" || activeTab === "bookings"),
  });

  const { data: financeData, isLoading: isLoadingFinance } = useQuery({
    queryKey: ["tenant", tenantSlug, "reports", "finance", selectedPeriod],
    queryFn: () => getFinanceSummary(accessToken!, { period: selectedPeriod }),
    enabled: isAuthenticated && isTenant && !!accessToken && (activeTab === "overview" || activeTab === "finance"),
  });

  const { data: operationsData, isLoading: isLoadingOperations } = useQuery({
    queryKey: ["tenant", tenantSlug, "reports", "operations", selectedPeriod],
    queryFn: () => getOperationsSummary(accessToken!, { period: selectedPeriod }),
    enabled: isAuthenticated && isTenant && !!accessToken && (activeTab === "overview" || activeTab === "operations"),
  });

  // Client-side CSV export
  const handleExportCSV = () => {
    let rows: Array<string[]> = [];
    let filename = `report-${activeTab}-${selectedPeriod}.csv`;

    if (activeTab === "sales" && salesData) {
      rows = [
        ["Section", "Metric", "Value", "Currency"],
        ["Enquiries", "Total Enquiries", String(salesData.enquiries.total), ""],
        ["Enquiries", "Qualification Rate", `${salesData.enquiries.qualificationRate}%`, ""],
        ["Enquiries", "Win Rate", `${salesData.enquiries.winRate}%`, ""],
        ["Quotations", "Total Quotations", String(salesData.quotations.total), ""],
        ["Quotations", "Total Quoted Value", String(salesData.quotations.totalQuotedValue), currencyCode],
        ["Quotations", "Average Quote Value", String(salesData.quotations.averageQuoteValue), currencyCode],
        ["Quotations", "Accepted Quotations", String(salesData.quotations.acceptedCount), ""],
        ["Quotations", "Accepted Value", String(salesData.quotations.acceptedValue), currencyCode],
        ["Quotations", "Acceptance Rate", `${salesData.quotations.acceptanceRate}%`, ""],
      ];
    } else if (activeTab === "bookings" && bookingData) {
      rows = [
        ["Section", "Metric", "Value", "Currency"],
        ["Bookings", "Total Bookings", String(bookingData.totalBookings), ""],
        ["Bookings", "Total Confirmed Revenue", String(bookingData.totalConfirmedRevenue), currencyCode],
        ["Bookings", "Average Booking Value", String(bookingData.averageBookingValue), currencyCode],
        ["Bookings", "Total Guests Catered", String(bookingData.totalGuests), ""],
        ["Bookings", "Average Guests Per Event", String(bookingData.averageGuests), ""],
        ["Bookings", "Upcoming Events", String(bookingData.upcomingCount), ""],
        ["Bookings", "Completed Events", String(bookingData.completedCount), ""],
      ];
    } else if (activeTab === "finance" && financeData) {
      rows = [
        ["Section", "Metric", "Value", "Currency"],
        ["Finance", "Total Invoiced", String(financeData.totalInvoiced), currencyCode],
        ["Finance", "Total Paid", String(financeData.totalPaid), currencyCode],
        ["Finance", "Total Outstanding Balance", String(financeData.totalOutstanding), currencyCode],
        ["Finance", "Total Overdue Balance", String(financeData.totalOverdue), currencyCode],
        ["Finance", "Overdue Invoices Count", String(financeData.overdueCount), ""],
        ["Finance", "Collection Rate", `${financeData.collectionRate}%`, ""],
        ["Finance", "Total Payment Receipts", String(financeData.totalPaymentsReceipts), currencyCode],
        ["Finance", "Unallocated Customer Credits", String(financeData.unallocatedCredits), currencyCode],
      ];
    } else if (activeTab === "operations" && operationsData) {
      rows = [
        ["Section", "Metric", "Value", "Currency"],
        ["Meal Orders", "Total Orders", String(operationsData.mealOrders.totalOrders), ""],
        ["Meal Orders", "Total Servings Quantity", String(operationsData.mealOrders.totalQuantity), ""],
        ["Meal Orders", "Total Billed Value", String(operationsData.mealOrders.totalValue), currencyCode],
        ["Meal Orders", "Active Subscription Plans", String(operationsData.mealOrders.activePlansCount), ""],
        ["Inventory", "Total Active Items", String(operationsData.inventory.totalItems), ""],
        ["Inventory", "Total Stock Valuation", String(operationsData.inventory.totalStockValuation), currencyCode],
        ["Inventory", "Low Stock Items", String(operationsData.inventory.lowStockCount), ""],
        ["Inventory", "Out of Stock Items", String(operationsData.inventory.outOfStockCount), ""],
      ];
    } else {
      // Default overview
      rows = [
        ["Metric", "Value", "Currency"],
        ["Active Bookings Value", String(overviewData?.kpi.activeBookingsValue ?? 0), currencyCode],
        ["Revenue Collected", String(overviewData?.kpi.totalRevenueCollected ?? 0), currencyCode],
        ["Pipeline Quoted Value", String(overviewData?.kpi.pipelineQuotedValue ?? 0), currencyCode],
        ["Outstanding Balance", String(overviewData?.kpi.outstandingInvoiced ?? 0), currencyCode],
        ["Low Stock Items", String(overviewData?.kpi.lowStockAlertsCount ?? 0), ""],
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Access Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access executive reports.</p>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const isLoading =
    (activeTab === "overview" && (isLoadingOverview || isLoadingSales || isLoadingBookings || isLoadingFinance)) ||
    (activeTab === "sales" && isLoadingSales) ||
    (activeTab === "bookings" && isLoadingBookings) ||
    (activeTab === "finance" && isLoadingFinance) ||
    (activeTab === "operations" && isLoadingOperations);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <PageHeader
        title="Executive Reports & Dashboards"
        description="Comprehensive analytics across pipeline, quoting, event bookings, cash collections, and stock valuation."
        badge={<StatusBadge variant="neutral">{PERIOD_LABELS[selectedPeriod]}</StatusBadge>}
        actions={
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="report-period" className="text-xs font-medium text-[#737373]">
                Period:
              </label>
              <select
                id="report-period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
                className="h-8 rounded border border-[#E5E5E5] bg-white px-2.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
              </select>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <svg className="h-3.5 w-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            {/* Print View */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Report</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] print:hidden">
        <nav className="flex space-x-6 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-3.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Executive Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`pb-3.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "sales"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Sales &amp; Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`pb-3.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "bookings"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Bookings &amp; Operations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`pb-3.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "finance"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Finance &amp; Collections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`pb-3.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "operations"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Daily Meals &amp; Stock
          </button>
        </nav>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Executive Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    Bookings Revenue ({PERIOD_LABELS[selectedPeriod]})
                  </p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(bookingData?.totalConfirmedRevenue ?? 0)}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {bookingData?.totalBookings ?? 0} total bookings ({bookingData?.upcomingCount ?? 0} upcoming)
                  </p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    Cash Collections
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    {formatCurrency(financeData?.totalPaid ?? 0)}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {financeData?.collectionRate ?? 0}% collection rate
                  </p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    Quoted Pipeline
                  </p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(salesData?.quotations.totalQuotedValue ?? 0)}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {salesData?.quotations.acceptanceRate ?? 0}% quotation acceptance rate
                  </p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    Accounts Receivable
                  </p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(financeData?.totalOutstanding ?? 0)}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {financeData?.overdueCount ? (
                      <span className="text-rose-600 font-medium">
                        {financeData.overdueCount} overdue ({formatCurrency(financeData.totalOverdue)})
                      </span>
                    ) : (
                      <span className="text-emerald-700">Zero overdue balance</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Domain Performance Split */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sales & Conversion Performance */}
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Sales Pipeline &amp; Quoting Funnel
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("sales")}
                      className="text-xs font-medium text-[#171717] hover:underline"
                    >
                      Deep Dive &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Total Enquiries</span>
                      <p className="text-lg font-bold font-mono text-[#171717]">
                        {salesData?.enquiries.total ?? 0}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        {salesData?.enquiries.qualificationRate ?? 0}% Qualified
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Won Deals</span>
                      <p className="text-lg font-bold font-mono text-emerald-700">
                        {salesData?.enquiries.byStatus.won ?? 0}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        {salesData?.enquiries.winRate ?? 0}% Win Rate
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Quotation Value</span>
                      <p className="text-base font-bold font-mono text-[#171717]">
                        {formatCurrency(salesData?.quotations.totalQuotedValue ?? 0)}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        Avg: {formatCurrency(salesData?.quotations.averageQuoteValue ?? 0)}
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Accepted Quotes</span>
                      <p className="text-base font-bold font-mono text-emerald-700">
                        {salesData?.quotations.acceptedCount ?? 0}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        {formatCurrency(salesData?.quotations.acceptedValue ?? 0)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Event Fulfillment & Guest Analytics */}
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Event Operations &amp; Guest Capacity
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("bookings")}
                      className="text-xs font-medium text-[#171717] hover:underline"
                    >
                      Deep Dive &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Guests Catered</span>
                      <p className="text-lg font-bold font-mono text-[#171717]">
                        {bookingData?.totalGuests ?? 0}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        Avg: {bookingData?.averageGuests ?? 0} per event
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Confirmed Events</span>
                      <p className="text-lg font-bold font-mono text-[#171717]">
                        {bookingData?.byStatus.confirmed ?? 0}
                      </p>
                      <span className="text-[10px] text-[#737373]">
                        {bookingData?.completedCount ?? 0} Completed
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Avg Event Contract</span>
                      <p className="text-base font-bold font-mono text-[#171717]">
                        {formatCurrency(bookingData?.averageBookingValue ?? 0)}
                      </p>
                      <span className="text-[10px] text-[#737373]">Per booked event</span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[11px] text-[#737373]">Upcoming Scheduled</span>
                      <p className="text-base font-bold font-mono text-[#171717]">
                        {bookingData?.upcomingCount ?? 0} Events
                      </p>
                      <span className="text-[10px] text-[#737373]">Ready for fulfillment</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Financial Health & Payments Breakdown */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Cash Inflow &amp; Payment Methods Split
                    </h3>
                    <p className="text-[11px] text-[#737373] mt-0.5">
                      Distribution of reconciled payments by transaction method.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("finance")}
                    className="text-xs font-medium text-[#171717] hover:underline"
                  >
                    View Invoices &rarr;
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                  {Object.entries(financeData?.paymentMethods ?? {}).map(([method, amount]) => (
                    <div key={method} className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                        {method.replace("_", " ")}
                      </span>
                      <p className="text-sm font-bold font-mono text-[#171717]">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: SALES & PIPELINE */}
          {activeTab === "sales" && salesData && (
            <div className="space-y-6">
              {/* Sales Scorecards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Enquiries</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{salesData.enquiries.total}</p>
                  <p className="text-[11px] text-[#737373]">{salesData.enquiries.qualificationRate}% Qualified</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Win Rate</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">{salesData.enquiries.winRate}%</p>
                  <p className="text-[11px] text-[#737373]">{salesData.enquiries.byStatus.won ?? 0} Won Inquiries</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Quoted Value</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{formatCurrency(salesData.quotations.totalQuotedValue)}</p>
                  <p className="text-[11px] text-[#737373]">{salesData.quotations.total} Quotes Generated</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Quotation Acceptance</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">{salesData.quotations.acceptanceRate}%</p>
                  <p className="text-[11px] text-[#737373]">{formatCurrency(salesData.quotations.acceptedValue)} Accepted</p>
                </div>
              </div>

              {/* Status Breakdown Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Enquiry Pipeline Stages
                  </h3>
                  <div className="divide-y divide-[#F0F0F0] text-xs">
                    {Object.entries(salesData.enquiries.byStatus).map(([status, count]) => (
                      <div key={status} className="py-2 flex items-center justify-between">
                        <span className="capitalize text-[#737373]">{status.replace("_", " ")}</span>
                        <span className="font-mono font-semibold text-[#171717]">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Quotation Lifecycle Statuses
                  </h3>
                  <div className="divide-y divide-[#F0F0F0] text-xs">
                    {Object.entries(salesData.quotations.byStatus).map(([status, count]) => (
                      <div key={status} className="py-2 flex items-center justify-between">
                        <span className="capitalize text-[#737373]">{status}</span>
                        <span className="font-mono font-semibold text-[#171717]">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Top High-Value Quotations Table */}
              <Card className="overflow-hidden">
                <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Top Quoted Deals in Period
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                        <th className="py-2.5 px-4">Quotation #</th>
                        <th className="py-2.5 px-4">Title</th>
                        <th className="py-2.5 px-4">Customer</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {salesData.topQuotations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-[#737373]">
                            No quotations found in this period.
                          </td>
                        </tr>
                      ) : (
                        salesData.topQuotations.map((q) => (
                          <tr key={q.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-[#171717]">
                              <Link href={`/tenant/${tenantSlug}/quotations/${q.id}`} className="hover:underline">
                                {q.quotationNumber}
                              </Link>
                            </td>
                            <td className="py-2.5 px-4 text-[#171717]">{q.title}</td>
                            <td className="py-2.5 px-4 text-[#737373]">{q.customerName}</td>
                            <td className="py-2.5 px-4">
                              <StatusBadge variant={q.status === "accepted" ? "success" : "neutral"}>
                                {q.status}
                              </StatusBadge>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-right font-semibold text-[#171717]">
                              {formatCurrency(q.totalAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: BOOKINGS & OPERATIONS */}
          {activeTab === "bookings" && bookingData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Bookings</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{bookingData.totalBookings}</p>
                  <p className="text-[11px] text-[#737373]">{bookingData.upcomingCount} scheduled ahead</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Confirmed Revenue</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    {formatCurrency(bookingData.totalConfirmedRevenue)}
                  </p>
                  <p className="text-[11px] text-[#737373]">Active &amp; completed events</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Average Event Value</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(bookingData.averageBookingValue)}
                  </p>
                  <p className="text-[11px] text-[#737373]">Average contract price</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Guests Catered</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{bookingData.totalGuests}</p>
                  <p className="text-[11px] text-[#737373]">Avg: {bookingData.averageGuests} guests/event</p>
                </div>
              </div>

              {/* Status Breakdown & Recent Bookings */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-5 space-y-3 md:col-span-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Event Execution Statuses
                  </h3>
                  <div className="divide-y divide-[#F0F0F0] text-xs">
                    {Object.entries(bookingData.byStatus).map(([status, count]) => (
                      <div key={status} className="py-2.5 flex items-center justify-between">
                        <span className="capitalize text-[#737373]">{status.replace("_", " ")}</span>
                        <BookingStatusBadge status={status as any} />
                        <span className="font-mono font-semibold text-[#171717]">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="overflow-hidden md:col-span-2">
                  <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Recent Scheduled Events
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                          <th className="py-2.5 px-4">Booking #</th>
                          <th className="py-2.5 px-4">Title</th>
                          <th className="py-2.5 px-4">Event Date</th>
                          <th className="py-2.5 px-4">Guests</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0]">
                        {bookingData.recentBookings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-xs text-[#737373]">
                              No events registered in this period.
                            </td>
                          </tr>
                        ) : (
                          bookingData.recentBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-2.5 px-4 font-mono font-medium text-[#171717]">
                                <Link href={`/tenant/${tenantSlug}/bookings/${b.id}`} className="hover:underline">
                                  {b.bookingNumber}
                                </Link>
                              </td>
                              <td className="py-2.5 px-4 text-[#171717]">{b.title}</td>
                              <td className="py-2.5 px-4 text-[#737373]">
                                {new Date(b.eventDate).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-4 text-[#737373]">{b.guestCount ?? "—"}</td>
                              <td className="py-2.5 px-4 font-mono text-right font-semibold text-[#171717]">
                                {formatCurrency(b.totalAmount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCE & COLLECTIONS */}
          {activeTab === "finance" && financeData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Invoiced</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{formatCurrency(financeData.totalInvoiced)}</p>
                  <p className="text-[11px] text-[#737373]">Gross commercial billing</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Total Paid</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(financeData.totalPaid)}</p>
                  <p className="text-[11px] text-[#737373]">{financeData.collectionRate}% Collection Rate</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Outstanding Balance</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{formatCurrency(financeData.totalOutstanding)}</p>
                  <p className="text-[11px] text-[#737373]">Uncollected accounts receivable</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Overdue Balance</p>
                  <p className="text-xl font-bold font-mono text-rose-700">{formatCurrency(financeData.totalOverdue)}</p>
                  <p className="text-[11px] text-[#737373]">{financeData.overdueCount} invoices past due</p>
                </div>
              </div>

              {/* Invoice Lifecycle & Payment Receipts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Invoices by Status
                  </h3>
                  <div className="divide-y divide-[#F0F0F0] text-xs">
                    {Object.entries(financeData.invoicesByStatus).map(([status, count]) => (
                      <div key={status} className="py-2.5 flex items-center justify-between">
                        <span className="capitalize text-[#737373]">{status.replace("_", " ")}</span>
                        <span className="font-mono font-semibold text-[#171717]">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Reconciled Payment Receipts
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 flex justify-between items-center">
                      <span className="text-[#737373]">Total Payment Receipts</span>
                      <span className="font-mono font-bold text-base text-emerald-700">
                        {formatCurrency(financeData.totalPaymentsReceipts)}
                      </span>
                    </div>
                    <div className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 flex justify-between items-center">
                      <span className="text-[#737373]">Customer Unallocated Credits</span>
                      <span className="font-mono font-bold text-[#171717]">
                        {formatCurrency(financeData.unallocatedCredits)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: DAILY MEALS & INVENTORY */}
          {activeTab === "operations" && operationsData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Daily Meal Orders</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">{operationsData.mealOrders.totalOrders}</p>
                  <p className="text-[11px] text-[#737373]">{operationsData.mealOrders.activePlansCount} Active Standing Plans</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Meal Order Value</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(operationsData.mealOrders.totalValue)}
                  </p>
                  <p className="text-[11px] text-[#737373]">{operationsData.mealOrders.totalQuantity} total portions</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Stock Valuation</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {formatCurrency(operationsData.inventory.totalStockValuation)}
                  </p>
                  <p className="text-[11px] text-[#737373]">{operationsData.inventory.totalItems} active SKUs</p>
                </div>

                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1 shadow-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Inventory Alerts</p>
                  <p className="text-xl font-bold font-mono text-[#171717]">
                    {operationsData.inventory.lowStockCount > 0 ? (
                      <span className="text-amber-700">{operationsData.inventory.lowStockCount} Low</span>
                    ) : (
                      <span className="text-emerald-700">Stock OK</span>
                    )}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {operationsData.inventory.outOfStockCount} Out of Stock items
                  </p>
                </div>
              </div>

              {/* Category Valuation Table & Meal Slots */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                    Meal Orders by Service Slot
                  </h3>
                  <div className="divide-y divide-[#F0F0F0] text-xs">
                    {Object.entries(operationsData.mealOrders.bySlot).length === 0 ? (
                      <p className="py-4 text-center text-[#737373]">No meal orders in this period.</p>
                    ) : (
                      Object.entries(operationsData.mealOrders.bySlot).map(([slot, count]) => (
                        <div key={slot} className="py-2.5 flex items-center justify-between">
                          <span className="capitalize text-[#737373]">{slot.replace("_", " ")}</span>
                          <span className="font-mono font-semibold text-[#171717]">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Stock Valuation by Category
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4">SKU Count</th>
                          <th className="py-2.5 px-4 text-right">Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0]">
                        {operationsData.inventory.byCategory.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-xs text-[#737373]">
                              No inventory items recorded.
                            </td>
                          </tr>
                        ) : (
                          operationsData.inventory.byCategory.map((cat) => (
                            <tr key={cat.category} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-2.5 px-4 capitalize font-medium text-[#171717]">
                                {cat.category.replace("_", " ")}
                              </td>
                              <td className="py-2.5 px-4 text-[#737373] font-mono">{cat.itemCount}</td>
                              <td className="py-2.5 px-4 font-mono text-right font-semibold text-[#171717]">
                                {formatCurrency(cat.valuation)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
