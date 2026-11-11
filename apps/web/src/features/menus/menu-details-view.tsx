"use client";

import type { Menu } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveMenu, duplicateMenu, reactivateMenu } from "@/lib/menus-api";
import { useAuth } from "@/providers/auth-provider";

interface MenuDetailsViewProps {
  menu: Menu;
  tenantSlug: string;
}

export function MenuDetailsView({ menu, tenantSlug }: MenuDetailsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  // Group items by section
  const sections = useMemo(() => {
    const map = new Map<string, typeof menu.items>();
    for (const item of menu.items) {
      const sec = item.section || "General";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    }
    return Array.from(map.entries());
  }, [menu.items]);

  // Gross margin calculation
  const marginPercent = useMemo(() => {
    if (
      menu.totalSellingPrice &&
      menu.totalCostPrice !== null &&
      menu.totalCostPrice !== undefined &&
      menu.totalSellingPrice > 0
    ) {
      return (
        Math.round(
          ((menu.totalSellingPrice - menu.totalCostPrice) /
            menu.totalSellingPrice) *
            1000,
        ) / 10
      );
    }
    return null;
  }, [menu.totalSellingPrice, menu.totalCostPrice]);

  // Dietary tags summary
  const allDietaryTags = useMemo(() => {
    const set = new Set<string>();
    menu.items.forEach((i) => i.dietaryTags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [menu.items]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Authentication required");
      return duplicateMenu(menu.id, {}, accessToken);
    },
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "menus"] });
      router.push(`/tenant/${tenantSlug}/menus/${cloned.id}`);
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Authentication required");
      if (menu.status === "archived") {
        return reactivateMenu(menu.id, accessToken);
      }
      return archiveMenu(menu.id, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "menus"],
      });
      router.refresh();
    },
  });

  const handleDuplicate = () => {
    if (window.confirm(`Create a duplicated copy of "${menu.name}"?`)) {
      duplicateMutation.mutate();
    }
  };

  const handleArchiveToggle = () => {
    const action = menu.status === "archived" ? "reactivate" : "archive";
    if (window.confirm(`Are you sure you want to ${action} this menu?`)) {
      toggleArchiveMutation.mutate();
    }
  };

  const statusVariant =
    menu.status === "active"
      ? "success"
      : menu.status === "draft"
        ? "neutral"
        : "warning";

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              {menu.name}
            </h1>
            <StatusBadge variant={statusVariant}>
              {menu.status.charAt(0).toUpperCase() + menu.status.slice(1)}
            </StatusBadge>
          </div>
          {menu.description && (
            <p className="text-xs text-[#737373] max-w-2xl leading-relaxed">
              {menu.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/tenant/${tenantSlug}/menus`}
            className="btn btn-sm border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA]"
          >
            ← Back
          </Link>
          <Link
            href={`/tenant/${tenantSlug}/menus/${menu.id}/edit`}
            className="btn btn-sm bg-[#171717] hover:bg-[#262626] text-white border-0 gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Menu
          </Link>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            className="btn btn-sm border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA]"
            title="Duplicate as new draft"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleArchiveToggle}
            disabled={toggleArchiveMutation.isPending}
            className={`btn btn-sm border border-[#E5E5E5] bg-white ${
              menu.status === "archived"
                ? "text-emerald-700 hover:bg-emerald-50"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            {menu.status === "archived" ? "Reactivate" : "Archive"}
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Indicative Price
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            ${Number(menu.totalSellingPrice || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-[#A3A3A3] mt-0.5">
            Per person / base sum
          </div>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Cost & Gross Margin
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            {marginPercent !== null ? `${marginPercent}%` : "—"}
          </div>
          <div className="text-[10px] text-[#A3A3A3] mt-0.5">
            {menu.totalCostPrice !== null && menu.totalCostPrice !== undefined
              ? `Est. Cost: $${Number(menu.totalCostPrice).toFixed(2)}`
              : "No cost data"}
          </div>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Total Dishes
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[#171717]">
            {menu.items.length}
          </div>
          <div className="text-[10px] text-[#A3A3A3] mt-0.5">
            Across {sections.length} courses
          </div>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
            Service Style & Capacity
          </div>
          <div className="mt-1 font-medium text-sm text-[#171717] capitalize">
            {menu.serviceStyle ? menu.serviceStyle.replace(/_/g, " ") : "Buffet"}
          </div>
          <div className="text-[10px] text-[#A3A3A3] mt-0.5">
            {menu.minGuests ? `Min ${menu.minGuests} guests` : "Flexible pax"}
          </div>
        </Card>
      </div>

      {/* Main Breakdown: Courses and Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Course Breakdown */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              Menu Courses & Structure
            </h2>
          </div>

          {sections.length === 0 ? (
            <Card className="border border-[#E5E5E5] bg-white p-8 text-center">
              <p className="text-xs text-[#737373]">
                No items have been added to this menu yet.
              </p>
              <Link
                href={`/tenant/${tenantSlug}/menus/${menu.id}/edit`}
                className="btn btn-xs bg-[#171717] text-white mt-3"
              >
                Add Items Now
              </Link>
            </Card>
          ) : (
            sections.map(([sectionName, items]) => (
              <Card
                key={sectionName}
                className="border border-[#E5E5E5] bg-white shadow-xs overflow-hidden"
              >
                <div className="bg-[#FAFAFA] px-4 py-2.5 border-b border-[#E5E5E5] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#171717]">
                    {sectionName}
                  </span>
                  <span className="text-[11px] font-mono text-[#737373]">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="divide-y divide-[#F0F0F0]">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-[#171717]">
                            {item.name}
                          </span>
                          {item.catalogueItemId && (
                            <Link
                              href={`/tenant/${tenantSlug}/catalogue/${item.catalogueItemId}`}
                              className="text-[10px] text-stone-500 hover:underline bg-stone-50 border border-stone-200 rounded px-1.5 py-0.2"
                              title="View Master Catalogue Item"
                            >
                              Catalogue
                            </Link>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-[#737373]">
                            {item.description}
                          </p>
                        )}

                        {item.servingNotes && (
                          <p className="text-[11px] italic text-[#737373]">
                            Note: {item.servingNotes}
                          </p>
                        )}

                        {item.dietaryTags && item.dietaryTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-neutral-100 text-neutral-600 px-1.5 py-0.2 text-[9px] font-mono"
                              >
                                {tag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-semibold text-[#171717]">
                          ${Number(item.unitPrice).toFixed(2)}
                        </div>
                        {item.quantity && item.quantity !== 1 && (
                          <div className="font-mono text-[10px] text-[#737373]">
                            Qty: {item.quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Right Column (1 Col): Meta Details & Audit */}
        <div className="space-y-5">
          <Card className="border border-[#E5E5E5] bg-white shadow-xs">
            <CardHeader className="border-b border-[#E5E5E5] pb-3 bg-[#FAFAFA]">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Operational Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              {menu.notes ? (
                <p className="text-[#262626] leading-relaxed whitespace-pre-wrap">
                  {menu.notes}
                </p>
              ) : (
                <p className="text-[#A3A3A3] italic">
                  No internal notes recorded for this menu.
                </p>
              )}

              <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                <div className="text-[11px] font-medium text-[#737373]">
                  Dietary Inclusivity
                </div>
                {allDietaryTags.length === 0 ? (
                  <p className="text-[11px] text-[#A3A3A3]">
                    None declared
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {allDietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-mono text-[#262626]"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#E5E5E5] bg-white shadow-xs p-4 space-y-2 text-xs text-[#737373]">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="font-mono text-[#262626]">
                {new Date(menu.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Modified</span>
              <span className="font-mono text-[#262626]">
                {new Date(menu.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Menu ID</span>
              <span className="font-mono text-[10px] text-[#737373]">
                {menu.id.slice(0, 8)}...
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
