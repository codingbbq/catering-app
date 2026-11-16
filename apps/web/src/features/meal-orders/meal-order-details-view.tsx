"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DailyMealOrderDetail, DailyMealOrderStatus } from "@catering/shared-types";
import {
  createInvoiceForDailyMealOrder,
  updateDailyMealOrderStatus,
} from "@/lib/daily-meal-orders-api";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/features/tenancy/tenant-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatServiceSlot, MealOrderStatusBadge } from "./meal-order-status-badge";

interface MealOrderDetailsViewProps {
  order: DailyMealOrderDetail;
  tenantSlug: string;
}

export function MealOrderDetailsView({
  order: initialOrder,
  tenantSlug,
}: MealOrderDetailsViewProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { formatCurrency } = useTenant();

  const [order, setOrder] = useState<DailyMealOrderDetail>(initialOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  async function handleStatusChange(newStatus: DailyMealOrderStatus) {
    if (!accessToken) return;
    setIsUpdating(true);
    setFeedback(null);

    try {
      const updated = await updateDailyMealOrderStatus(
        order.id,
        { status: newStatus },
        accessToken,
      );
      setOrder(updated);
      setFeedback({
        type: "success",
        message: `Order status moved to ${newStatus.replace("_", " ")}`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update order status",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCreateInvoice() {
    if (!accessToken) return;
    setIsGeneratingInvoice(true);
    setFeedback(null);

    try {
      const inv = await createInvoiceForDailyMealOrder(order.id, undefined, accessToken);
      setFeedback({
        type: "success",
        message: `Invoice ${inv.invoiceNumber} drafted successfully!`,
      });
      router.push(`/tenant/${tenantSlug}/invoices/${inv.id}`);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to generate invoice for meal order",
      });
      setIsGeneratingInvoice(false);
    }
  }

  const formattedDate = new Date(order.serviceDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono text-[#171717]">{order.orderNumber}</h1>
            <MealOrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Service for <span className="font-semibold text-[#171717]">{order.customerName}</span>{" "}
            • {formattedDate} ({formatServiceSlot(order.serviceSlot)})
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === "draft" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("confirmed")}
              className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              Confirm Order
            </button>
          )}
          {order.status === "confirmed" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("in_preparation")}
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Start Kitchen Prep
            </button>
          )}
          {order.status === "in_preparation" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("dispatched")}
              className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              Mark Dispatched
            </button>
          )}
          {order.status === "dispatched" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("delivered")}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Mark Delivered
            </button>
          )}

          {(!order.invoices || order.invoices.length === 0) && order.status !== "cancelled" && (
            <button
              type="button"
              disabled={isGeneratingInvoice}
              onClick={handleCreateInvoice}
              className="rounded border border-[#171717] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-50 transition-colors"
            >
              {isGeneratingInvoice ? "Drafting..." : "Generate Invoice"}
            </button>
          )}

          <Link
            href={`/tenant/${tenantSlug}/meal-orders/${order.id}/edit`}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
          >
            Edit
          </Link>

          {order.status !== "cancelled" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("cancelled")}
              className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-md p-3 text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Grid: 2 Cols Logistics & Details, 1 Col Finance & Invoicing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Logistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Logistics & Delivery Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#737373]">Customer:</span>
                  <p className="font-semibold text-sm text-[#171717] mt-0.5">
                    {order.customerName}
                  </p>
                  {order.customer?.email && (
                    <p className="text-[#737373] mt-0.5">{order.customer.email}</p>
                  )}
                  {order.customer?.phone && (
                    <p className="text-[#737373]">{order.customer.phone}</p>
                  )}
                </div>

                <div>
                  <span className="text-[#737373]">Service Slot:</span>
                  <p className="font-medium text-[#171717] mt-0.5">
                    {formatServiceSlot(order.serviceSlot)}
                  </p>
                  {order.plan && (
                    <p className="text-[#737373] mt-1">
                      Standing Plan:{" "}
                      <span className="font-medium text-[#171717]">
                        {order.plan.planNumber} — {order.plan.name}
                      </span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2 border-t border-[#F0F0F0] pt-3">
                  <span className="text-[#737373]">Delivery Destination:</span>
                  <p className="font-medium text-[#171717] mt-0.5">
                    {order.deliveryAddress || "Not specified (Default address)"}
                  </p>
                </div>

                {order.deliveryNotes && (
                  <div className="sm:col-span-2">
                    <span className="text-[#737373]">Delivery Instructions:</span>
                    <p className="text-[#171717] mt-0.5 bg-[#FAFAFA] p-2 rounded border border-[#E5E5E5]">
                      {order.deliveryNotes}
                    </p>
                  </div>
                )}

                {order.dietaryNotes && (
                  <div className="sm:col-span-2">
                    <span className="text-amber-800 font-medium">Dietary Requirements:</span>
                    <p className="text-amber-900 mt-0.5 bg-amber-50 p-2 rounded border border-amber-200">
                      {order.dietaryNotes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lines Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meal Line Items</CardTitle>
              <span className="text-xs font-mono font-medium text-[#737373]">
                Total: {order.totalQuantity} meals
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    <tr>
                      <th className="px-4 py-2.5">Item Name / Description</th>
                      <th className="px-4 py-2.5">Dietary</th>
                      <th className="px-4 py-2.5 text-right">Quantity</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {order.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#171717]">{line.name}</div>
                          {line.description && (
                            <div className="text-[#737373] mt-0.5">{line.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#737373]">
                          {line.dietaryNotes || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-[#171717]">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#737373]">
                          {formatCurrency(line.unitPrice, order.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                          {formatCurrency(line.totalAmount, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#737373] whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary & Downstream Invoice Linkage */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between text-[#737373]">
                <span>Total Portions:</span>
                <span className="font-mono font-semibold text-[#171717]">
                  {order.totalQuantity} meals
                </span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#171717]">
                  {formatCurrency(order.subtotal, order.currency)}
                </span>
              </div>
              {order.taxRate > 0 && (
                <div className="flex justify-between text-[#737373]">
                  <span>Tax ({order.taxRate}%):</span>
                  <span className="font-mono">
                    {formatCurrency(order.taxAmount, order.currency)}
                  </span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-[#737373]">
                  <span>Discount:</span>
                  <span className="font-mono text-rose-700">
                    -{formatCurrency(order.discountAmount, order.currency)}
                  </span>
                </div>
              )}
              <div className="border-t border-[#E5E5E5] pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-sm text-[#171717]">Total Amount:</span>
                <span className="font-mono text-lg font-bold text-[#171717]">
                  {formatCurrency(order.totalAmount, order.currency)}
                </span>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">
                Currency: <span className="font-mono font-medium text-[#737373]">{order.currency}</span>
              </p>
            </CardContent>
          </Card>

          {/* Linked Invoices Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Downstream Invoices</CardTitle>
              {(!order.invoices || order.invoices.length === 0) && (
                <button
                  type="button"
                  disabled={isGeneratingInvoice}
                  onClick={handleCreateInvoice}
                  className="text-xs font-medium text-[#171717] hover:underline"
                >
                  + Generate
                </button>
              )}
            </CardHeader>
            <CardContent>
              {order.invoices && order.invoices.length > 0 ? (
                <div className="space-y-2.5">
                  {order.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 rounded border border-[#E5E5E5] bg-[#FAFAFA] text-xs"
                    >
                      <div>
                        <Link
                          href={`/tenant/${tenantSlug}/invoices/${inv.id}`}
                          className="font-mono font-semibold text-[#171717] hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <div className="text-[11px] text-[#737373] uppercase mt-0.5">
                          Status: {inv.status}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-semibold text-[#171717]">
                          {formatCurrency(inv.totalAmount, order.currency)}
                        </div>
                        {inv.balanceDue > 0 ? (
                          <div className="text-[11px] text-amber-700">
                            Due: {formatCurrency(inv.balanceDue, order.currency)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-medium">Paid</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#737373] py-2">
                  No invoices generated yet for this meal order. Click{" "}
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    className="font-medium text-[#171717] underline"
                  >
                    Generate Invoice
                  </button>{" "}
                  to create a draft billing document.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
