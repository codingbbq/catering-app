"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { MealOrderForm } from "@/features/meal-orders/meal-order-form";

export default function NewMealOrderPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-[#737373]">
        <Link
          href={`/tenant/${tenantSlug}/meal-orders`}
          className="hover:text-[#171717] hover:underline"
        >
          ← Daily Meal Orders
        </Link>
      </div>

      <PageHeader
        title="Create Daily Meal Order"
        description="Capture a scheduled or recurring meal-service order with portion quantities, slot timing, and delivery logistics."
      />

      <MealOrderForm tenantSlug={tenantSlug} />
    </div>
  );
}
