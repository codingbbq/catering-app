"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDailyMealOrder } from "@/lib/daily-meal-orders-api";
import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { MealOrderForm } from "@/features/meal-orders/meal-order-form";

export default function EditMealOrderPage() {
  const { tenantSlug, orderId } = useParams<{ tenantSlug: string; orderId: string }>();
  const { accessToken } = useAuth();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["daily-meal-order", tenantSlug, orderId],
    queryFn: () => getDailyMealOrder(orderId, accessToken!),
    enabled: !!accessToken && !!orderId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-[#737373]">
        Loading meal order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          href={`/tenant/${tenantSlug}/meal-orders`}
          className="text-xs text-[#737373] hover:underline"
        >
          ← Back to Daily Meal Orders
        </Link>
        <div className="rounded-md bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
          Meal order not found or an error occurred loading order {orderId}.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-[#737373]">
        <Link
          href={`/tenant/${tenantSlug}/meal-orders`}
          className="hover:text-[#171717] hover:underline"
        >
          ← Daily Meal Orders
        </Link>
        <span>/</span>
        <Link
          href={`/tenant/${tenantSlug}/meal-orders/${order.id}`}
          className="font-mono text-[#737373] hover:underline"
        >
          {order.orderNumber}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      <PageHeader
        title={`Edit Meal Order — ${order.orderNumber}`}
        description="Update service date, meal line quantities, pricing, or delivery instructions."
      />

      <MealOrderForm order={order} tenantSlug={tenantSlug} />
    </div>
  );
}
