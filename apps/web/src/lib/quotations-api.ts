import type {
  CreateQuotationRequest,
  CreateQuotationRevisionRequest,
  Quotation,
  QuotationListResponse,
  QuotationSearchParams,
  SendQuotationRequest,
  UpdateDraftRevisionRequest,
  UpdateQuotationRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listQuotations(
  token: string,
  params?: QuotationSearchParams,
): Promise<QuotationListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.enquiryId) query.set("enquiryId", params.enquiryId);
  if (params?.customerId) query.set("customerId", params.customerId);
  const qs = query.toString();
  return apiFetch(`/quotations${qs ? `?${qs}` : ""}`, { token });
}

export function getQuotation(quotationId: string, token: string): Promise<Quotation> {
  return apiFetch(`/quotations/${quotationId}`, { token });
}

export function createQuotation(
  dto: CreateQuotationRequest,
  token: string,
): Promise<Quotation> {
  return apiFetch("/quotations", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateQuotation(
  quotationId: string,
  dto: UpdateQuotationRequest,
  token: string,
): Promise<Quotation> {
  return apiFetch(`/quotations/${quotationId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function createQuotationRevision(
  quotationId: string,
  dto: CreateQuotationRevisionRequest,
  token: string,
): Promise<Quotation> {
  return apiFetch(`/quotations/${quotationId}/revisions`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateDraftRevision(
  quotationId: string,
  revisionId: string,
  dto: UpdateDraftRevisionRequest,
  token: string,
): Promise<Quotation> {
  return apiFetch(`/quotations/${quotationId}/revisions/${revisionId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function sendQuotation(
  quotationId: string,
  dto: SendQuotationRequest | undefined,
  token: string,
): Promise<Quotation> {
  return apiFetch(
    `/quotations/${quotationId}/send`,
    dto
      ? { method: "POST", body: JSON.stringify(dto), token }
      : { method: "POST", token },
  );
}

export function acceptQuotation(
  quotationId: string,
  revisionId: string | undefined,
  token: string,
): Promise<Quotation> {
  return apiFetch(
    `/quotations/${quotationId}/accept`,
    revisionId
      ? { method: "POST", body: JSON.stringify({ revisionId }), token }
      : { method: "POST", token },
  );
}

export function rejectQuotation(
  quotationId: string,
  reason: string | undefined,
  token: string,
): Promise<Quotation> {
  return apiFetch(
    `/quotations/${quotationId}/reject`,
    reason
      ? { method: "POST", body: JSON.stringify({ reason }), token }
      : { method: "POST", token },
  );
}
