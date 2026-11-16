"use client";

import React from "react";
import type { Supplier } from "@catering/shared-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

interface SuppliersTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onArchive: (supplier: Supplier) => void;
  onRestore: (supplier: Supplier) => void;
  onCreatePoForSupplier: (supplier: Supplier) => void;
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  due_on_receipt: "Due on Receipt",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
};

export function SuppliersTable({
  suppliers,
  isLoading,
  onEdit,
  onArchive,
  onRestore,
  onCreatePoForSupplier,
}: SuppliersTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center">
        <span className="loading loading-spinner text-[#171717]" />
        <p className="mt-3 text-xs text-[#737373]">Loading suppliers catalog...</p>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <EmptyState
        title="No suppliers found"
        description="Add your first verified supplier to manage purchasing and automate inventory replenishment."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] font-medium text-[#737373]">
          <tr>
            <th className="py-3 px-4">Code</th>
            <th className="py-3 px-4">Supplier Name</th>
            <th className="py-3 px-4">Contact Info</th>
            <th className="py-3 px-4">Tax ID / GSTIN</th>
            <th className="py-3 px-4">Payment Terms</th>
            <th className="py-3 px-4 text-center">POs</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0] text-[#262626]">
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id}
              className={`hover:bg-[#FAFAFA] transition-colors ${supplier.isArchived ? "opacity-60 bg-[#FAFAFA]" : ""}`}
            >
              <td className="py-3 px-4 font-mono font-semibold text-[#171717]">
                {supplier.code}
              </td>
              <td className="py-3 px-4">
                <div className="font-semibold text-[#171717]">{supplier.name}</div>
                {supplier.contactName && (
                  <div className="text-[11px] text-[#737373]">{supplier.contactName}</div>
                )}
              </td>
              <td className="py-3 px-4">
                {supplier.email && (
                  <div className="text-[#171717]">{supplier.email}</div>
                )}
                {supplier.phone && (
                  <div className="text-[11px] text-[#737373]">{supplier.phone}</div>
                )}
                {!supplier.email && !supplier.phone && (
                  <span className="text-[#A3A3A3]">—</span>
                )}
              </td>
              <td className="py-3 px-4 font-mono text-[#525252]">
                {supplier.taxId || "—"}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center rounded-sm bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-medium text-[#262626]">
                  {PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms}
                </span>
              </td>
              <td className="py-3 px-4 text-center font-mono font-medium text-[#171717]">
                {supplier.purchaseOrdersCount ?? 0}
              </td>
              <td className="py-3 px-4">
                <StatusBadge variant={supplier.isArchived ? "neutral" : "success"}>
                  {supplier.isArchived ? "Archived" : "Active"}
                </StatusBadge>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {!supplier.isArchived && (
                    <button
                      type="button"
                      onClick={() => onCreatePoForSupplier(supplier)}
                      className="rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
                      title="New Purchase Order"
                    >
                      + Order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(supplier)}
                    className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#525252] hover:bg-[#F5F5F4] transition-colors"
                    title="Edit supplier"
                  >
                    Edit
                  </button>
                  {supplier.isArchived ? (
                    <button
                      type="button"
                      onClick={() => onRestore(supplier)}
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onArchive(supplier)}
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#737373] hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
