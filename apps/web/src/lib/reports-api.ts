import type {
  BookingSummaryReport,
  DashboardOverviewReport,
  FinanceSummaryReport,
  OperationsSummaryReport,
  PlatformTenantSummaryReport,
  ReportFilterQuery,
  SalesSummaryReport,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

function buildQueryString(params?: ReportFilterQuery): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function getDashboardOverview(token: string): Promise<DashboardOverviewReport> {
  return apiFetch("/reports/dashboard-overview", { token });
}

export function getSalesSummary(
  token: string,
  params?: ReportFilterQuery,
): Promise<SalesSummaryReport> {
  return apiFetch(`/reports/sales-summary${buildQueryString(params)}`, { token });
}

export function getBookingSummary(
  token: string,
  params?: ReportFilterQuery,
): Promise<BookingSummaryReport> {
  return apiFetch(`/reports/booking-summary${buildQueryString(params)}`, { token });
}

export function getFinanceSummary(
  token: string,
  params?: ReportFilterQuery,
): Promise<FinanceSummaryReport> {
  return apiFetch(`/reports/finance-summary${buildQueryString(params)}`, { token });
}

export function getOperationsSummary(
  token: string,
  params?: ReportFilterQuery,
): Promise<OperationsSummaryReport> {
  return apiFetch(`/reports/operations-summary${buildQueryString(params)}`, { token });
}

export function getPlatformTenantSummary(token: string): Promise<PlatformTenantSummaryReport> {
  return apiFetch("/platform/reports/tenant-summary", { token });
}
