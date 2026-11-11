"use client";

import type {
  CatalogueItem,
  CreateMenuRequest,
  Menu,
  MenuItemInput,
  MenuStatus,
} from "@catering/shared-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCatalogueItems } from "@/lib/catalogue-api";
import { createMenu, updateMenu } from "@/lib/menus-api";
import { useAuth } from "@/providers/auth-provider";

const SERVICE_STYLES = [
  { id: "buffet", label: "Buffet" },
  { id: "plated", label: "Plated 3-Course / Multi-Course" },
  { id: "canapes", label: "Canapés & Cocktail" },
  { id: "family_style", label: "Family Style / Sharing Platters" },
  { id: "stations", label: "Food Stations / Live Counters" },
  { id: "boxed_meals", label: "Boxed Meals / Drop-off" },
  { id: "other", label: "Other / Custom" },
];

const DEFAULT_SECTIONS = ["Starters", "Mains", "Sides", "Desserts", "Beverages"];

interface MenuBuilderItem extends MenuItemInput {
  clientKey: string;
}

interface MenuBuilderFormProps {
  tenantSlug: string;
  initialMenu?: Menu;
  isEditing?: boolean;
}

export function MenuBuilderForm({
  tenantSlug,
  initialMenu,
  isEditing = false,
}: MenuBuilderFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();

  // Core metadata form state
  const [name, setName] = useState(initialMenu?.name || "");
  const [description, setDescription] = useState(initialMenu?.description || "");
  const [serviceStyle, setServiceStyle] = useState(
    initialMenu?.serviceStyle || "buffet",
  );
  const [status, setStatus] = useState<MenuStatus>(
    initialMenu?.status || "active",
  );
  const [minGuests, setMinGuests] = useState<string>(
    initialMenu?.minGuests ? String(initialMenu.minGuests) : "",
  );
  const [notes, setNotes] = useState(initialMenu?.notes || "");

  // Items state
  const [items, setItems] = useState<MenuBuilderItem[]>(() => {
    if (initialMenu?.items && initialMenu.items.length > 0) {
      return initialMenu.items.map((i, idx) => ({
        clientKey: `existing-${i.id || idx}-${Math.random()}`,
        id: i.id,
        catalogueItemId: i.catalogueItemId,
        section: i.section || "General",
        name: i.name,
        description: i.description,
        quantity: i.quantity ?? 1,
        unitPrice: i.unitPrice ?? 0,
        costPrice: i.costPrice ?? null,
        dietaryTags: i.dietaryTags || [],
        sortOrder: i.sortOrder ?? idx,
        servingNotes: i.servingNotes,
      }));
    }
    return [];
  });

  // Section manager state
  const [newSectionName, setNewSectionName] = useState("");
  const [activeCatalogueSection, setActiveCatalogueSection] = useState<string>("Starters");
  const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load active catalogue items for selector modal
  const { data: catalogueData, isLoading: isCatalogueLoading } = useQuery({
    queryKey: ["tenant", tenantSlug, "catalogue", "active-items"],
    queryFn: () => listCatalogueItems(accessToken!, { status: "active" }),
    enabled: !!accessToken && isCatalogueModalOpen,
  });

  // Unique sections in current menu items + default sections
  const existingSections = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.section) set.add(i.section);
    });
    if (set.size === 0) {
      DEFAULT_SECTIONS.forEach((s) => set.add(s));
    }
    return Array.from(set);
  }, [items]);

  // Group items by section
  const itemsBySection = useMemo(() => {
    const map = new Map<string, MenuBuilderItem[]>();
    for (const sec of existingSections) {
      map.set(sec, []);
    }
    for (const item of items) {
      const sec = item.section || "General";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    }
    return map;
  }, [existingSections, items]);

  // Pricing & margin calculations
  const { totalSellingPrice, totalCostPrice, marginPercent, allDietaryTags } =
    useMemo(() => {
      let selling = 0;
      let cost = 0;
      let hasCost = false;
      const tagSet = new Set<string>();

      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        selling += (Number(item.unitPrice) || 0) * qty;
        if (item.costPrice !== null && item.costPrice !== undefined) {
          cost += Number(item.costPrice) * qty;
          hasCost = true;
        }
        item.dietaryTags?.forEach((t) => tagSet.add(t));
      }

      const margin =
        selling > 0 && hasCost
          ? Math.round(((selling - cost) / selling) * 1000) / 10
          : null;

      return {
        totalSellingPrice: Math.round(selling * 100) / 100,
        totalCostPrice: hasCost ? Math.round(cost * 100) / 100 : null,
        marginPercent: margin,
        allDietaryTags: Array.from(tagSet),
      };
    }, [items]);

  // Filter catalogue items in modal
  const filteredCatalogueItems = useMemo(() => {
    if (!catalogueData?.data) return [];
    return catalogueData.data.filter((item) => {
      if (catalogueCategoryFilter !== "all" && item.category !== catalogueCategoryFilter) {
        return false;
      }
      if (catalogueSearch.trim()) {
        const query = catalogueSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.dietaryTags.some((t) => t.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [catalogueData, catalogueSearch, catalogueCategoryFilter]);

  // Handlers for adding items
  const handleAddCatalogueItem = (catItem: CatalogueItem, targetSection: string) => {
    const newItem: MenuBuilderItem = {
      clientKey: `cat-${catItem.id}-${Date.now()}-${Math.random()}`,
      catalogueItemId: catItem.id,
      section: targetSection,
      name: catItem.name,
      description: catItem.description,
      quantity: 1,
      unitPrice: catItem.sellingPrice,
      costPrice: catItem.costPrice,
      dietaryTags: catItem.dietaryTags,
      sortOrder: items.length,
      servingNotes: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleAddCustomItem = (targetSection: string) => {
    const newItem: MenuBuilderItem = {
      clientKey: `custom-${Date.now()}-${Math.random()}`,
      catalogueItemId: null,
      section: targetSection,
      name: "New Custom Item",
      description: null,
      quantity: 1,
      unitPrice: 0,
      costPrice: null,
      dietaryTags: [],
      sortOrder: items.length,
      servingNotes: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (
    clientKey: string,
    updates: Partial<MenuBuilderItem>,
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.clientKey === clientKey ? { ...i, ...updates } : i)),
    );
  };

  const handleRemoveItem = (clientKey: string) => {
    setItems((prev) => prev.filter((i) => i.clientKey !== clientKey));
  };

  const handleMoveItem = (clientKey: string, direction: "up" | "down") => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.clientKey === clientKey);
      if (index < 0) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const current = prev[index];
      const target = prev[targetIndex];
      if (!current || !target) return prev;

      const updated = [...prev];
      updated[index] = target;
      updated[targetIndex] = current;
      return updated;
    });
  };

  const handleAddSection = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    if (!existingSections.includes(trimmed)) {
      // Add custom item in new section so section is preserved
      handleAddCustomItem(trimmed);
    }
    setNewSectionName("");
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Authentication required");
      if (!name.trim()) throw new Error("Menu name is required");

      const preparedItems: MenuItemInput[] = items.map((item, idx) => ({
        id: item.id,
        catalogueItemId: item.catalogueItemId || null,
        section: item.section || "General",
        name: item.name.trim(),
        description: item.description?.trim() || null,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: item.costPrice !== null ? Number(item.costPrice) : null,
        dietaryTags: item.dietaryTags || [],
        sortOrder: idx,
        servingNotes: item.servingNotes?.trim() || null,
      }));

      const payload: CreateMenuRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        serviceStyle: serviceStyle || undefined,
        status,
        minGuests: minGuests ? parseInt(minGuests, 10) : undefined,
        notes: notes.trim() || undefined,
        items: preparedItems,
      };

      if (isEditing && initialMenu) {
        return updateMenu(initialMenu.id, payload, accessToken);
      }
      return createMenu(payload, accessToken);
    },
    onSuccess: (saved) => {
      router.push(`/tenant/${tenantSlug}/menus/${saved.id}`);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to save menu");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    saveMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717]">
            {isEditing ? `Edit: ${initialMenu?.name}` : "Build New Reusable Menu"}
          </h2>
          <p className="text-xs text-[#737373]">
            Configure menu sections, select catalogue items, and preview cost & margin breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tenant/${tenantSlug}/menus`}
            className="btn btn-sm border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending || !name.trim()}
            className="btn btn-sm bg-[#171717] hover:bg-[#262626] text-white border-0 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Menu"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Metadata and Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="border border-[#E5E5E5] bg-white shadow-xs">
            <CardHeader className="border-b border-[#E5E5E5] pb-3">
              <CardTitle className="text-sm font-semibold text-[#171717]">
                Menu Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-[#171717]">
                    Menu Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Deluxe Wedding Banquet, Corporate Lunch Buffet"
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#171717]">
                    Service Style
                  </label>
                  <select
                    value={serviceStyle}
                    onChange={(e) => setServiceStyle(e.target.value)}
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#171717] focus:outline-hidden"
                  >
                    {SERVICE_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#171717]">
                    Menu Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MenuStatus)}
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#171717] focus:outline-hidden"
                  >
                    <option value="active">Active (Available for Quotations)</option>
                    <option value="draft">Draft (Work in Progress)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#171717]">
                    Minimum Recommended Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minGuests}
                    onChange={(e) => setMinGuests(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#171717]">
                    Internal / Operational Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Requires 2 chafing dishes and 1 live chef station"
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-[#171717]">
                    Customer-Facing Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the menu concept, cuisine highlights, or dining experience..."
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section & Items Builder */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">
                  Menu Courses & Items ({items.length})
                </h3>
                <p className="text-xs text-[#737373]">
                  Organize dishes into courses. Add items from your food catalogue or enter bespoke items.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSection();
                    }
                  }}
                  placeholder="New section name..."
                  className="rounded-md border border-[#E5E5E5] px-2.5 py-1 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddSection}
                  disabled={!newSectionName.trim()}
                  className="btn btn-xs border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-40"
                >
                  + Add Course Section
                </button>
              </div>
            </div>

            {existingSections.map((sectionName) => {
              const sectionItems = itemsBySection.get(sectionName) || [];

              return (
                <Card
                  key={sectionName}
                  className="border border-[#E5E5E5] bg-white shadow-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-[#FAFAFA] px-4 py-2.5 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#171717]">
                        {sectionName}
                      </span>
                      <span className="rounded-full bg-[#E5E5E5] px-2 py-0.2 text-[10px] font-mono text-[#525252]">
                        {sectionItems.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCatalogueSection(sectionName);
                          setIsCatalogueModalOpen(true);
                        }}
                        className="btn btn-xs bg-[#171717] hover:bg-[#262626] text-white border-0 gap-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Catalogue Item
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomItem(sectionName)}
                        className="btn btn-xs border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA]"
                      >
                        + Custom
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    {sectionItems.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#A3A3A3] border border-dashed border-[#F0F0F0] rounded-md">
                        No dishes added to {sectionName} yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sectionItems.map((item, idx) => (
                          <div
                            key={item.clientKey}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#D4D4D4] transition-colors"
                          >
                            {/* Left: item details & name */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(item.clientKey, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="font-medium text-xs text-[#171717] border-b border-transparent hover:border-[#E5E5E5] focus:border-[#171717] focus:outline-hidden px-1 py-0.5 rounded-xs w-full max-w-sm"
                                  placeholder="Item name..."
                                />
                                {item.catalogueItemId && (
                                  <span className="shrink-0 rounded bg-stone-100 text-stone-700 px-1.5 py-0.5 text-[10px] font-medium border border-stone-200">
                                    Catalogue Linked
                                  </span>
                                )}
                              </div>

                              <input
                                type="text"
                                value={item.servingNotes || ""}
                                onChange={(e) =>
                                  handleUpdateItem(item.clientKey, {
                                    servingNotes: e.target.value,
                                  })
                                }
                                placeholder="Serving notes (e.g. Served in warm chafing dish, garnish with mint)..."
                                className="text-[11px] text-[#737373] border-b border-transparent hover:border-[#E5E5E5] focus:border-[#171717] focus:outline-hidden px-1 py-0.5 rounded-xs w-full"
                              />

                              {item.dietaryTags && item.dietaryTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {item.dietaryTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-neutral-100 text-neutral-600 px-1 py-0.2 text-[10px] font-mono"
                                    >
                                      {tag.replace(/_/g, " ")}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right: Quantity, Unit Price, Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-[#737373]">Qty:</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={item.quantity ?? 1}
                                  onChange={(e) =>
                                    handleUpdateItem(item.clientKey, {
                                      quantity: parseFloat(e.target.value) || 1,
                                    })
                                  }
                                  className="w-14 rounded border border-[#E5E5E5] px-1.5 py-1 text-xs text-right font-mono text-[#171717] focus:border-[#171717] focus:outline-hidden"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-[#737373]">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice ?? 0}
                                  onChange={(e) =>
                                    handleUpdateItem(item.clientKey, {
                                      unitPrice: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-18 rounded border border-[#E5E5E5] px-1.5 py-1 text-xs text-right font-mono font-medium text-[#171717] focus:border-[#171717] focus:outline-hidden"
                                />
                              </div>

                              {/* Course section selector */}
                              <select
                                value={item.section}
                                onChange={(e) =>
                                  handleUpdateItem(item.clientKey, {
                                    section: e.target.value,
                                  })
                                }
                                className="rounded border border-[#E5E5E5] px-1.5 py-1 text-[11px] text-[#737373] bg-white focus:outline-hidden"
                                title="Move to course"
                              >
                                {existingSections.map((sec) => (
                                  <option key={sec} value={sec}>
                                    {sec}
                                  </option>
                                ))}
                              </select>

                              {/* Reorder & Delete */}
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(item.clientKey, "up")}
                                  disabled={idx === 0}
                                  className="p-1 text-[#737373] hover:text-[#171717] disabled:opacity-20"
                                  title="Move Up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(item.clientKey, "down")}
                                  disabled={idx === sectionItems.length - 1}
                                  className="p-1 text-[#737373] hover:text-[#171717] disabled:opacity-20"
                                  title="Move Down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.clientKey)}
                                  className="p-1 text-red-600 hover:text-red-800 ml-1"
                                  title="Remove item"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 Col): Financial Breakdown & Margin Summary */}
        <div className="space-y-6 lg:sticky lg:top-20">
          <Card className="border border-[#E5E5E5] bg-white shadow-xs">
            <CardHeader className="border-b border-[#E5E5E5] pb-3 bg-[#FAFAFA]">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Indicative Menu Economics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#737373]">Selling Price (Sum of Items)</span>
                  <span className="font-mono text-sm font-bold text-[#171717]">
                    ${totalSellingPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#737373]">Estimated Cost Price</span>
                  <span className="font-mono text-xs text-[#737373]">
                    {totalCostPrice !== null
                      ? `$${totalCostPrice.toFixed(2)}`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0F0F0]">
                  <span className="text-[#737373]">Estimated Gross Margin</span>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      marginPercent !== null && marginPercent >= 60
                        ? "text-emerald-700"
                        : marginPercent !== null && marginPercent >= 40
                          ? "text-amber-700"
                          : "text-[#171717]"
                    }`}
                  >
                    {marginPercent !== null ? `${marginPercent}%` : "—"}
                  </span>
                </div>
              </div>

              {minGuests && parseInt(minGuests, 10) > 0 && (
                <div className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-1.5">
                  <div className="text-[11px] font-medium text-[#737373]">
                    Total Event Estimate ({minGuests} pax)
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#737373]">Revenue:</span>
                    <span className="font-mono font-semibold text-[#171717]">
                      ${(totalSellingPrice * parseInt(minGuests, 10)).toFixed(2)}
                    </span>
                  </div>
                  {totalCostPrice !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#737373]">Est. Cost:</span>
                      <span className="font-mono text-[#737373]">
                        ${(totalCostPrice * parseInt(minGuests, 10)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#F0F0F0] space-y-2">
                <div className="text-xs font-medium text-[#171717]">
                  Dietary Inclusivity ({allDietaryTags.length})
                </div>
                {allDietaryTags.length === 0 ? (
                  <p className="text-[11px] text-[#A3A3A3]">
                    No dietary tags configured on selected items.
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

          <Card className="border border-[#E5E5E5] bg-white shadow-xs p-4 space-y-2">
            <h4 className="text-xs font-semibold text-[#171717]">
              Quotation Ready
            </h4>
            <p className="text-[11px] text-[#737373] leading-relaxed">
              Once saved in <strong>Active</strong> status, this menu can be attached to enquiry proposals and commercial quotations with item prices locked in.
            </p>
          </Card>
        </div>
      </div>

      {/* Catalogue Item Selector Modal */}
      {isCatalogueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex flex-col h-[85vh] max-h-[700px] w-full max-w-2xl rounded-lg border border-[#E5E5E5] bg-white shadow-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 bg-[#FAFAFA]">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  Add Food Item to: <span className="underline">{activeCatalogueSection}</span>
                </h3>
                <p className="text-xs text-[#737373]">
                  Select active items from your master food catalogue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogueModalOpen(false)}
                className="text-[#737373] hover:text-[#171717] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-4 border-b border-[#E5E5E5] space-y-3 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  placeholder="Search catalogue items by name, description, or dietary tag..."
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All Categories" },
                  { id: "starter", label: "Starters" },
                  { id: "main", label: "Mains" },
                  { id: "dessert", label: "Desserts" },
                  { id: "beverage", label: "Beverages" },
                  { id: "salad", label: "Salads" },
                  { id: "side", label: "Sides" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatalogueCategoryFilter(c.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      catalogueCategoryFilter === c.id
                        ? "bg-[#171717] text-white"
                        : "border border-[#E5E5E5] bg-white text-[#737373] hover:bg-[#F5F5F4]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body / Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-[#F0F0F0]">
              {isCatalogueLoading ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Loading catalogue items...
                </div>
              ) : filteredCatalogueItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  No catalogue items found matching your filter.
                </div>
              ) : (
                filteredCatalogueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 pt-2.5 first:pt-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#171717] truncate">
                          {item.name}
                        </span>
                        <span className="rounded bg-[#FAFAFA] border border-[#E5E5E5] px-1.5 py-0.2 text-[10px] text-[#737373]">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#737373] line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      {item.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.dietaryTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-neutral-100 text-neutral-600 px-1 py-0.2 text-[9px] font-mono"
                            >
                              {tag.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-xs font-bold text-[#171717]">
                          ${Number(item.sellingPrice).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#A3A3A3]">
                          {item.pricingUnit.replace(/_/g, " ")}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleAddCatalogueItem(item, activeCatalogueSection);
                          setIsCatalogueModalOpen(false);
                        }}
                        className="btn btn-xs bg-[#171717] hover:bg-[#262626] text-white border-0 gap-1"
                      >
                        Add to {activeCatalogueSection}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#E5E5E5] px-5 py-3 bg-[#FAFAFA] flex justify-end">
              <button
                type="button"
                onClick={() => setIsCatalogueModalOpen(false)}
                className="btn btn-xs border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
