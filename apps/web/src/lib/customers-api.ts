import type {
  CreateContactRequest,
  CreateCustomerRequest,
  CustomerContact,
  CustomerDetail,
  CustomerListResponse,
  UpdateContactRequest,
  UpdateCustomerRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listCustomers(
  token: string,
  params?: { search?: string; isActive?: boolean },
): Promise<CustomerListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  const qs = query.toString();
  return apiFetch(`/customers${qs ? `?${qs}` : ""}`, { token });
}

export function getCustomer(customerId: string, token: string): Promise<CustomerDetail> {
  return apiFetch(`/customers/${customerId}`, { token });
}

export function createCustomer(
  dto: CreateCustomerRequest,
  token: string,
): Promise<CustomerDetail> {
  return apiFetch("/customers", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateCustomer(
  customerId: string,
  dto: UpdateCustomerRequest,
  token: string,
): Promise<CustomerDetail> {
  return apiFetch(`/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function addCustomerContact(
  customerId: string,
  dto: CreateContactRequest,
  token: string,
): Promise<CustomerContact> {
  return apiFetch(`/customers/${customerId}/contacts`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateCustomerContact(
  customerId: string,
  contactId: string,
  dto: UpdateContactRequest,
  token: string,
): Promise<CustomerContact> {
  return apiFetch(`/customers/${customerId}/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}
