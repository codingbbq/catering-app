"use client";

import Link from "next/link";
import { formatServiceSlot, MealOrderStatusBadge } from "./meal-order-status-badge";
import type { DailyMealOrderListItem } from "@catering/shared-types";
import { useTenant } from "@/features/tenancy/tenant-provider";
import { EmptyState } from "@/components/ui/empty-state";

interface MealOrderTableProps {
  orders: DailyMealOrderListItem[];
  tenantSlug: string;
}

export function MealOrderTable({ orders, tenantSlug }: MealOrderTableProps) {
  const { formatCurrency } = useTenant();

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No meal orders found"
        description="Try adjusting your filter criteria or create a new daily meal order."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wider text-[#737373]">
          <tr>
            <th className="px-4 py-3">Order Number</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Service Date</th>
            <th className="px-4 py-3">Slot</th>
            <th className="px-4 py-3 text-right">Meals / Portions</th>
            <th className="px-4 py-3 text-right">Total Amount</th>
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {orders.map((order) => {
            const formattedDate = new Date(order.serviceDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <tr key={order.id} className="hover:bg-[#FAFAFA] transition-colors">
                <td className="px-4 py-3 font-mono font-medium text-[#171717]">
                  <Link
                    href={`/tenant/${tenantSlug}/meal-orders/${order.id}`}
                    className="hover:underline text-[#171717]"
                  >
                    {order.orderNumber}
                  </Link>
                  {order.planName && (
                    <div className="text-[11px] text-[#A3A3A3] truncate max-w-[140px]">
                      {order.planName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[#171717] font-medium">
                  {order.customerName}
                  {order.customerPhone && (
                    <div className="text-xs text-[#737373]">{order.customerPhone}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-[#737373]">{formattedDate}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded bg-[#F5F5F4] px-2 py-0.5 text-xs text-[#737373] font-medium border border-[#E5E5E5]">
                    {formatServiceSlot(order.serviceSlot)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#171717]">
                  {order.totalQuantity}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium text-[#171717]">
                  {formatCurrency(order.totalAmount, order.currency)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {order.invoices && order.invoices.length > 0 && order.invoices[0] ? (
                    <Link
                      href={`/tenant/${tenantSlug}/invoices/${order.invoices[0].id}`}
                      className="font-mono text-[#171717] hover:underline"
                    >
                      {order.invoices[0].invoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-[#A3A3A3]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MealOrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/tenant/${tenantSlug}/meal-orders/${order.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#171717] hover:underline"
                  >
                    View
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
