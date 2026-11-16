"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import type {
  CreateInventoryItemRequest,
  InventoryCategory,
  InventoryItem,
  RecordStockMovementRequest,
  StockStatus,
  UpdateInventoryItemRequest,
} from "@catering/shared-types";
import {
  archiveInventoryItem,
  createInventoryItem,
  getInventorySummary,
  listInventoryItems,
  listStockMovements,
  recordStockMovement,
  restoreInventoryItem,
  updateInventoryItem,
} from "@/lib/inventory-api";
import { InventoryKpiCards } from "@/features/inventory/inventory-kpi-cards";
import { InventoryItemsTable } from "@/features/inventory/inventory-items-table";
import { InventoryItemDialog } from "@/features/inventory/inventory-item-dialog";
import { RecordMovementDialog } from "@/features/inventory/record-movement-dialog";
import { StockMovementsTable } from "@/features/inventory/stock-movements-table";
import { StockSummaryView } from "@/features/inventory/stock-summary-view";

type TabMode = "items" | "movements" | "summary";

export default function InventoryPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken } = useAuth();
  const { currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  // Tab & filters
  const [activeTab, setActiveTab] = useState<TabMode>("items");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Movement ledger filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  // Dialog states
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [preselectedItemForMovement, setPreselectedItemForMovement] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Inventory Summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["inventory-summary", tenantSlug, currencyCode],
    queryFn: () => getInventorySummary(accessToken!),
    enabled: Boolean(accessToken),
  });

  // Fetch Inventory Items
  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: [
      "inventory-items",
      tenantSlug,
      search,
      selectedCategory,
      selectedStatus,
      includeArchived,
    ],
    queryFn: () =>
      listInventoryItems(accessToken!, {
        search: search.trim() || undefined,
        category: selectedCategory !== "all" ? (selectedCategory as InventoryCategory) : undefined,
        status: selectedStatus !== "all" ? (selectedStatus as StockStatus) : undefined,
        includeArchived,
        limit: 100,
      }),
    enabled: Boolean(accessToken),
  });

  // Fetch Stock Movements
  const { data: movementsResponse, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["stock-movements", tenantSlug, movementTypeFilter],
    queryFn: () =>
      listStockMovements(accessToken!, {
        type: movementTypeFilter !== "all" ? movementTypeFilter : undefined,
        limit: 100,
      }),
    enabled: Boolean(accessToken),
  });

  const items = itemsResponse?.items || [];
  const movements = movementsResponse?.movements || [];

  // Handlers
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleRecordMovement = (item?: InventoryItem) => {
    setPreselectedItemForMovement(item?.id);
    setIsMovementDialogOpen(true);
  };

  const handleSaveItem = async (data: CreateInventoryItemRequest | UpdateInventoryItemRequest) => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, data as UpdateInventoryItemRequest, accessToken);
      } else {
        await createInventoryItem(data as CreateInventoryItemRequest, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveItem = async (item: InventoryItem) => {
    if (!accessToken) return;
    if (confirm(`Archive inventory item "${item.name}" (${item.sku})?`)) {
      await archiveInventoryItem(item.id, accessToken);
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
    }
  };

  const handleRestoreItem = async (item: InventoryItem) => {
    if (!accessToken) return;
    await restoreInventoryItem(item.id, accessToken);
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
  };

  const handlePostMovement = async (data: RecordStockMovementRequest) => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      await recordStockMovement(data, accessToken);
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory & Stock Management"
        description="Track raw ingredients, par levels, stock valuation, and movement audit history."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRecordMovement()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs font-semibold text-[#171717] shadow-xs hover:bg-[#F5F5F4]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Record Movement
            </button>
            <button
              type="button"
              onClick={handleOpenCreateItem}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#262626]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Inventory Item
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <InventoryKpiCards summary={summary || null} isLoading={isLoadingSummary} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E5E5E5]">
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "items"
              ? "border-[#171717] text-[#171717]"
              : "border-transparent text-[#737373] hover:text-[#171717]"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Stock Items Catalog ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "movements"
              ? "border-[#171717] text-[#171717]"
              : "border-transparent text-[#737373] hover:text-[#171717]"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Stock Movements Ledger
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "summary"
              ? "border-[#171717] text-[#171717]"
              : "border-transparent text-[#737373] hover:text-[#171717]"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Category Valuation &amp; Par Alerts
        </button>
      </div>

      {/* Tab 1: Stock Items Catalog */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-[#E5E5E5] bg-white p-3">
            <div className="flex flex-1 items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by SKU or item name..."
                  className="w-full rounded-md border border-[#E5E5E5] bg-white pl-9 pr-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
              </div>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="produce">Fresh Produce</option>
                <option value="meat_poultry">Meat &amp; Poultry</option>
                <option value="dairy">Dairy &amp; Eggs</option>
                <option value="dry_goods">Dry Goods &amp; Grains</option>
                <option value="beverages">Beverages</option>
                <option value="packaging">Packaging</option>
                <option value="cleaning">Cleaning</option>
                <option value="other">Other</option>
              </select>

              {/* Status Pills */}
              <div className="hidden lg:flex items-center rounded-md border border-[#E5E5E5] p-0.5">
                {[
                  { value: "all", label: "All" },
                  { value: "in_stock", label: "In Stock" },
                  { value: "low_stock", label: "Low Stock" },
                  { value: "out_of_stock", label: "Out of Stock" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedStatus(s.value)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedStatus === s.value
                        ? "bg-[#171717] text-white"
                        : "text-[#737373] hover:text-[#171717]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Archive Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[#737373] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="rounded border-[#E5E5E5] text-[#171717] focus:ring-0"
                />
                Include archived
              </label>
            </div>
          </div>

          {/* Items Table */}
          <InventoryItemsTable
            items={items}
            isLoading={isLoadingItems}
            onEdit={handleEditItem}
            onRecordMovement={handleRecordMovement}
            onArchive={handleArchiveItem}
            onRestore={handleRestoreItem}
            onOpenCreate={handleOpenCreateItem}
          />
        </div>
      )}

      {/* Tab 2: Movements Ledger */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#737373]">Filter Type:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              >
                <option value="all">All Movements</option>
                <option value="purchase_received">Purchase Received</option>
                <option value="kitchen_consumption">Kitchen Usage</option>
                <option value="waste_spoilage">Waste / Spoilage</option>
                <option value="adjustment_in">Adjustment In</option>
                <option value="adjustment_out">Adjustment Out</option>
                <option value="return_to_supplier">Return to Supplier</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleRecordMovement()}
              className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              Post Movement
            </button>
          </div>

          {/* Movements Table */}
          <StockMovementsTable
            movements={movements}
            isLoading={isLoadingMovements}
            onOpenRecord={() => handleRecordMovement()}
          />
        </div>
      )}

      {/* Tab 3: Summary & Category Valuation */}
      {activeTab === "summary" && (
        <StockSummaryView
          summary={summary || null}
          items={items}
          isLoading={isLoadingSummary}
          onRecordMovement={handleRecordMovement}
        />
      )}

      {/* Item Modal */}
      <InventoryItemDialog
        isOpen={isItemDialogOpen}
        onClose={() => setIsItemDialogOpen(false)}
        onSubmit={handleSaveItem}
        item={editingItem}
        isSubmitting={isSubmitting}
      />

      {/* Movement Modal */}
      <RecordMovementDialog
        isOpen={isMovementDialogOpen}
        onClose={() => setIsMovementDialogOpen(false)}
        onSubmit={handlePostMovement}
        items={items}
        preselectedItemId={preselectedItemForMovement}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
