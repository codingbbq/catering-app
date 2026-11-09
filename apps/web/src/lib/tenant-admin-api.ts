import type {
  CreateInvitationRequest,
  InvitationItem,
  InvitationListResponse,
  TenantProfile,
  TenantUserItem,
  TenantUserListResponse,
  UpdateTenantProfile,
  UpdateTenantUserRole,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function getTenantProfile(token: string): Promise<TenantProfile> {
  return apiFetch("/tenant/me", { token });
}

export function updateTenantProfile(
  dto: UpdateTenantProfile,
  token: string,
): Promise<TenantProfile> {
  return apiFetch("/tenant/me", {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function listTenantUsers(token: string): Promise<TenantUserListResponse> {
  return apiFetch("/tenant/users", { token });
}

export function updateTenantUserRole(
  userId: string,
  dto: UpdateTenantUserRole,
  token: string,
): Promise<TenantUserItem> {
  return apiFetch(`/tenant/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function deactivateTenantUser(
  userId: string,
  token: string,
): Promise<TenantUserItem> {
  return apiFetch(`/tenant/users/${userId}/deactivate`, {
    method: "POST",
    token,
  });
}

export function listInvitations(token: string): Promise<InvitationListResponse> {
  return apiFetch("/tenant/users/invitations", { token });
}

export function createInvitation(
  dto: CreateInvitationRequest,
  token: string,
): Promise<InvitationItem> {
  return apiFetch("/tenant/users/invitations", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}
