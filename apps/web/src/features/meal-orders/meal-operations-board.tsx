"use client";

import Link from "next/link";
import { formatServiceSlot, MealOrderStatusBadge } from "./meal-order-status-badge";
import type { DailyMealOrderListItem, DailyMealOrderStatus, DailyMealSlot } from "@catering/shared-types";
import { useTenant } from "@/features/tenancy/tenant-provider";

interface MealOperationsBoardProps {
  orders: DailyMealOrderListItem[];
  tenantSlug: string;
  onStatusChange: (orderId: string, newStatus: DailyMealOrderStatus) => void;
  isUpdating?: boolean;
}

const SLOTS: DailyMealSlot[] = [
  "breakfast",
  "morning_tea",
  "lunch",
  "afternoon_tea",
  "dinner",
  "snack",
];

export function MealOperationsBoard({
  orders,
  tenantSlug,
  onStatusChange,
  isUpdating,
}: MealOperationsBoardProps) {
  const { formatCurrency } = useTenant();

  const grouped = SLOTS.map((slot) => {
    const slotOrders = orders.filter((o) => o.serviceSlot === slot);
    const totalQty = slotOrders.reduce((sum, o) => sum + o.totalQuantity, 0);
    const totalRev = slotOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      slot,
      orders: slotOrders,
      totalQuantity: totalQty,
      totalRevenue: totalRev,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {grouped.map(({ slot, orders: slotOrders, totalQuantity, totalRevenue }) => (
        <div
          key={slot}
          className="flex flex-col rounded-lg border border-[#E5E5E5] bg-white shadow-xs overflow-hidden"
        >
          {/* Slot Header */}
          <div className="flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
            <div>
              <h3 className="font-semibold text-sm text-[#171717]">{formatServiceSlot(slot)}</h3>
              <p className="text-xs text-[#737373]">
                {slotOrders.length} {slotOrders.length === 1 ? "order" : "orders"} •{" "}
                <span className="font-mono font-medium text-[#171717]">{totalQuantity}</span> meals
              </p>
            </div>
            {totalRevenue > 0 && (
              <span className="font-mono text-xs font-medium text-[#171717]">
                {formatCurrency(totalRevenue)}
              </span>
            )}
          </div>

          {/* Slot Orders List */}
          <div className="flex-1 p-3 space-y-3 min-h-[160px] bg-[#F5F5F4]/40">
            {slotOrders.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-[#A3A3A3]">
                No orders for this slot
              </div>
            ) : (
              slotOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-md border border-[#E5E5E5] bg-white p-3.5 shadow-2xs hover:border-[#D4D4D4] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/tenant/${tenantSlug}/meal-orders/${order.id}`}
                        className="font-medium text-sm text-[#171717] hover:underline"
                      >
                        {order.customerName}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#737373]">
                        <span className="font-mono">{order.orderNumber}</span>
                        {order.planName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px] text-[#A3A3A3]">
                              {order.planName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <MealOrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#F0F0F0] pt-2.5 text-xs">
                    <div>
                      <span className="text-[#737373]">Portions: </span>
                      <span className="font-mono font-semibold text-[#171717]">
                        {order.totalQuantity}
                      </span>
                    </div>
                    <div className="font-mono font-medium text-[#171717]">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </div>
                  </div>

                  {order.deliveryAddress && (
                    <div className="mt-2 text-xs text-[#737373] truncate">
                      <span className="text-[#A3A3A3]">Deliver: </span>
                      {order.deliveryAddress}
                    </div>
                  )}

                  {order.dietaryNotes && (
                    <div className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/70 truncate">
                      {order.dietaryNotes}
                    </div>
                  )}

                  {/* Quick Status Action Controls */}
                  <div className="mt-3 pt-2 border-t border-[#F0F0F0] flex items-center justify-between gap-1">
                    <span className="text-[11px] text-[#A3A3A3]">Move:</span>
                    <div className="flex items-center gap-1">
                      {order.status === "draft" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(order.id, "confirmed")}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-stone-100 text-[#171717] hover:bg-stone-200 border border-[#E5E5E5] transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {order.status === "confirmed" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(order.id, "in_preparation")}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                          Start Prep
                        </button>
                      )}
                      {order.status === "in_preparation" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(order.id, "dispatched")}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-stone-100 text-[#171717] hover:bg-stone-200 border border-[#E5E5E5] transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
                      {order.status === "dispatched" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(order.id, "delivered")}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          Delivered
                        </button>
                      )}
                      <Link
                        href={`/tenant/${tenantSlug}/meal-orders/${order.id}`}
                        className="text-xs text-[#737373] hover:text-[#171717] px-1.5 py-0.5"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
