"use client";

import type { CreateCatalogueItemRequest } from "@catering/shared-types";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CatalogueItemForm } from "@/features/catalogue/catalogue-item-form";
import { createCatalogueItem } from "@/lib/catalogue-api";
import { useAuth } from "@/providers/auth-provider";

export default function NewCatalogueItemPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const createMutation = useMutation({
    mutationFn: (data: CreateCatalogueItemRequest) => {
      if (!accessToken) throw new Error("Authentication required");
      return createCatalogueItem(data, accessToken);
    },
    onSuccess: () => {
      router.push(`/tenant/${tenantSlug}/catalogue`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#737373]">
        <Link
          href={`/tenant/${tenantSlug}/catalogue`}
          className="hover:text-[#171717] transition-colors"
        >
          Food Catalogue
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#171717]">New Item</span>
      </div>

      <PageHeader
        title="Add Food Item"
        description="Create a standard item with pricing and dietary information for your catering catalogue."
      />

      <Card>
        <CardContent className="p-6">
          <CatalogueItemForm
            tenantSlug={tenantSlug}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data as CreateCatalogueItemRequest);
            }}
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
