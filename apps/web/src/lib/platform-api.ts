import type {
  CreateTenantRequest,
  TenantDetail,
  TenantListResponse,
  UpdateTenantRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listTenants(token: string): Promise<TenantListResponse> {
  return apiFetch("/platform/tenants", { token });
}

export function getTenant(tenantId: string, token: string): Promise<TenantDetail> {
  return apiFetch(`/platform/tenants/${tenantId}`, { token });
}

export function createTenant(dto: CreateTenantRequest, token: string): Promise<TenantDetail> {
  return apiFetch("/platform/tenants", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateTenant(
  tenantId: string,
  dto: UpdateTenantRequest,
  token: string,
): Promise<TenantDetail> {
  return apiFetch(`/platform/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function activateTenant(tenantId: string, token: string): Promise<TenantDetail> {
  return apiFetch(`/platform/tenants/${tenantId}/activate`, { method: "POST", token });
}

export function suspendTenant(tenantId: string, token: string): Promise<TenantDetail> {
  return apiFetch(`/platform/tenants/${tenantId}/suspend`, { method: "POST", token });
}

export function archiveTenant(tenantId: string, token: string): Promise<TenantDetail> {
  return apiFetch(`/platform/tenants/${tenantId}/archive`, { method: "POST", token });
}
