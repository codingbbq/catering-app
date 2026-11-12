"use client";

import type {
  CreateQuotationRequest,
  CreateQuotationRevisionRequest,
  QuotationLineItemInput,
  UpdateDraftRevisionRequest,
} from "@catering/shared-types";
import { calculateQuotationTotals } from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCostSheets } from "@/lib/costing-api";
import { listEnquiries } from "@/lib/enquiries-api";
import { getMenu, listMenus } from "@/lib/menus-api";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { useAuth } from "@/providers/auth-provider";

export interface QuotationFormProps {
  mode: "create_quotation" | "create_revision" | "edit_draft_revision";
  initialEnquiryId?: string | undefined;
  initialValues?: {
    title?: string | undefined;
    validUntil?: string | undefined;
    notes?: string | undefined;
    terms?: string | undefined;
    menuId?: string | null | undefined;
    costSheetId?: string | null | undefined;
    guestCount?: number | null | undefined;
    taxPercent?: number | undefined;
    discountAmount?: number | undefined;
    changeSummary?: string | undefined;
    items?: QuotationLineItemInput[] | undefined;
  } | undefined;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean | undefined;
  onCancel?: (() => void) | undefined;
}

const CATEGORY_OPTIONS = [
  "Food & Beverage",
  "Service & Staffing",
  "Equipment & Rentals",
  "Beverage & Bar",
  "Setup & Teardown",
  "Other",
];

const UNIT_OPTIONS = ["guest", "portion", "plate", "hour", "set", "unit", "day"];

