import type {
  CostSheet,
  CostSheetCalculationInput,
  CostSheetCalculationResult,
  CostSheetListResponse,
  CostSheetSearchParams,
  CreateCostSheetRequest,
  CreateRecipeRequest,
  Recipe,
  RecipeListResponse,
  RecipeSearchParams,
  UpdateCostSheetRequest,
  UpdateRecipeRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

// --- Recipes API ---

export function listRecipes(
  token: string,
  params?: RecipeSearchParams,
): Promise<RecipeListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.isArchived) query.set("isArchived", params.isArchived);
  const qs = query.toString();
  return apiFetch(`/recipes${qs ? `?${qs}` : ""}`, { token });
}

export function getRecipe(recipeId: string, token: string): Promise<Recipe> {
  return apiFetch(`/recipes/${recipeId}`, { token });
}

export function createRecipe(
  dto: CreateRecipeRequest,
  token: string,
): Promise<Recipe> {
  return apiFetch("/recipes", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateRecipe(
  recipeId: string,
  dto: UpdateRecipeRequest,
  token: string,
): Promise<Recipe> {
  return apiFetch(`/recipes/${recipeId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function deleteRecipe(
  recipeId: string,
  token: string,
): Promise<{ success: boolean; id: string }> {
  return apiFetch(`/recipes/${recipeId}`, {
    method: "DELETE",
    token,
  });
}

// --- Cost Sheets & Calculation Engine API ---

export function calculateCostSheet(
  dto: CostSheetCalculationInput,
  token?: string,
): Promise<CostSheetCalculationResult> {
  return apiFetch(
    "/cost-sheets/calculate",
    token
      ? {
          method: "POST",
          body: JSON.stringify(dto),
          token,
        }
      : {
          method: "POST",
          body: JSON.stringify(dto),
        },
  );
}

export function listCostSheets(
  token: string,
  params?: CostSheetSearchParams,
): Promise<CostSheetListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.menuId) query.set("menuId", params.menuId);
  if (params?.recipeId) query.set("recipeId", params.recipeId);
  const qs = query.toString();
  return apiFetch(`/cost-sheets${qs ? `?${qs}` : ""}`, { token });
}

export function getCostSheet(
  costSheetId: string,
  token: string,
): Promise<CostSheet> {
  return apiFetch(`/cost-sheets/${costSheetId}`, { token });
}

export function createCostSheet(
  dto: CreateCostSheetRequest,
  token: string,
): Promise<CostSheet> {
  return apiFetch("/cost-sheets", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateCostSheet(
  costSheetId: string,
  dto: UpdateCostSheetRequest,
  token: string,
): Promise<CostSheet> {
  return apiFetch(`/cost-sheets/${costSheetId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function deleteCostSheet(
  costSheetId: string,
  token: string,
): Promise<{ success: boolean; id: string }> {
  return apiFetch(`/cost-sheets/${costSheetId}`, {
    method: "DELETE",
    token,
  });
}
