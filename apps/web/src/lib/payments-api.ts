import type {
  CreatePaymentAllocationsRequest,
  CreatePaymentRequest,
  PaymentDetail,
  PaymentFilterParams,
  PaymentListResponse,
  PaymentStats,
  VoidPaymentRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listPayments(
  token: string,
  params?: PaymentFilterParams,
): Promise<PaymentListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.paymentMethod) query.set("paymentMethod", params.paymentMethod);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/payments${qs ? `?${qs}` : ""}`, { token });
}

export function getPaymentStats(token: string): Promise<PaymentStats> {
  return apiFetch("/payments/stats", { token });
}

export function getPayment(
  paymentId: string,
  token: string,
): Promise<PaymentDetail> {
  return apiFetch(`/payments/${paymentId}`, { token });
}

export function createPayment(
  dto: CreatePaymentRequest,
  token: string,
): Promise<PaymentDetail> {
  return apiFetch("/payments", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function allocatePayment(
  paymentId: string,
  dto: CreatePaymentAllocationsRequest,
  token: string,
): Promise<PaymentDetail> {
  return apiFetch(`/payments/${paymentId}/allocations`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function deallocatePayment(
  paymentId: string,
  allocationId: string,
  token: string,
): Promise<PaymentDetail> {
  return apiFetch(`/payments/${paymentId}/allocations/${allocationId}`, {
    method: "DELETE",
    token,
  });
}

export function voidPayment(
  paymentId: string,
  dto: VoidPaymentRequest,
  token: string,
): Promise<PaymentDetail> {
  return apiFetch(`/payments/${paymentId}/void`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}
