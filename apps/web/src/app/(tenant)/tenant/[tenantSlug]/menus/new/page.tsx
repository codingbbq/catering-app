"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { MenuBuilderForm } from "@/features/menus/menu-builder-form";

export default function NewMenuPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Menu"
        description="Build a reusable menu structure from catalogue items with automatic price and margin estimates."
        backHref={`/tenant/${tenantSlug}/menus`}
        backLabel="Menus"
      />

      <MenuBuilderForm tenantSlug={tenantSlug} />
    </div>
  );
}
