"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import type {
  CreatePurchaseOrderRequest,
  CreateSupplierRequest,
  PurchaseOrder,
  PurchaseOrderStatus,
  ReceivePurchaseOrderItemsRequest,
  Supplier,
  UpdatePurchaseOrderRequest,
  UpdateSupplierRequest,
} from "@catering/shared-types";
import {
  archiveSupplier,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  getProcurementSummary,
  listPurchaseOrders,
  listSuppliers,
  receivePurchaseOrderItems,
  restoreSupplier,
  submitPurchaseOrder,
  updatePurchaseOrder,
  updateSupplier,
} from "@/lib/procurement-api";
import { listInventoryItems } from "@/lib/inventory-api";
import { ProcurementKpiCards } from "@/features/procurement/procurement-kpi-cards";
import { SuppliersTable } from "@/features/procurement/suppliers-table";
import { SupplierDialog } from "@/features/procurement/supplier-dialog";
import { PurchaseOrdersTable } from "@/features/procurement/purchase-orders-table";
import { PurchaseOrderDialog } from "@/features/procurement/purchase-order-dialog";
import { PurchaseOrderDetailDialog } from "@/features/procurement/purchase-order-detail-dialog";
import { ReceiveItemsDialog } from "@/features/procurement/receive-items-dialog";

type TabMode = "orders" | "suppliers";

