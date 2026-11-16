"use client";

import React from "react";
import type { PurchaseOrder } from "@catering/shared-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface PurchaseOrdersTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  onView: (order: PurchaseOrder) => void;
  onEdit: (order: PurchaseOrder) => void;
  onSubmitOrder: (order: PurchaseOrder) => void;
  onReceiveItems: (order: PurchaseOrder) => void;
  onCancelOrder: (order: PurchaseOrder) => void;
}

function PoStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <StatusBadge variant="neutral">Draft</StatusBadge>;
    case "ordered":
      return <StatusBadge variant="info">Ordered</StatusBadge>;
    case "partially_received":
      return <StatusBadge variant="warning">Partially Received</StatusBadge>;
    case "received":
      return <StatusBadge variant="success">Received</StatusBadge>;
    case "cancelled":
      return <StatusBadge variant="error">Cancelled</StatusBadge>;
    default:
      return <StatusBadge variant="neutral">{status}</StatusBadge>;
  }
}

export function PurchaseOrdersTable({
  orders,
  isLoading,
  onView,
  onEdit,
  onSubmitOrder,
  onReceiveItems,
  onCancelOrder,
}: PurchaseOrdersTableProps) {
  const { formatCurrency } = useTenantCurrency();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-12 text-center">
        <span className="loading loading-spinner text-[#171717]" />
        <p className="mt-3 text-xs text-[#737373]">Loading purchase orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No purchase orders found"
        description="Create your first purchase order to replenish kitchen inventory from verified suppliers."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] font-medium text-[#737373]">
          <tr>
            <th className="py-3 px-4">PO Number</th>
            <th className="py-3 px-4">Supplier</th>
            <th className="py-3 px-4">Dates</th>
            <th className="py-3 px-4">Items / Volume</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Total Amount</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0] text-[#262626]">
          {orders.map((order) => {
            const lineCount = order.lines?.length ?? 0;
            const totalQtyOrdered = (order.lines || []).reduce(
              (acc, l) => acc + (l.quantityOrdered || 0),
              0,
            );
            const totalQtyReceived = (order.lines || []).reduce(
              (acc, l) => acc + (l.quantityReceived || 0),
              0,
            );

            return (
              <tr
                key={order.id}
                className="hover:bg-[#FAFAFA] transition-colors"
              >
                {/* PO Number */}
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => onView(order)}
                    className="font-mono font-semibold text-[#171717] hover:underline"
                  >
                    {order.poNumber}
                  </button>
                  <div className="text-[11px] text-[#737373]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>

                {/* Supplier */}
                <td className="py-3 px-4">
                  <div className="font-semibold text-[#171717]">
                    {order.supplier?.name || "—"}
                  </div>
                  {order.supplier?.code && (
                    <div className="font-mono text-[11px] text-[#737373]">
                      {order.supplier.code}
                    </div>
                  )}
                </td>

                {/* Dates */}
                <td className="py-3 px-4">
                  <div className="text-[#171717]">
                    Ordered: {new Date(order.orderDate).toLocaleDateString()}
                  </div>
                  {order.expectedDeliveryDate ? (
                    <div className="text-[11px] text-[#737373]">
                      Expected: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#A3A3A3]">No expected date</div>
                  )}
                </td>

                {/* Line Items & Volume */}
                <td className="py-3 px-4">
                  <div className="font-medium text-[#171717]">
                    {lineCount} {lineCount === 1 ? "line item" : "line items"}
                  </div>
                  <div className="text-[11px] text-[#737373] tabular-nums">
                    {order.status === "received" ? (
                      <span className="text-emerald-700">All {totalQtyOrdered.toFixed(1)} received</span>
                    ) : order.status === "partially_received" ? (
                      <span className="text-amber-800">
                        {totalQtyReceived.toFixed(1)} / {totalQtyOrdered.toFixed(1)} received
                      </span>
                    ) : (
                      <span>{totalQtyOrdered.toFixed(1)} units total</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <PoStatusBadge status={order.status} />
                </td>

                {/* Total Amount (Currency Formatted) */}
                <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onView(order)}
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#525252] hover:bg-[#F5F5F4] transition-colors"
                    >
                      View
                    </button>

                    {order.status === "draft" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onSubmitOrder(order)}
                          className="rounded-md bg-[#171717] px-2 py-1 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
                        >
                          Send / Order
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(order)}
                          className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#737373] hover:bg-[#F5F5F4] transition-colors"
                        >
                          Edit
                        </button>
                      </>
                    )}

                    {(order.status === "ordered" || order.status === "partially_received") && (
                      <button
                        type="button"
                        onClick={() => onReceiveItems(order)}
                        className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
                      >
                        Receive
                      </button>
                    )}

                    {(order.status === "draft" || order.status === "ordered") && (
                      <button
                        type="button"
                        onClick={() => onCancelOrder(order)}
                        className="rounded-md border border-[#E5E5E5] bg-white px-1.5 py-1 text-xs text-[#A3A3A3] hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Cancel Order"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
