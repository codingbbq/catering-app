import type {
  CreateDailyMealOrderRequest,
  CreateDailyMealPlanRequest,
  DailyMealOrderDetail,
  DailyMealOrderFilterParams,
  DailyMealOrderListResponse,
  DailyMealOrderStats,
  DailyMealPlanDetail,
  DailyMealPlanListItem,
  GenerateOrdersFromPlanRequest,
  GenerateOrdersResult,
  UpdateDailyMealOrderRequest,
  UpdateDailyMealOrderStatusRequest,
  UpdateDailyMealPlanRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

// ==========================================
// Daily Meal Orders
// ==========================================

export function listDailyMealOrders(
  token: string,
  params?: DailyMealOrderFilterParams,
): Promise<DailyMealOrderListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.serviceSlot) query.set("serviceSlot", params.serviceSlot);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.planId) query.set("planId", params.planId);
  if (params?.serviceDate) query.set("serviceDate", params.serviceDate);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/daily-meal-orders${qs ? `?${qs}` : ""}`, { token });
}

export function getDailyMealOrderStats(
  token: string,
  date?: string,
  fromDate?: string,
  toDate?: string,
): Promise<DailyMealOrderStats> {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (fromDate) query.set("fromDate", fromDate);
  if (toDate) query.set("toDate", toDate);

  const qs = query.toString();
  return apiFetch(`/daily-meal-orders/stats${qs ? `?${qs}` : ""}`, { token });
}

export function getDailyMealOrder(
  orderId: string,
  token: string,
): Promise<DailyMealOrderDetail> {
  return apiFetch(`/daily-meal-orders/${orderId}`, { token });
}

export function createDailyMealOrder(
  dto: CreateDailyMealOrderRequest,
  token: string,
): Promise<DailyMealOrderDetail> {
  return apiFetch("/daily-meal-orders", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateDailyMealOrder(
  orderId: string,
  dto: UpdateDailyMealOrderRequest,
  token: string,
): Promise<DailyMealOrderDetail> {
  return apiFetch(`/daily-meal-orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateDailyMealOrderStatus(
  orderId: string,
  dto: UpdateDailyMealOrderStatusRequest,
  token: string,
): Promise<DailyMealOrderDetail> {
  return apiFetch(`/daily-meal-orders/${orderId}/status`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function confirmDailyMealOrder(
  orderId: string,
  token: string,
): Promise<DailyMealOrderDetail> {
  return apiFetch(`/daily-meal-orders/${orderId}/confirm`, {
    method: "POST",
    token,
  });
}

export function createInvoiceForDailyMealOrder(
  orderId: string,
  dto: { title?: string; dueDate?: string; notes?: string } | undefined,
  token: string,
): Promise<any> {
  return apiFetch(`/daily-meal-orders/${orderId}/invoice`, {
    method: "POST",
    body: JSON.stringify(dto || {}),
    token,
  });
}

// ==========================================
// Daily Meal Plans
// ==========================================

export function listDailyMealPlans(
  token: string,
): Promise<DailyMealPlanListItem[]> {
  return apiFetch("/daily-meal-plans", { token });
}

export function getDailyMealPlan(
  planId: string,
  token: string,
): Promise<DailyMealPlanDetail> {
  return apiFetch(`/daily-meal-plans/${planId}`, { token });
}

export function createDailyMealPlan(
  dto: CreateDailyMealPlanRequest,
  token: string,
): Promise<DailyMealPlanDetail> {
  return apiFetch("/daily-meal-plans", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateDailyMealPlan(
  planId: string,
  dto: UpdateDailyMealPlanRequest,
  token: string,
): Promise<DailyMealPlanDetail> {
  return apiFetch(`/daily-meal-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function generateOrdersFromPlan(
  planId: string,
  dto: GenerateOrdersFromPlanRequest,
  token: string,
): Promise<GenerateOrdersResult> {
  return apiFetch(`/daily-meal-plans/${planId}/generate-orders`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}
