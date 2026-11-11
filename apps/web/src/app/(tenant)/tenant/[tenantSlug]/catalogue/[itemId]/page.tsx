"use client";

import type { UpdateCatalogueItemRequest } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CatalogueImageGallery } from "@/features/catalogue/catalogue-image-gallery";
import { CatalogueItemForm } from "@/features/catalogue/catalogue-item-form";
import {
  archiveCatalogueItem,
  getCatalogueItem,
  reactivateCatalogueItem,
  updateCatalogueItem,
} from "@/lib/catalogue-api";
import { useAuth } from "@/providers/auth-provider";

export default function CatalogueItemDetailPage() {
  const { tenantSlug, itemId } = useParams<{
    tenantSlug: string;
    itemId: string;
  }>();
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const queryClient = useQueryClient();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["tenant", tenantSlug, "catalogue", itemId],
    queryFn: () => getCatalogueItem(itemId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!itemId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCatalogueItemRequest) => {
      if (!accessToken) throw new Error("Authentication required");
      return updateCatalogueItem(itemId, data, accessToken);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["tenant", tenantSlug, "catalogue", itemId],
        updated,
      );
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "catalogue"],
      });
      router.push(`/tenant/${tenantSlug}/catalogue`);
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !item) throw new Error("Authentication required");
      if (item.isArchived) {
        return reactivateCatalogueItem(itemId, accessToken);
      }
      return archiveCatalogueItem(itemId, accessToken);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["tenant", tenantSlug, "catalogue", itemId],
        updated,
      );
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "catalogue"],
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-lg border border-[#EF4444] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
        Failed to load item:{" "}
        {error instanceof Error ? error.message : "Item not found"}
      </div>
    );
  }

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
        <span className="font-semibold text-[#171717]">{item.name}</span>
      </div>

      <PageHeader
        title={item.name}
        description={`Standard catalogue item under "${item.category}". Created on ${new Date(
          item.createdAt,
        ).toLocaleDateString()}.`}
        badge={
          item.isArchived ? (
            <StatusBadge variant="neutral">Archived</StatusBadge>
          ) : (
            <StatusBadge variant="success">Active</StatusBadge>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={toggleArchiveMutation.isPending}
              onClick={() => toggleArchiveMutation.mutate()}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors disabled:opacity-50"
            >
              {item.isArchived ? "Reactivate Item" : "Archive Item"}
            </button>
            <Link
              href={`/tenant/${tenantSlug}/catalogue`}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
            >
              Back to List
            </Link>
          </div>
        }
      />

      {item.isArchived && (
        <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 text-xs text-[#737373]">
          <span className="font-semibold text-[#171717]">Archived Notice:</span>{" "}
          This item is archived. Existing menus and historical quotes referencing
          it will retain their pricing data, but this item will not appear when
          building new menus.
        </div>
      )}

      {/* Photo Gallery Card */}
      <Card>
        <CardContent className="p-6">
          <CatalogueImageGallery
            itemId={itemId}
            images={item.images || []}
            onImagesChange={() => {
              queryClient.invalidateQueries({
                queryKey: ["tenant", tenantSlug, "catalogue", itemId],
              });
              queryClient.invalidateQueries({
                queryKey: ["tenant", tenantSlug, "catalogue"],
              });
            }}
          />
        </CardContent>
      </Card>

      {/* Item Details Form */}
      <Card>
        <CardContent className="p-6">
          <CatalogueItemForm
            tenantSlug={tenantSlug}
            initialData={item}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync(data as UpdateCatalogueItemRequest);
            }}
            isSubmitting={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
