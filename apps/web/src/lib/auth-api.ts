import type {
  PlatformSignInResponse,
  TenantSignInResponse,
  RefreshResponse,
  SignInRequest,
  InvitationAcceptRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function platformSignIn(dto: SignInRequest): Promise<PlatformSignInResponse> {
  return apiFetch("/platform/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function tenantSignIn(tenantSlug: string, dto: SignInRequest): Promise<TenantSignInResponse> {
  return apiFetch(`/auth/sign-in/${tenantSlug}`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function refreshTokens(refreshToken: string): Promise<RefreshResponse> {
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function signOut(refreshToken: string): Promise<{ message: string }> {
  return apiFetch("/auth/sign-out", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function platformSignOut(refreshToken: string): Promise<{ message: string }> {
  return apiFetch("/platform/auth/sign-out", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function acceptInvitation(dto: InvitationAcceptRequest): Promise<TenantSignInResponse> {
  return apiFetch("/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function forgotPassword(dto: ForgotPasswordRequest): Promise<{ message: string }> {
  return apiFetch("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function resetPassword(dto: ResetPasswordRequest): Promise<{ message: string }> {
  return apiFetch("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}


export interface PublicTenantInfo {
  id: string;
  slug: string;
  displayName: string;
  currencyCode: string;
  locale: string;
  timezone: string;
}

export function getPublicTenantInfo(tenantSlug: string): Promise<PublicTenantInfo> {
  return apiFetch(`/auth/tenant-info/${tenantSlug}`);
}
