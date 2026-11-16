import type {
  CreateKitchenPlanRequest,
  CreateKitchenTaskItem,
  KitchenPlanSource,
  KitchenPlanStatus,
  KitchenProductionPlan,
  KitchenStation,
  KitchenSummary,
  KitchenTask,
  RecordKitchenConsumptionRequest,
  UpdateKitchenPlanRequest,
  UpdateKitchenTaskRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export interface KitchenPlanListResponse {
  plans: KitchenProductionPlan[];
  total: number;
  page: number;
  limit: number;
}

export function getKitchenSummary(
  token: string,
  date?: string,
): Promise<KitchenSummary> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch(`/kitchen/summary${query}`, { token });
}

export function listKitchenPlans(
  token: string,
  params?: {
    date?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    status?: KitchenPlanStatus | undefined;
    source?: KitchenPlanSource | undefined;
    station?: KitchenStation | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<KitchenPlanListResponse> {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.status) query.set("status", params.status);
  if (params?.source) query.set("source", params.source);
  if (params?.station) query.set("station", params.station);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/kitchen/plans${qs ? `?${qs}` : ""}`, { token });
}

export function getKitchenPlan(
  id: string,
  token: string,
): Promise<KitchenProductionPlan> {
  return apiFetch(`/kitchen/plans/${id}`, { token });
}

export function createKitchenPlan(
  data: CreateKitchenPlanRequest,
  token: string,
): Promise<KitchenProductionPlan> {
  return apiFetch("/kitchen/plans", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updateKitchenPlan(
  id: string,
  data: UpdateKitchenPlanRequest,
  token: string,
): Promise<KitchenProductionPlan> {
  return apiFetch(`/kitchen/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function addKitchenTask(
  planId: string,
  data: CreateKitchenTaskItem,
  token: string,
): Promise<KitchenTask> {
  return apiFetch(`/kitchen/plans/${planId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updateKitchenTask(
  planId: string,
  taskId: string,
  data: UpdateKitchenTaskRequest,
  token: string,
): Promise<KitchenTask> {
  return apiFetch(`/kitchen/plans/${planId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function deleteKitchenTask(
  planId: string,
  taskId: string,
  token: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/kitchen/plans/${planId}/tasks/${taskId}`, {
    method: "DELETE",
    token,
  });
}

export function recordKitchenConsumption(
  planId: string,
  data: RecordKitchenConsumptionRequest,
  token: string,
): Promise<{ movementId: string; newStock: number }> {
  return apiFetch(`/kitchen/plans/${planId}/record-consumption`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}
