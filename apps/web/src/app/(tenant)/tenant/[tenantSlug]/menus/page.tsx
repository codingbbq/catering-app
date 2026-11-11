"use client";

import type { Menu, MenuSearchParams } from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MenuTable } from "@/features/menus/menu-table";
import {
  archiveMenu,
  duplicateMenu,
  listMenus,
  reactivateMenu,
} from "@/lib/menus-api";
import { useAuth } from "@/providers/auth-provider";

const STATUS_TABS = [
  { id: "active", label: "Active" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All Menus" },
];

const SERVICE_STYLE_FILTERS = [
  { id: "all", label: "All Styles" },
  { id: "buffet", label: "Buffet" },
  { id: "plated", label: "Plated" },
  { id: "canapes", label: "Canapés" },
  { id: "family_style", label: "Family Style" },
  { id: "stations", label: "Stations" },
  { id: "boxed_meals", label: "Boxed Meals" },
];

export default function MenusPage() {
  const router = useRouter();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"active" | "draft" | "archived" | "all">("active");
  const [serviceStyleFilter, setServiceStyleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const queryParams = useMemo<MenuSearchParams>(
    () => ({
      search: searchTerm.trim() || undefined,
      status: statusFilter,
      serviceStyle: serviceStyleFilter !== "all" ? serviceStyleFilter : undefined,
    }),
    [searchTerm, statusFilter, serviceStyleFilter],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant", tenantSlug, "menus", queryParams],
    queryFn: () => listMenus(accessToken!, queryParams),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (menu: Menu) => {
      if (!accessToken) throw new Error("Authentication required");
      return duplicateMenu(menu.id, {}, accessToken);
    },
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({
        queryKey: ["tenant", tenantSlug, "menus"],
      });
      router.push(`/tenant/${tenantSlug}/menus/${cloned.id}`);
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async (menu: Menu) => {
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
    },
  });

  const handleDuplicate = (menu: Menu) => {
    if (window.confirm(`Duplicate "${menu.name}" as a new draft?`)) {
      duplicateMutation.mutate(menu);
    }
  };

  const handleArchiveToggle = (menu: Menu) => {
    const action = menu.status === "archived" ? "reactivate" : "archive";
    if (window.confirm(`Are you sure you want to ${action} "${menu.name}"?`)) {
      toggleArchiveMutation.mutate(menu);
    }
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menus"
        description="Assemble, price, and maintain reusable course menus to speed up quotation workflows."
        backHref={`/tenant/${tenantSlug}`}
        backLabel="Dashboard"
        actions={
          <Link
            href={`/tenant/${tenantSlug}/menus/new`}
            className="btn btn-sm bg-[#171717] hover:bg-[#262626] text-white border-0 gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Build New Menu
          </Link>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-[#737373]">Total Menus</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
            {stats ? stats.totalMenus : "—"}
          </div>
        </Card>
        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-[#737373]">Active Menus</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#171717]">
            {stats ? stats.activeMenus : "—"}
          </div>
        </Card>
        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-[#737373]">Drafts</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#737373]">
            {stats ? stats.draftMenus : "—"}
          </div>
        </Card>
        <Card className="border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-[#737373]">Archived</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#737373]">
            {stats ? stats.archivedMenus : "—"}
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-[#E5E5E5] bg-white shadow-xs">
        <CardContent className="p-4 space-y-4">
          {/* Top row: Status tabs & Style filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Status tabs */}
            <div className="flex rounded-md border border-[#E5E5E5] bg-[#F5F5F4] p-0.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === tab.id
                      ? "bg-white text-[#171717] shadow-xs"
                      : "text-[#737373] hover:text-[#171717]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Service Style filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737373]">Style:</span>
              <select
                value={serviceStyleFilter}
                onChange={(e) => setServiceStyleFilter(e.target.value)}
                className="rounded-md border border-[#E5E5E5] px-2.5 py-1 text-xs text-[#171717] bg-white focus:border-[#171717] focus:outline-hidden"
              >
                {SERVICE_STYLE_FILTERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#A3A3A3]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search menus by title, description, or notes..."
              className="w-full rounded-md border border-[#E5E5E5] pl-9 pr-3 py-1.5 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Table Worklist */}
      {isLoading ? (
        <Card className="border border-[#E5E5E5] bg-white p-12 text-center text-xs text-[#737373]">
          Loading menus...
        </Card>
      ) : error ? (
        <Card className="border border-red-200 bg-red-50 p-6 text-xs text-red-800">
          Failed to load menus: {(error as Error).message}
        </Card>
      ) : (
        <MenuTable
          data={data?.data || []}
          tenantSlug={tenantSlug}
          onDuplicate={handleDuplicate}
          onArchiveToggle={handleArchiveToggle}
        />
      )}
    </div>
  );
}
