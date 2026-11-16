import type {
  CreatePurchaseOrderRequest,
  CreateSupplierRequest,
  ProcurementSummary,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrdersQuery,
  ReceivePurchaseOrderItemsRequest,
  Supplier,
  SupplierQuery,
  UpdatePurchaseOrderRequest,
  UpdateSupplierRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Supplier API Functions
// ==========================================

export function listSuppliers(
  token: string,
  params?: {
    search?: string | undefined;
    includeArchived?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<SupplierListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.includeArchived) query.set("includeArchived", "true");
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/suppliers${qs ? `?${qs}` : ""}`, { token });
}

export function getSupplier(
  id: string,
  token: string,
): Promise<Supplier & { recentOrders: PurchaseOrder[] }> {
  return apiFetch(`/suppliers/${id}`, { token });
}

export function createSupplier(
  data: CreateSupplierRequest,
  token: string,
): Promise<Supplier> {
  return apiFetch("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updateSupplier(
  id: string,
  data: UpdateSupplierRequest,
  token: string,
): Promise<Supplier> {
  return apiFetch(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function archiveSupplier(id: string, token: string): Promise<Supplier> {
  return apiFetch(`/suppliers/${id}/archive`, {
    method: "POST",
    token,
  });
}

export function restoreSupplier(id: string, token: string): Promise<Supplier> {
  return apiFetch(`/suppliers/${id}/restore`, {
    method: "POST",
    token,
  });
}

// ==========================================
// Purchase Order API Functions
// ==========================================

export function getProcurementSummary(token: string): Promise<ProcurementSummary> {
  return apiFetch("/purchase-orders/summary", { token });
}

export function listPurchaseOrders(
  token: string,
  params?: {
    supplierId?: string | undefined;
    status?: PurchaseOrderStatus | undefined;
    search?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<PurchaseOrderListResponse> {
  const query = new URLSearchParams();
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/purchase-orders${qs ? `?${qs}` : ""}`, { token });
}

export function getPurchaseOrder(id: string, token: string): Promise<PurchaseOrder> {
  return apiFetch(`/purchase-orders/${id}`, { token });
}

export function createPurchaseOrder(
  data: CreatePurchaseOrderRequest,
  token: string,
): Promise<PurchaseOrder> {
  return apiFetch("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updatePurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderRequest,
  token: string,
): Promise<PurchaseOrder> {
  return apiFetch(`/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function submitPurchaseOrder(id: string, token: string): Promise<PurchaseOrder> {
  return apiFetch(`/purchase-orders/${id}/submit`, {
    method: "POST",
    token,
  });
}

export function cancelPurchaseOrder(id: string, token: string): Promise<PurchaseOrder> {
  return apiFetch(`/purchase-orders/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export function receivePurchaseOrderItems(
  id: string,
  data: ReceivePurchaseOrderItemsRequest,
  token: string,
): Promise<PurchaseOrder> {
  return apiFetch(`/purchase-orders/${id}/receive`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}