export function QuotationForm({
  mode,
  initialEnquiryId,
  initialValues,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: QuotationFormProps) {
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency, currencySymbol } = useTenantCurrency();

  // Quotation-level fields
  const [enquiryId, setEnquiryId] = useState(initialEnquiryId || "");
  const [title, setTitle] = useState(initialValues?.title || "");
  const [validUntil, setValidUntil] = useState(
    initialValues?.validUntil ? initialValues.validUntil.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [terms, setTerms] = useState(
    initialValues?.terms ||
      "Payment terms: 50% deposit upon booking confirmation, 50% due 7 days prior to event. Final guest count required 5 business days prior.",
  );

  // Revision-level fields
  const [changeSummary, setChangeSummary] = useState(
    initialValues?.changeSummary ||
      (mode === "create_quotation"
        ? "Initial quotation prepared"
        : "Updated menu and guest pricing"),
  );
  const [menuId, setMenuId] = useState<string | null>(initialValues?.menuId || null);
  const [costSheetId, setCostSheetId] = useState<string | null>(
    initialValues?.costSheetId || null,
  );
  const [guestCount, setGuestCount] = useState<number | "">(
    initialValues?.guestCount ?? 50,
  );
  const [taxPercent, setTaxPercent] = useState<number>(
    initialValues?.taxPercent ?? 5,
  );
  const [discountAmount, setDiscountAmount] = useState<number>(
    initialValues?.discountAmount ?? 0,
  );

  // Line items
  const [items, setItems] = useState<QuotationLineItemInput[]>(
    initialValues?.items && initialValues.items.length > 0
      ? initialValues.items
      : [
          {
            name: "Full Service Catering Package",
            description: "Buffet dining with setup and tableware",
            category: "Food & Beverage",
            quantity: 50,
            unit: "guest",
            unitPrice: 45,
            unitCost: 22.5,
            sortOrder: 0,
          },
        ],
  );

  const [formError, setFormError] = useState<string | null>(null);

  // Fetch available enquiries for dropdown if creating new quotation
  const { data: enquiriesData } = useQuery({
    queryKey: ["enquiries", "active"],
    queryFn: () => listEnquiries(accessToken!, { status: "all" as any }),
    enabled: isAuthenticated && isTenant && !!accessToken && mode === "create_quotation",
  });

  // Fetch menus for quick import
  const { data: menusData } = useQuery({
    queryKey: ["menus", "active"],
    queryFn: () => listMenus(accessToken!, { status: "active" }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Fetch cost sheets for optional linkage
  const { data: costSheetsData } = useQuery({
    queryKey: ["cost-sheets", "active"],
    queryFn: () => listCostSheets(accessToken!, { status: "active" }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Calculate live totals
  const liveTotals = calculateQuotationTotals({
    items,
    discountAmount: Number(discountAmount) || 0,
    taxPercent: Number(taxPercent) || 0,
    guestCount: typeof guestCount === "number" ? guestCount : null,
  });

  // Handle importing items from selected Menu
  const handleImportMenu = async (selectedMenuId: string) => {
    if (!selectedMenuId || !accessToken) return;
    try {
      setMenuId(selectedMenuId);
      const menu = await getMenu(selectedMenuId, accessToken);
      if (menu && menu.items && menu.items.length > 0) {
        const count = typeof guestCount === "number" && guestCount > 0 ? guestCount : 50;
        const newItems: QuotationLineItemInput[] = menu.items.map((mItem, idx) => ({
          name: mItem.name,
          description: mItem.description || mItem.section,
          category: "Food & Beverage",
          quantity: count,
          unit: "guest",
          unitPrice: Number(mItem.unitPrice) || 0,
          unitCost: mItem.costPrice != null ? Number(mItem.costPrice) : null,
          sortOrder: idx,
        }));
        setItems(newItems);
      }
    } catch (e) {
      console.error("Failed to import menu items", e);
    }
  };

  const handleAddItem = () => {
    const defaultQty = typeof guestCount === "number" && guestCount > 0 ? guestCount : 1;
    setItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        category: "Food & Beverage",
        quantity: defaultQty,
        unit: "guest",
        unitPrice: 0,
        unitCost: null,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setFormError("Quotation must have at least one line item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof QuotationLineItemInput,
    value: any,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (target) {
        updated[index] = { ...target, [field]: value } as QuotationLineItemInput;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === "create_quotation" && !enquiryId) {
      setFormError("Please select an enquiry to link this quotation.");
      return;
    }

    if (mode === "create_quotation" && !title.trim()) {
      setFormError("Please enter a quotation title.");
      return;
    }

    if (items.length === 0) {
      setFormError("Please add at least one line item.");
      return;
    }

    for (const [idx, it] of items.entries()) {
      if (!it.name.trim()) {
        setFormError(`Line item #${idx + 1} is missing a name.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setFormError(`Line item #${idx + 1} quantity must be greater than 0.`);
        return;
      }
      if (Number(it.unitPrice) < 0) {
        setFormError(`Line item #${idx + 1} unit price cannot be negative.`);
        return;
      }
    }

    if (mode === "create_revision" && !changeSummary.trim()) {
      setFormError("A revision change summary note is required for history tracking.");
      return;
    }

    try {
      if (mode === "create_quotation") {
        const payload: CreateQuotationRequest = {
          enquiryId,
          title: title.trim(),
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          menuId: menuId || null,
          costSheetId: costSheetId || null,
          guestCount: typeof guestCount === "number" ? guestCount : null,
          taxPercent: Number(taxPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          changeSummary: changeSummary.trim(),
          items: items.map((it, idx) => ({
            name: it.name.trim(),
            description: it.description?.trim() || null,
            category: it.category || "Food & Beverage",
            quantity: Number(it.quantity),
            unit: it.unit || "guest",
            unitPrice: Number(it.unitPrice),
            unitCost: it.unitCost != null && it.unitCost !== ("" as any) ? Number(it.unitCost) : null,
            sortOrder: idx,
          })),
        };
        await onSubmit(payload);
      } else if (mode === "create_revision") {
        const payload: CreateQuotationRevisionRequest = {
          changeSummary: changeSummary.trim(),
          menuId: menuId || null,
          costSheetId: costSheetId || null,
          guestCount: typeof guestCount === "number" ? guestCount : null,
          taxPercent: Number(taxPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          items: items.map((it, idx) => ({
            name: it.name.trim(),
            description: it.description?.trim() || null,
            category: it.category || "Food & Beverage",
            quantity: Number(it.quantity),
            unit: it.unit || "guest",
            unitPrice: Number(it.unitPrice),
            unitCost: it.unitCost != null && it.unitCost !== ("" as any) ? Number(it.unitCost) : null,
            sortOrder: idx,
          })),
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateDraftRevisionRequest = {
          menuId: menuId || null,
          costSheetId: costSheetId || null,
          guestCount: typeof guestCount === "number" ? guestCount : null,
          taxPercent: Number(taxPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          changeSummary: changeSummary.trim(),
          items: items.map((it, idx) => ({
            name: it.name.trim(),
            description: it.description?.trim() || null,
            category: it.category || "Food & Beverage",
            quantity: Number(it.quantity),
            unit: it.unit || "guest",
            unitPrice: Number(it.unitPrice),
            unitCost: it.unitCost != null && it.unitCost !== ("" as any) ? Number(it.unitCost) : null,
            sortOrder: idx,
          })),
        };
        await onSubmit(payload);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save quotation.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-800">{formError}</p>
        </div>
      )}

      {/* Quotation Metadata Card (For New Quotation) */}
      {mode === "create_quotation" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Quotation & Enquiry Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Linked Enquiry <span className="text-red-500">*</span>
                </label>
                <select
                  value={enquiryId}
                  onChange={(e) => {
                    setEnquiryId(e.target.value);
                    const selected = enquiriesData?.data.find((enq) => enq.id === e.target.value);
                    if (selected && !title) {
                      setTitle(`Quotation for ${selected.title}`);
                    }
                    if (selected?.guestCount && (!guestCount || guestCount === 50)) {
                      setGuestCount(selected.guestCount);
                    }
                  }}
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                  required
                >
                  <option value="">Select an Enquiry...</option>
                  {enquiriesData?.data.map((enq) => (
                    <option key={enq.id} value={enq.id}>
                      {enq.title} — {enq.customerName} ({enq.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Quotation Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Acme Corp Annual Gala Catering"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Revision Change Note <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Initial proposal prepared"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision Metadata Card (For Revision Modes) */}
      {mode !== "create_quotation" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create_revision" ? "New Revision Details" : "Edit Draft Revision"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Change Summary Note <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Describe what changed in this revision (e.g. Reduced guest count to 80, added wine service)"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                required
              />
              <p className="mt-1 text-[11px] text-[#737373]">
                Preserved in revision history for customer accountability and team audit trail.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Linking & Parameters Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Commercial Parameters & Templates</CardTitle>
            <span className="text-xs text-[#737373]">
              Optionally seed items from an existing menu or cost sheet
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Import from Menu
              </label>
              <select
                value={menuId || ""}
                onChange={(e) => handleImportMenu(e.target.value)}
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
              >
                <option value="">Choose a Menu template...</option>
                {menusData?.data.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name} ({menu.items?.length ?? 0} items)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Link Cost Sheet
              </label>
              <select
                value={costSheetId || ""}
                onChange={(e) => setCostSheetId(e.target.value || null)}
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
              >
                <option value="">None / Custom costing</option>
                {costSheetsData?.data.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.name} ({formatCurrency(cs.totalCost)} total cost)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Expected Guests
              </label>
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) =>
                  setGuestCount(e.target.value ? parseInt(e.target.value, 10) : "")
                }
                placeholder="50"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono text-[#171717] focus:outline-hidden focus:border-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                placeholder="5.0"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono text-[#171717] focus:outline-hidden focus:border-[#171717]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Line Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Itemized Quotation Line Items</CardTitle>
              <p className="text-xs text-[#737373] mt-0.5">
                Food courses, beverage packages, staff hours, rentals, and service fees
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              + Add Item
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded border border-[#E5E5E5]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 font-medium w-40">Category</th>
                  <th className="px-3 py-2.5 font-medium min-w-[200px]">Item & Description</th>
                  <th className="px-3 py-2.5 font-medium w-24">Qty</th>
                  <th className="px-3 py-2.5 font-medium w-24">Unit</th>
                  <th className="px-3 py-2.5 font-medium w-28">Unit Price ({currencySymbol})</th>
                  <th className="px-3 py-2.5 font-medium w-28">Unit Cost ({currencySymbol})</th>
                  <th className="px-3 py-2.5 font-medium w-28 text-right">Line Total</th>
                  <th className="px-3 py-2.5 font-medium w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {items.map((it, idx) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  return (
                    <tr key={idx} className="hover:bg-[#FAFAFA]/60">
                      <td className="px-3 py-2">
                        <select
                          value={it.category || "Food & Beverage"}
                          onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2 space-y-1">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          placeholder="e.g. 3-Course Gourmet Dinner"
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-medium text-[#171717]"
                          required
                        />
                        <input
                          type="text"
                          value={it.description || ""}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Course breakdown or service notes..."
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-[11px] text-[#737373]"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={it.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-mono text-[#171717]"
                          required
                        />
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={it.unit || "guest"}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-mono text-[#171717]"
                          required
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitCost != null ? it.unitCost : ""}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "unitCost",
                              e.target.value !== "" ? parseFloat(e.target.value) : null,
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-mono text-[#737373]"
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-mono font-semibold text-[#171717]">
                        {formatCurrency(lineTotal)}
                      </td>

                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[#737373] hover:text-red-700 transition-colors p-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-medium text-[#171717] hover:underline"
            >
              + Add another line item
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary & Commercial Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Notes & Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Special Notes (Visible to Customer)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Dietary accommodations, venue access notes, or special setups..."
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Contract Terms & Payment Policy
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:outline-hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Calculation Box */}
        <Card className="bg-[#FAFAFA] border-[#E5E5E5]">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs text-[#737373]">
              <span>Items Subtotal:</span>
              <span className="font-mono text-[#171717]">{formatCurrency(liveTotals.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#737373]">
              <span>Discount Amount ({currencySymbol}):</span>
              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-right rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-xs font-mono text-[#171717]"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-[#737373]">
              <span>Tax ({taxPercent}%):</span>
              <span className="font-mono text-[#171717]">{formatCurrency(liveTotals.taxAmount)}</span>
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] flex justify-between text-sm font-semibold text-[#171717]">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-[#171717]">
                {formatCurrency(liveTotals.totalAmount)}
              </span>
            </div>

            {liveTotals.pricePerPerson != null && (
              <div className="flex justify-between text-xs text-[#737373] pt-1">
                <span>Effective Price / Guest:</span>
                <span className="font-mono font-medium text-[#171717]">
                  {formatCurrency(liveTotals.pricePerPerson)}
                </span>
              </div>
            )}

            {/* Internal Cost & Margin Visibility */}
            {liveTotals.estimatedCost != null && (
              <div className="mt-4 pt-3 border-t border-[#E5E5E5] bg-white p-3 rounded border border-neutral-200 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                  Internal Team Margin Preview
                </div>
                <div className="flex justify-between text-xs text-[#737373]">
                  <span>Total Estimated Cost:</span>
                  <span className="font-mono text-[#262626]">{formatCurrency(liveTotals.estimatedCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#737373]">
                  <span>Estimated Margin:</span>
                  <span
                    className={`font-mono font-semibold ${
                      (liveTotals.estimatedMarginPercent ?? 0) >= 30
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {liveTotals.estimatedMarginPercent != null
                      ? `${liveTotals.estimatedMarginPercent.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-[#171717] px-5 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create_quotation"
              ? "Create Quotation"
              : mode === "create_revision"
                ? "Save New Revision"
                : "Update Draft Revision"}
        </button>
      </div>
    </form>
  );
}
