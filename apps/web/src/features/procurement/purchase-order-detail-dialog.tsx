"use client";

import React from "react";
import type { PurchaseOrder } from "@catering/shared-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface PurchaseOrderDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
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

export function PurchaseOrderDetailDialog({
  isOpen,
  onClose,
  order,
  onEdit,
  onSubmitOrder,
  onReceiveItems,
  onCancelOrder,
}: PurchaseOrderDetailDialogProps) {
  const { formatCurrency, currencyCode } = useTenantCurrency();

  if (!isOpen || !order) return null;

  const totalQtyOrdered = (order.lines || []).reduce(
    (acc, l) => acc + (l.quantityOrdered || 0),
    0,
  );
  const totalQtyReceived = (order.lines || []).reduce(
    (acc, l) => acc + (l.quantityReceived || 0),
    0,
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl my-8 rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl print:border-none print:shadow-none print:m-0 print:p-4">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-mono tracking-tight text-[#171717]">
                {order.poNumber}
              </h2>
              <PoStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-xs text-[#737373]">
              Purchase Order created on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
            >
              Print / Export
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Vendor & Delivery Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-[#E5E5E5] py-4 text-xs">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Supplier Details
            </p>
            <p className="text-sm font-bold text-[#171717]">{order.supplier?.name}</p>
            {order.supplier?.code && (
              <p className="font-mono text-[#525252]">Code: {order.supplier.code}</p>
            )}
            {order.supplier?.contactName && (
              <p className="text-[#525252]">Attn: {order.supplier.contactName}</p>
            )}
            {order.supplier?.email && (
              <p className="text-[#525252]">Email: {order.supplier.email}</p>
            )}
            {order.supplier?.phone && (
              <p className="text-[#525252]">Phone: {order.supplier.phone}</p>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Fulfillment & Delivery
            </p>
            <p className="text-[#171717]">
              Order Date: <span className="font-semibold">{new Date(order.orderDate).toLocaleDateString()}</span>
            </p>
            <p className="text-[#171717]">
              Expected Delivery:{" "}
              <span className="font-semibold">
                {order.expectedDeliveryDate
                  ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                  : "Not specified"}
              </span>
            </p>
            {order.deliveryAddress && (
              <p className="text-[#525252]">Destination: {order.deliveryAddress}</p>
            )}
            <p className="text-[#737373]">Currency: {order.currency || currencyCode}</p>
          </div>
        </div>

        {/* Fulfillment Summary Bar */}
        <div className="flex items-center justify-between bg-[#FAFAFA] rounded-md p-3 my-4 border border-[#E5E5E5] text-xs">
          <div>
            <span className="font-medium text-[#737373]">Fulfillment Progress: </span>
            <span className="font-semibold text-[#171717]">
              {totalQtyReceived.toFixed(1)} / {totalQtyOrdered.toFixed(1)} units received
            </span>
          </div>
          <div className="w-36 bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{
                width: `${totalQtyOrdered > 0 ? Math.min(100, Math.round((totalQtyReceived / totalQtyOrdered) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-md border border-[#E5E5E5]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] font-medium text-[#737373]">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Ordered</th>
                <th className="py-2.5 px-3 text-right">Received</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0] text-[#262626]">
              {order.lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-2.5 px-3 font-mono text-[#737373]">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-[#171717]">{line.name}</div>
                    {line.inventoryItem && (
                      <div className="font-mono text-[11px] text-[#737373]">
                        SKU: {line.inventoryItem.sku}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#171717]">
                    {line.quantityOrdered.toFixed(1)} {line.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <span
                      className={
                        (line.quantityReceived || 0) >= (line.quantityOrdered || 0)
                          ? "text-emerald-700 font-semibold"
                          : (line.quantityReceived || 0) > 0
                            ? "text-amber-800 font-semibold"
                            : "text-[#737373]"
                      }
                    >
                      {(line.quantityReceived || 0).toFixed(1)} {line.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525252]">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#171717]">
                    {formatCurrency(line.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="text-xs text-[#737373] max-w-sm">
            {order.notes && (
              <div>
                <span className="font-semibold text-[#171717]">Order Notes: </span>
                {order.notes}
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-[#737373]">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-[#171717] tabular-nums">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            {Number(order.taxRate) > 0 && (
              <div className="flex justify-between text-[#737373]">
                <span>Tax ({Number(order.taxRate)}%):</span>
                <span className="font-mono text-[#171717] tabular-nums">
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>
            )}
            <div className="border-t border-[#E5E5E5] pt-1.5 flex justify-between font-bold text-sm text-[#171717]">
              <span>Total Amount:</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#E5E5E5] pt-4 print:hidden">
          {order.status === "draft" && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors"
              >
                Edit Order
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubmitOrder(order);
                }}
                className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                Send / Mark as Ordered
              </button>
            </>
          )}

          {(order.status === "ordered" || order.status === "partially_received") && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReceiveItems(order);
              }}
              className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Receive Items into Stock
            </button>
          )}

          {(order.status === "draft" || order.status === "ordered") && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelOrder(order);
              }}
              className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
