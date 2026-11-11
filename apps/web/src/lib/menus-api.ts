import type {
  CreateMenuRequest,
  DuplicateMenuRequest,
  Menu,
  MenuListResponse,
  MenuSearchParams,
  UpdateMenuRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listMenus(
  token: string,
  params?: MenuSearchParams,
): Promise<MenuListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.serviceStyle) query.set("serviceStyle", params.serviceStyle);
  const qs = query.toString();
  return apiFetch(`/menus${qs ? `?${qs}` : ""}`, { token });
}

export function getMenu(menuId: string, token: string): Promise<Menu> {
  return apiFetch(`/menus/${menuId}`, { token });
}

export function createMenu(
  dto: CreateMenuRequest,
  token: string,
): Promise<Menu> {
  return apiFetch("/menus", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateMenu(
  menuId: string,
  dto: UpdateMenuRequest,
  token: string,
): Promise<Menu> {
  return apiFetch(`/menus/${menuId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function duplicateMenu(
  menuId: string,
  dto: DuplicateMenuRequest,
  token: string,
): Promise<Menu> {
  return apiFetch(`/menus/${menuId}/duplicate`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function archiveMenu(menuId: string, token: string): Promise<Menu> {
  return apiFetch(`/menus/${menuId}/archive`, {
    method: "POST",
    token,
  });
}

export function reactivateMenu(menuId: string, token: string): Promise<Menu> {
  return apiFetch(`/menus/${menuId}/reactivate`, {
    method: "POST",
    token,
  });
}

export function deleteMenu(
  menuId: string,
  token: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/menus/${menuId}`, {
    method: "DELETE",
    token,
  });
}
