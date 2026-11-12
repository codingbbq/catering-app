"use client";

import type {
  CostSheet,
  CostSheetSearchParams,
  CreateCostSheetRequest,
  CreateRecipeRequest,
  Recipe,
  RecipeSearchParams,
  UpdateCostSheetRequest,
  UpdateRecipeRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CostSheetModal } from "@/features/costing/cost-sheet-modal";
import { CostSheetTable } from "@/features/costing/cost-sheet-table";
import { QuickCostCalculator } from "@/features/costing/quick-cost-calculator";
import { RecipeModal } from "@/features/costing/recipe-modal";
import { RecipeTable } from "@/features/costing/recipe-table";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  createCostSheet,
  createRecipe,
  deleteCostSheet,
  deleteRecipe,
  listCostSheets,
  listRecipes,
  updateCostSheet,
  updateRecipe,
} from "@/lib/costing-api";
import { listMenus } from "@/lib/menus-api";
import { useAuth } from "@/providers/auth-provider";

type ActiveTab = "recipes" | "cost-sheets" | "calculator";

export default function CostingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenantCurrency();

  const [activeTab, setActiveTab] = useState<ActiveTab>("recipes");

  // Recipe filters
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("all");
  const [recipeArchived, setRecipeArchived] = useState<"false" | "true" | "all">("false");

  // Cost sheet filters
  const [sheetSearch, setSheetSearch] = useState("");
  const [sheetStatus, setSheetStatus] = useState<"all" | "active" | "draft" | "archived">("active");

  // Modals state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [isCostSheetModalOpen, setIsCostSheetModalOpen] = useState(false);
  const [selectedCostSheet, setSelectedCostSheet] = useState<CostSheet | null>(null);

  // Queries
  const recipeQueryParams = useMemo<RecipeSearchParams>(
    () => ({
      search: recipeSearch.trim() || undefined,
      category: recipeCategory !== "all" ? recipeCategory : undefined,
      isArchived: recipeArchived,
    }),
    [recipeSearch, recipeCategory, recipeArchived],
  );

  const { data: recipeData, isLoading: isRecipesLoading } = useQuery({
    queryKey: ["tenant", tenantSlug, "recipes", recipeQueryParams],
    queryFn: () => listRecipes(accessToken!, recipeQueryParams),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const sheetQueryParams = useMemo<CostSheetSearchParams>(
    () => ({
      search: sheetSearch.trim() || undefined,
      status: sheetStatus,
    }),
    [sheetSearch, sheetStatus],
  );

  const { data: sheetData, isLoading: isSheetsLoading } = useQuery({
    queryKey: ["tenant", tenantSlug, "cost-sheets", sheetQueryParams],
    queryFn: () => listCostSheets(accessToken!, sheetQueryParams),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Fetch menus for cost sheet linkage
  const { data: menusData } = useQuery({
    queryKey: ["tenant", tenantSlug, "menus-simple"],
    queryFn: () => listMenus(accessToken!, { status: "active" }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Recipe Mutations
  const saveRecipeMutation = useMutation({
    mutationFn: async (dto: CreateRecipeRequest | UpdateRecipeRequest) => {
      if (!accessToken) throw new Error("Authentication required");
      if (selectedRecipe) {
        return updateRecipe(selectedRecipe.id, dto as UpdateRecipeRequest, accessToken);
      }
      return createRecipe(dto as CreateRecipeRequest, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "recipes"],
      });
      setIsRecipeModalOpen(false);
      setSelectedRecipe(null);
    },
  });

  const toggleArchiveRecipeMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      if (!accessToken) throw new Error("Authentication required");
      return updateRecipe(
        recipe.id,
        { isArchived: !recipe.isArchived },
        accessToken,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "recipes"],
      });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!accessToken) throw new Error("Authentication required");
      return deleteRecipe(recipeId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "recipes"],
      });
    },
  });

  // Cost Sheet Mutations
  const saveCostSheetMutation = useMutation({
    mutationFn: async (dto: CreateCostSheetRequest | UpdateCostSheetRequest) => {
      if (!accessToken) throw new Error("Authentication required");
      if (selectedCostSheet) {
        return updateCostSheet(selectedCostSheet.id, dto as UpdateCostSheetRequest, accessToken);
      }
      return createCostSheet(dto as CreateCostSheetRequest, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "cost-sheets"],
      });
      setIsCostSheetModalOpen(false);
      setSelectedCostSheet(null);
    },
  });

  const deleteCostSheetMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      if (!accessToken) throw new Error("Authentication required");
      return deleteCostSheet(sheetId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "cost-sheets"],
      });
    },
  });

  const availableMenus = useMemo(() => {
    return (menusData?.data || []).map((m) => ({ id: m.id, name: m.name }));
  }, [menusData]);

  const availableRecipes = useMemo(() => {
    return (recipeData?.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      costPerYieldUnit: r.costPerYieldUnit,
    }));
  }, [recipeData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Costing & Recipes"
        description="Master food costs, recipe yields, labor add-ons, and pricing margins for disciplined quotations."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === "recipes" ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRecipe(null);
                  setIsRecipeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Recipe</span>
              </button>
            ) : activeTab === "cost-sheets" ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCostSheet(null);
                  setIsCostSheetModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Cost Sheet</span>
              </button>
            ) : null}
          </div>
        }
      />

      {/* Main Tabs Navigation */}
      <div className="border-b border-[#E5E5E5]">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("recipes")}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "recipes"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Recipes ({recipeData?.stats?.totalRecipes ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cost-sheets")}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "cost-sheets"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Cost Sheets ({sheetData?.stats?.totalCostSheets ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "calculator"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Quick Margin Simulator
          </button>
        </div>
      </div>

      {/* Tab 1: Recipes */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          {/* Recipe KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Total Recipes</span>
                <span className="text-xl font-bold font-mono text-[#171717]">
                  {recipeData?.stats?.totalRecipes ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Active Recipes</span>
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {recipeData?.stats?.activeRecipes ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Avg Cost / Portion</span>
                <span className="text-xl font-bold font-mono text-[#171717]">
                  {formatCurrency(recipeData?.stats?.avgCostPerPortion ?? 0)}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Archived Recipes</span>
                <span className="text-xl font-bold font-mono text-[#737373]">
                  {recipeData?.stats?.archivedRecipes ?? 0}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-[#E5E5E5]">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[#737373]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Search recipe name or ingredients..."
                className="w-full rounded-md border border-[#E5E5E5] pl-8 pr-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={recipeCategory}
                onChange={(e) => setRecipeCategory(e.target.value)}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none capitalize"
              >
                <option value="all">All Categories</option>
                <option value="starter">Starter</option>
                <option value="main">Main</option>
                <option value="side">Side</option>
                <option value="dessert">Dessert</option>
                <option value="sauce">Sauce</option>
                <option value="beverage">Beverage</option>
              </select>

              <select
                value={recipeArchived}
                onChange={(e) => setRecipeArchived(e.target.value as "false" | "true" | "all")}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="false">Active Only</option>
                <option value="true">Archived Only</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {/* Recipes Table */}
          <RecipeTable
            recipes={recipeData?.data ?? []}
            isLoading={isRecipesLoading}
            onEdit={(r) => {
              setSelectedRecipe(r);
              setIsRecipeModalOpen(true);
            }}
            onArchiveToggle={(r) => {
              const action = r.isArchived ? "reactivate" : "archive";
              if (window.confirm(`Are you sure you want to ${action} "${r.name}"?`)) {
                toggleArchiveRecipeMutation.mutate(r);
              }
            }}
            onDelete={(r) => {
              if (window.confirm(`Permanently delete recipe "${r.name}"?`)) {
                deleteRecipeMutation.mutate(r.id);
              }
            }}
          />
        </div>
      )}

      {/* Tab 2: Cost Sheets */}
      {activeTab === "cost-sheets" && (
        <div className="space-y-4">
          {/* Cost Sheet KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Total Cost Sheets</span>
                <span className="text-xl font-bold font-mono text-[#171717]">
                  {sheetData?.stats?.totalCostSheets ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Active Sheets</span>
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {sheetData?.stats?.activeCount ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Avg Gross Margin</span>
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {(sheetData?.stats?.avgMarginPercent ?? 0).toFixed(1)}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="block text-xs font-medium text-[#737373]">Avg Cost / Guest</span>
                <span className="text-xl font-bold font-mono text-[#171717]">
                  {formatCurrency(sheetData?.stats?.avgCostPerServing ?? 0)}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-[#E5E5E5]">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[#737373]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Search cost sheet name..."
                className="w-full rounded-md border border-[#E5E5E5] pl-8 pr-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sheetStatus}
                onChange={(e) => setSheetStatus(e.target.value as "all" | "active" | "draft" | "archived")}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none capitalize"
              >
                <option value="active">Active Only</option>
                <option value="draft">Drafts Only</option>
                <option value="archived">Archived</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {/* Cost Sheet Table */}
          <CostSheetTable
            costSheets={sheetData?.data ?? []}
            isLoading={isSheetsLoading}
            onEdit={(s) => {
              setSelectedCostSheet(s);
              setIsCostSheetModalOpen(true);
            }}
            onDelete={(s) => {
              if (window.confirm(`Permanently delete cost sheet "${s.name}"?`)) {
                deleteCostSheetMutation.mutate(s.id);
              }
            }}
          />
        </div>
      )}

      {/* Tab 3: Quick Margin Simulator */}
      {activeTab === "calculator" && <QuickCostCalculator />}

      {/* Recipe Modal */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        recipe={selectedRecipe}
        onClose={() => {
          setIsRecipeModalOpen(false);
          setSelectedRecipe(null);
        }}
        onSave={async (data) => {
          await saveRecipeMutation.mutateAsync(data);
        }}
        isSaving={saveRecipeMutation.isPending}
      />

      {/* Cost Sheet Modal */}
      <CostSheetModal
        isOpen={isCostSheetModalOpen}
        costSheet={selectedCostSheet}
        onClose={() => {
          setIsCostSheetModalOpen(false);
          setSelectedCostSheet(null);
        }}
        onSave={async (data) => {
          await saveCostSheetMutation.mutateAsync(data);
        }}
        isSaving={saveCostSheetMutation.isPending}
        availableMenus={availableMenus}
        availableRecipes={availableRecipes}
      />
    </div>
  );
}
