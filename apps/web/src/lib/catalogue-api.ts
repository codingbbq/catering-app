import type {
  CatalogueImportJob,
  CatalogueImportRequest,
  CatalogueImportResult,
  CatalogueItem,
  CatalogueItemListResponse,
  CatalogueSearchParams,
  CreateCatalogueItemRequest,
  UpdateCatalogueItemRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listCatalogueItems(
  token: string,
  params?: CatalogueSearchParams,
): Promise<CatalogueItemListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  if (params?.dietaryTag) query.set("dietaryTag", params.dietaryTag);
  const qs = query.toString();
  return apiFetch(`/catalogue-items${qs ? `?${qs}` : ""}`, { token });
}

export function getCatalogueItem(
  itemId: string,
  token: string,
): Promise<CatalogueItem> {
  return apiFetch(`/catalogue-items/${itemId}`, { token });
}

export function createCatalogueItem(
  dto: CreateCatalogueItemRequest,
  token: string,
): Promise<CatalogueItem> {
  return apiFetch("/catalogue-items", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateCatalogueItem(
  itemId: string,
  dto: UpdateCatalogueItemRequest,
  token: string,
): Promise<CatalogueItem> {
  return apiFetch(`/catalogue-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function archiveCatalogueItem(
  itemId: string,
  token: string,
): Promise<CatalogueItem> {
  return apiFetch(`/catalogue-items/${itemId}/archive`, {
    method: "POST",
    token,
  });
}

export function reactivateCatalogueItem(
  itemId: string,
  token: string,
): Promise<CatalogueItem> {
  return apiFetch(`/catalogue-items/${itemId}/reactivate`, {
    method: "POST",
    token,
  });
}

export function importCatalogue(
  dto: CatalogueImportRequest,
  token: string,
): Promise<CatalogueImportResult> {
  return apiFetch("/catalogue-imports", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function getImportJobs(token: string): Promise<CatalogueImportJob[]> {
  return apiFetch("/catalogue-imports", { token });
}

export function getImportJob(
  jobId: string,
  token: string,
): Promise<CatalogueImportJob> {
  return apiFetch(`/catalogue-imports/${jobId}`, { token });
}
