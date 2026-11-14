import type {
  CreateInvoiceFromBookingRequest,
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoiceFilterParams,
  InvoiceListResponse,
  RecordInvoicePaymentRequest,
  UpdateInvoiceRequest,
  VoidInvoiceRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listInvoices(
  token: string,
  params?: InvoiceFilterParams,
): Promise<InvoiceListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.bookingId) query.set("bookingId", params.bookingId);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/invoices${qs ? `?${qs}` : ""}`, { token });
}

export function getInvoice(invoiceId: string, token: string): Promise<InvoiceDetail> {
  return apiFetch(`/invoices/${invoiceId}`, { token });
}

export function createInvoice(
  dto: CreateInvoiceRequest,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch("/invoices", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function createInvoiceFromBooking(
  dto: CreateInvoiceFromBookingRequest,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch("/invoices/from-booking", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateInvoice(
  invoiceId: string,
  dto: UpdateInvoiceRequest,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch(`/invoices/${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function issueInvoice(
  invoiceId: string,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch(`/invoices/${invoiceId}/issue`, {
    method: "POST",
    token,
  });
}

export function recordInvoicePayment(
  invoiceId: string,
  dto: RecordInvoicePaymentRequest,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function voidInvoice(
  invoiceId: string,
  dto: VoidInvoiceRequest,
  token: string,
): Promise<InvoiceDetail> {
  return apiFetch(`/invoices/${invoiceId}/void`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function deleteDraftInvoice(
  invoiceId: string,
  token: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/invoices/${invoiceId}`, {
    method: "DELETE",
    token,
  });
}
