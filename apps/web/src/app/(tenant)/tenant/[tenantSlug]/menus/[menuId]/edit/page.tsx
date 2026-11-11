"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MenuBuilderForm } from "@/features/menus/menu-builder-form";
import { getMenu } from "@/lib/menus-api";
import { useAuth } from "@/providers/auth-provider";

export default function EditMenuPage() {
  const { tenantSlug, menuId } = useParams<{
    tenantSlug: string;
    menuId: string;
  }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const { data: menu, isLoading, error } = useQuery({
    queryKey: ["tenant", tenantSlug, "menus", menuId],
    queryFn: () => getMenu(menuId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!menuId,
  });

  if (isLoading) {
    return (
      <Card className="border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
        Loading menu for editing...
      </Card>
    );
  }

  if (error || !menu) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Menu Not Found"
          backHref={`/tenant/${tenantSlug}/menus`}
          backLabel="Menus"
        />
        <Card className="border border-red-200 bg-red-50 p-6 text-xs text-red-800">
          Failed to load menu: {error ? (error as Error).message : "Menu not found"}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${menu.name}`}
        description="Modify courses, items, pricing, or operational notes."
        backHref={`/tenant/${tenantSlug}/menus/${menu.id}`}
        backLabel="Menu Details"
      />

      <MenuBuilderForm
        tenantSlug={tenantSlug}
        initialMenu={menu}
        isEditing={true}
      />
    </div>
  );
}
