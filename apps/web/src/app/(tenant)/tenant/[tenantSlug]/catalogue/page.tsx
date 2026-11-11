"use client";

import type {
  CatalogueItem,
  CatalogueSearchParams,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CatalogueTable } from "@/features/catalogue/catalogue-table";
import {
  archiveCatalogueItem,
  listCatalogueItems,
  reactivateCatalogueItem,
} from "@/lib/catalogue-api";
import { useAuth } from "@/providers/auth-provider";

const CATEGORY_TABS = [
  { id: "all", label: "All Items" },
  { id: "starter", label: "Starters" },
  { id: "main", label: "Mains" },
  { id: "dessert", label: "Desserts" },
  { id: "beverage", label: "Beverages" },
  { id: "bread", label: "Breads" },
  { id: "salad", label: "Salads" },
  { id: "side", label: "Sides" },
  { id: "snack", label: "Snacks" },
];

const DIETARY_FILTERS = [
  { id: "all", label: "All Dietary" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten_free", label: "Gluten-Free" },
  { id: "dairy_free", label: "Dairy-Free" },
  { id: "nut_free", label: "Nut-Free" },
];

export default function CataloguePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDietary, setSelectedDietary] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const queryParams = useMemo<CatalogueSearchParams>(
    () => ({
      search: searchTerm.trim() || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      dietaryTag: selectedDietary !== "all" ? selectedDietary : undefined,
      status: statusFilter,
    }),
    [searchTerm, selectedCategory, selectedDietary, statusFilter],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant", tenantSlug, "catalogue", queryParams],
    queryFn: () => listCatalogueItems(accessToken!, queryParams),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async (item: CatalogueItem) => {
      if (!accessToken) throw new Error("Authentication required");
      if (item.isArchived) {
        return reactivateCatalogueItem(item.id, accessToken);
      }
      return archiveCatalogueItem(item.id, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "catalogue"],
      });
    },
  });

  const handleArchiveToggle = (item: CatalogueItem) => {
    const action = item.isArchived ? "reactivate" : "archive";
    if (
      window.confirm(
        `Are you sure you want to ${action} "${item.name}"?`,
      )
    ) {
      toggleArchiveMutation.mutate(item);
    }
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Food Catalogue"
        description="Standard food catalogue items, portions, unit costs, selling prices, and dietary tags for menus and quotations."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/tenant/${tenantSlug}/catalogue/import`}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
            >
              <svg className="h-3.5 w-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Import CSV</span>
            </Link>
            <Link
              href={`/tenant/${tenantSlug}/catalogue/new`}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              <span>New Food Item</span>
            </Link>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Total Items
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
              {stats?.totalItems ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Active in Menus
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#15803D]">
              {stats?.activeItems ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Archived
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#737373]">
              {stats?.archivedItems ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Active Categories
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
              {stats?.categoriesCount ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-[#E5E5E5] gap-2 overflow-x-auto text-xs font-medium">
        {CATEGORY_TABS.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`border-b-2 px-3 py-2.5 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[#171717] font-semibold text-[#171717]"
                  : "border-transparent text-[#737373] hover:border-[#E5E5E5] hover:text-[#171717]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name, description..."
            className="w-full rounded border border-[#E5E5E5] bg-white pl-8 pr-3 py-1.5 text-xs text-[#171717] placeholder-[#A3A3A3] focus:border-[#171717] focus:outline-none"
          />
          <svg
            className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#A3A3A3]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Dietary and Status Filters */}
        <div className="flex items-center gap-2">
          {/* Dietary Select */}
          <select
            value={selectedDietary}
            onChange={(e) => setSelectedDietary(e.target.value)}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
          >
            {DIETARY_FILTERS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Status Toggle */}
          <div className="flex rounded border border-[#E5E5E5] bg-[#FAFAFA] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("archived")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                statusFilter === "archived"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Archived
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#EF4444] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
          Failed to load catalogue items:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : (
        <CatalogueTable
          data={data?.data || []}
          tenantSlug={tenantSlug}
          onArchiveToggle={handleArchiveToggle}
        />
      )}
    </div>
  );
}
