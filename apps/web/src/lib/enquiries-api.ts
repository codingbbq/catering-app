import type {
  CreateEnquiryActivityRequest,
  CreateEnquiryRequest,
  EnquiryActivityItem,
  EnquiryDetail,
  EnquiryListResponse,
  EnquiryStatus,
  ServiceType,
  UpdateEnquiryRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listEnquiries(
  token: string,
  params?: {
    search?: string | undefined;
    status?: EnquiryStatus | undefined;
    customerId?: string | undefined;
    serviceType?: ServiceType | undefined;
  },
): Promise<EnquiryListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.serviceType) query.set("serviceType", params.serviceType);
  const qs = query.toString();
  return apiFetch(`/enquiries${qs ? `?${qs}` : ""}`, { token });
}

export function getEnquiry(enquiryId: string, token: string): Promise<EnquiryDetail> {
  return apiFetch(`/enquiries/${enquiryId}`, { token });
}

export function createEnquiry(
  dto: CreateEnquiryRequest,
  token: string,
): Promise<EnquiryDetail> {
  return apiFetch("/enquiries", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateEnquiry(
  enquiryId: string,
  dto: UpdateEnquiryRequest,
  token: string,
): Promise<EnquiryDetail> {
  return apiFetch(`/enquiries/${enquiryId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function qualifyEnquiry(
  enquiryId: string,
  token: string,
): Promise<EnquiryDetail> {
  return apiFetch(`/enquiries/${enquiryId}/qualify`, {
    method: "POST",
    token,
  });
}

export function addEnquiryActivity(
  enquiryId: string,
  dto: CreateEnquiryActivityRequest,
  token: string,
): Promise<EnquiryActivityItem> {
  return apiFetch(`/enquiries/${enquiryId}/activities`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}
