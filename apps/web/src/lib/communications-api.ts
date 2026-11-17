import type {
  CommunicationFilterParams,
  CommunicationItem,
  CommunicationListResponse,
  CommunicationStats,
  CommunicationTemplateItem,
  CreateCommunicationRequest,
  PlatformCommunicationConfigDto,
  PlatformCommunicationUsageSummary,
  TenantCommunicationQuotaDto,
  TenantQuotaOverviewItem,
  TestGatewayConnectionRequest,
  TestGatewayConnectionResponse,
  UpdatePlatformCommunicationConfigRequest,
  UpdateTenantQuotaRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listCommunications(
  token: string,
  params?: CommunicationFilterParams,
): Promise<CommunicationListResponse> {
  const query = new URLSearchParams();
  if (params?.channel) query.set("channel", params.channel);
  if (params?.status) query.set("status", params.status);
  if (params?.direction) query.set("direction", params.direction);
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.entityId) query.set("entityId", params.entityId);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return apiFetch(`/communications${qs ? `?${qs}` : ""}`, { token });
}

export function getCommunication(
  communicationId: string,
  token: string,
): Promise<CommunicationItem> {
  return apiFetch(`/communications/${communicationId}`, { token });
}

export function getCommunicationStats(
  token: string,
): Promise<CommunicationStats> {
  return apiFetch("/communications/stats", { token });
}

export function getCommunicationTemplates(
  token: string,
): Promise<CommunicationTemplateItem[]> {
  return apiFetch("/communications/templates", { token });
}

export function createCommunication(
  dto: CreateCommunicationRequest,
  token: string,
): Promise<CommunicationItem> {
  return apiFetch("/communications", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function retryCommunication(
  communicationId: string,
  token: string,
): Promise<CommunicationItem> {
  return apiFetch(`/communications/${communicationId}/retry`, {
    method: "POST",
    token,
  });
}

export function getTenantQuota(
  token: string,
): Promise<TenantCommunicationQuotaDto> {
  return apiFetch("/communications/quota", { token });
}

// Platform Super Admin Gateway & Quota APIs
export function getPlatformCommunicationConfig(
  token: string,
): Promise<PlatformCommunicationConfigDto> {
  return apiFetch("/platform/communications/config", { token });
}

export function updatePlatformCommunicationConfig(
  dto: UpdatePlatformCommunicationConfigRequest,
  token: string,
): Promise<PlatformCommunicationConfigDto> {
  return apiFetch("/platform/communications/config", {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function testGatewayConnection(
  dto: TestGatewayConnectionRequest,
  token: string,
): Promise<TestGatewayConnectionResponse> {
  return apiFetch("/platform/communications/test-connection", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function getPlatformTenantQuotas(
  token: string,
): Promise<TenantQuotaOverviewItem[]> {
  return apiFetch("/platform/communications/quotas", { token });
}

export function updateTenantQuota(
  tenantId: string,
  dto: UpdateTenantQuotaRequest,
  token: string,
): Promise<TenantCommunicationQuotaDto> {
  return apiFetch(`/platform/communications/quotas/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function getPlatformUsageSummary(
  token: string,
): Promise<PlatformCommunicationUsageSummary> {
  return apiFetch("/platform/communications/usage-summary", { token });
}

