import type {
  CreateInventoryItemRequest,
  InventoryCategory,
  InventoryItem,
  InventorySummary,
  RecordStockMovementRequest,
  StockMovement,
  StockStatus,
  UpdateInventoryItemRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export interface InventoryItemListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockMovementListResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getInventorySummary(token: string): Promise<InventorySummary> {
  return apiFetch("/inventory/summary", { token });
}

export function listInventoryItems(
  token: string,
  params?: {
    search?: string | undefined;
    category?: InventoryCategory | undefined;
    status?: StockStatus | undefined;
    includeArchived?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<InventoryItemListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  if (params?.includeArchived) query.set("includeArchived", "true");
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/inventory/items${qs ? `?${qs}` : ""}`, { token });
}

export function getInventoryItem(
  id: string,
  token: string,
): Promise<InventoryItem & { recentMovements: StockMovement[] }> {
  return apiFetch(`/inventory/items/${id}`, { token });
}

export function createInventoryItem(
  data: CreateInventoryItemRequest,
  token: string,
): Promise<InventoryItem> {
  return apiFetch("/inventory/items", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemRequest,
  token: string,
): Promise<InventoryItem> {
  return apiFetch(`/inventory/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function archiveInventoryItem(
  id: string,
  token: string,
): Promise<InventoryItem> {
  return apiFetch(`/inventory/items/${id}/archive`, {
    method: "POST",
    token,
  });
}

export function restoreInventoryItem(
  id: string,
  token: string,
): Promise<InventoryItem> {
  return apiFetch(`/inventory/items/${id}/restore`, {
    method: "POST",
    token,
  });
}

export function listStockMovements(
  token: string,
  params?: {
    inventoryItemId?: string | undefined;
    type?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<StockMovementListResponse> {
  const query = new URLSearchParams();
  if (params?.inventoryItemId) query.set("inventoryItemId", params.inventoryItemId);
  if (params?.type) query.set("type", params.type);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/inventory/movements${qs ? `?${qs}` : ""}`, { token });
}

export function recordStockMovement(
  data: RecordStockMovementRequest,
  token: string,
): Promise<StockMovement> {
  return apiFetch("/inventory/movements", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}