export default function ProcurementPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken } = useAuth();
  const { currencyCode } = useTenantCurrency();
  const queryClient = useQueryClient();

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<TabMode>("orders");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>("all");

  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [includeArchivedSuppliers, setIncludeArchivedSuppliers] = useState(false);

  // Dialog States
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<string | undefined>(undefined);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<PurchaseOrder | null>(null);

  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["procurement-summary", tenantSlug, currencyCode],
    queryFn: () => getProcurementSummary(accessToken!),
    enabled: Boolean(accessToken),
  });

  // 2. Fetch Suppliers
  const { data: suppliersResponse, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["suppliers-list", tenantSlug, suppliersSearch, includeArchivedSuppliers],
    queryFn: () =>
      listSuppliers(accessToken!, {
        search: suppliersSearch.trim() || undefined,
        includeArchived: includeArchivedSuppliers,
        limit: 100,
      }),
    enabled: Boolean(accessToken),
  });

  // 3. Fetch Purchase Orders
  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["purchase-orders-list", tenantSlug, ordersSearch, selectedStatus, selectedSupplierFilter],
    queryFn: () =>
      listPurchaseOrders(accessToken!, {
        search: ordersSearch.trim() || undefined,
        status: selectedStatus !== "all" ? (selectedStatus as PurchaseOrderStatus) : undefined,
        supplierId: selectedSupplierFilter !== "all" ? selectedSupplierFilter : undefined,
        limit: 100,
      }),
    enabled: Boolean(accessToken),
  });

  // 4. Fetch Inventory Items for line auto-fill
  const { data: inventoryResponse } = useQuery({
    queryKey: ["inventory-items-for-po", tenantSlug],
    queryFn: () => listInventoryItems(accessToken!, { limit: 100 }),
    enabled: Boolean(accessToken),
  });

  const suppliers = suppliersResponse?.items || [];
  const activeSuppliers = suppliers.filter((s) => !s.isArchived);
  const purchaseOrders = ordersResponse?.items || [];
  const inventoryItems = inventoryResponse?.items || [];

  // ==========================================
  // Supplier Actions
  // ==========================================

  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async (data: CreateSupplierRequest | UpdateSupplierRequest) => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, data as UpdateSupplierRequest, accessToken);
      } else {
        await createSupplier(data as CreateSupplierRequest, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveSupplier = async (supplier: Supplier) => {
    if (!accessToken) return;
    if (confirm(`Are you sure you want to archive "${supplier.name}"?`)) {
      await archiveSupplier(supplier.id, accessToken);
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
    }
  };

  const handleRestoreSupplier = async (supplier: Supplier) => {
    if (!accessToken) return;
    await restoreSupplier(supplier.id, accessToken);
    queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
    queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
  };

  // ==========================================
  // Purchase Order Actions
  // ==========================================

  const handleOpenCreatePo = (forSupplierId?: string) => {
    setEditingOrder(null);
    setPreselectedSupplierId(forSupplierId);
    setIsPoDialogOpen(true);
  };

  const handleEditPo = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsPoDialogOpen(true);
  };

  const handleSavePo = async (data: CreatePurchaseOrderRequest | UpdatePurchaseOrderRequest) => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      if (editingOrder) {
        await updatePurchaseOrder(editingOrder.id, data as UpdatePurchaseOrderRequest, accessToken);
      } else {
        await createPurchaseOrder(data as CreatePurchaseOrderRequest, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ["purchase-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOrder = async (order: PurchaseOrder) => {
    if (!accessToken) return;
    if (confirm(`Submit ${order.poNumber} to supplier "${order.supplier?.name}"? Status will update to Ordered.`)) {
      await submitPurchaseOrder(order.id, accessToken);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
    }
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    if (!accessToken) return;
    if (confirm(`Are you sure you want to cancel purchase order ${order.poNumber}?`)) {
      await cancelPurchaseOrder(order.id, accessToken);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
    }
  };

  const handleOpenReceive = (order: PurchaseOrder) => {
    setOrderToReceive(order);
    setIsReceiveDialogOpen(true);
  };

  const handleConfirmReceive = async (data: ReceivePurchaseOrderItemsRequest) => {
    if (!accessToken || !orderToReceive) return;
    setIsSubmitting(true);
    try {
      await receivePurchaseOrderItems(orderToReceive.id, data, accessToken);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPo = (order: PurchaseOrder) => {
    setSelectedOrderForDetail(order);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Procurement & Suppliers"
        description="Manage supplier directory, draft itemized purchase orders, and receive goods with automated inventory stock synchronization."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateSupplier}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
            >
              + Add Supplier
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreatePo()}
              className="rounded-md bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + Create Purchase Order
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <ProcurementKpiCards summary={summary} isLoading={isLoadingSummary} />

      {/* Tabs Bar */}
      <div className="border-b border-[#E5E5E5]">
        <nav className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === "orders"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === "suppliers"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Suppliers Directory ({suppliers.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-lg border border-[#E5E5E5]">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search PO # or supplier..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-hidden"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-44 rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="ordered">Ordered (Pending)</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received (Complete)</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Supplier Filter */}
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="w-full sm:w-48 rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-hidden"
              >
                <option value="all">All Suppliers</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-[#737373]">
              Showing <span className="font-semibold text-[#171717]">{purchaseOrders.length}</span> orders
            </div>
          </div>

          {/* Orders Table */}
          <PurchaseOrdersTable
            orders={purchaseOrders}
            isLoading={isLoadingOrders}
            onView={handleViewPo}
            onEdit={handleEditPo}
            onSubmitOrder={handleSubmitOrder}
            onReceiveItems={handleOpenReceive}
            onCancelOrder={handleCancelOrder}
          />
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          {/* Suppliers Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-lg border border-[#E5E5E5]">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search suppliers by name, code, contact..."
                  value={suppliersSearch}
                  onChange={(e) => setSuppliersSearch(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#525252] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArchivedSuppliers}
                  onChange={(e) => setIncludeArchivedSuppliers(e.target.checked)}
                  className="rounded-xs border-[#E5E5E5]"
                />
                Include archived suppliers
              </label>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateSupplier}
              className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + Add Supplier
            </button>
          </div>

          {/* Suppliers Table */}
          <SuppliersTable
            suppliers={suppliers}
            isLoading={isLoadingSuppliers}
            onEdit={handleEditSupplier}
            onArchive={handleArchiveSupplier}
            onRestore={handleRestoreSupplier}
            onCreatePoForSupplier={(s) => handleOpenCreatePo(s.id)}
          />
        </div>
      )}

      {/* Modal Dialogs */}
      <SupplierDialog
        isOpen={isSupplierDialogOpen}
        onClose={() => setIsSupplierDialogOpen(false)}
        onSubmit={handleSaveSupplier}
        editingSupplier={editingSupplier}
        isSubmitting={isSubmitting}
      />

      <PurchaseOrderDialog
        isOpen={isPoDialogOpen}
        onClose={() => setIsPoDialogOpen(false)}
        onSubmit={handleSavePo}
        editingOrder={editingOrder}
        suppliers={activeSuppliers}
        inventoryItems={inventoryItems}
        preselectedSupplierId={preselectedSupplierId}
        isSubmitting={isSubmitting}
      />

      <PurchaseOrderDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        order={selectedOrderForDetail}
        onEdit={handleEditPo}
        onSubmitOrder={handleSubmitOrder}
        onReceiveItems={handleOpenReceive}
        onCancelOrder={handleCancelOrder}
      />

      <ReceiveItemsDialog
        isOpen={isReceiveDialogOpen}
        onClose={() => setIsReceiveDialogOpen(false)}
        onSubmit={handleConfirmReceive}
        order={orderToReceive}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
