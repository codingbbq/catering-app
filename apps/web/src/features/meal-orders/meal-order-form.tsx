"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateDailyMealOrderLine,
  CreateDailyMealOrderRequest,
  DailyMealOrderDetail,
  DailyMealSlot,
  UpdateDailyMealOrderRequest,
} from "@catering/shared-types";
import { calculateDailyMealOrderTotals } from "@catering/shared-types";
import { createDailyMealOrder, updateDailyMealOrder } from "@/lib/daily-meal-orders-api";
import { listCustomers } from "@/lib/customers-api";
import type { CustomerListResponse } from "@catering/shared-types";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/features/tenancy/tenant-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MealOrderFormProps {
  order?: DailyMealOrderDetail;
  tenantSlug: string;
}

export function MealOrderForm({ order, tenantSlug }: MealOrderFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { currencyCode, currencySymbol, formatCurrency } = useTenant();

  const isEdit = !!order;

  const [customers, setCustomers] = useState<Array<{ id: string; name: string; address?: string | null }>>([]);
  const [customerId, setCustomerId] = useState(order?.customerId || "");
  const [serviceDate, setServiceDate] = useState(
    order?.serviceDate ? order.serviceDate.split("T")[0] : new Date().toISOString().split("T")[0],
  );
  const [serviceSlot, setServiceSlot] = useState<DailyMealSlot>(order?.serviceSlot || "lunch");
  const [deliveryAddress, setDeliveryAddress] = useState(order?.deliveryAddress || "");
  const [deliveryNotes, setDeliveryNotes] = useState(order?.deliveryNotes || "");
  const [dietaryNotes, setDietaryNotes] = useState(order?.dietaryNotes || "");
  const [taxRate, setTaxRate] = useState(order?.taxRate ?? 5);
  const [discountAmount, setDiscountAmount] = useState(order?.discountAmount ?? 0);
  const [notes, setNotes] = useState(order?.notes || "");
  const [internalNotes, setInternalNotes] = useState(order?.internalNotes || "");

  const [lines, setLines] = useState<CreateDailyMealOrderLine[]>(
    order?.lines?.map((l) => ({
      name: l.name,
      description: l.description || "",
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      dietaryNotes: l.dietaryNotes || "",
      packagingNotes: l.packagingNotes || "",
    })) || [
      {
        name: "Standard Executive Lunch Box",
        description: "Fresh warm meal tray with main, side, and dessert",
        quantity: 25,
        unitPrice: 180,
        dietaryNotes: "",
      },
    ],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      listCustomers(accessToken, { isActive: true })
        .then((res: CustomerListResponse) => {
          setCustomers(res.data || []);
          if (!customerId && res.data?.length > 0 && res.data[0]) {
            setCustomerId(res.data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [accessToken, customerId]);

  function handleCustomerChange(cId: string) {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected?.address && !deliveryAddress) {
      setDeliveryAddress(selected.address);
    }
  }

  function handleLineChange(index: number, field: keyof CreateDailyMealOrderLine, value: any) {
    const updated = [...lines];
    const target = updated[index];
    if (target) {
      updated[index] = { ...target, [field]: value };
      setLines(updated);
    }
  }

  function addLine() {
    setLines([
      ...lines,
      {
        name: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        dietaryNotes: "",
      },
    ]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  const totals = calculateDailyMealOrderTotals(lines, taxRate, discountAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    if (lines.length === 0) {
      setError("Please add at least one meal order line");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && order) {
        const updatePayload: UpdateDailyMealOrderRequest = {
          customerId,
          serviceDate: serviceDate || undefined,
          serviceSlot,
          deliveryAddress: deliveryAddress || null,
          deliveryNotes: deliveryNotes || null,
          dietaryNotes: dietaryNotes || null,
          taxRate: Number(taxRate),
          discountAmount: Number(discountAmount),
          notes: notes || null,
          internalNotes: internalNotes || null,
          lines: lines.map((l, idx) => ({
            name: l.name.trim(),
            description: l.description?.trim() || null,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            dietaryNotes: l.dietaryNotes?.trim() || null,
            packagingNotes: l.packagingNotes?.trim() || null,
            sortOrder: idx,
          })),
        };

        const res = await updateDailyMealOrder(order.id, updatePayload, accessToken);
        router.push(`/tenant/${tenantSlug}/meal-orders/${res.id}`);
      } else {
        const createPayload: CreateDailyMealOrderRequest = {
          customerId,
          serviceDate: serviceDate || "",
          serviceSlot,
          deliveryAddress: deliveryAddress || null,
          deliveryNotes: deliveryNotes || null,
          dietaryNotes: dietaryNotes || null,
          taxRate: Number(taxRate),
          discountAmount: Number(discountAmount),
          notes: notes || null,
          internalNotes: internalNotes || null,
          lines: lines.map((l, idx) => ({
            name: l.name.trim(),
            description: l.description?.trim() || null,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            dietaryNotes: l.dietaryNotes?.trim() || null,
            packagingNotes: l.packagingNotes?.trim() || null,
            sortOrder: idx,
          })),
        };

        const res = await createDailyMealOrder(createPayload, accessToken);
        router.push(`/tenant/${tenantSlug}/meal-orders/${res.id}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save daily meal order");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service & Delivery Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Customer *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-[#171717] mb-1">
                      Service Date *
                    </label>
                    <input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      required
                      className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#171717] mb-1">
                      Service Slot *
                    </label>
                    <select
                      value={serviceSlot}
                      onChange={(e) => setServiceSlot(e.target.value as DailyMealSlot)}
                      className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="morning_tea">Morning Tea</option>
                      <option value="lunch">Lunch</option>
                      <option value="afternoon_tea">Afternoon Tea</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Delivery Destination Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. 42 Tech Park, Cafeteria Wing B"
                  className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Delivery Instructions / Timing SLA
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Deliver before 12:15 PM sharp to 3rd floor"
                    className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Dietary Requirements / Flags
                  </label>
                  <input
                    type="text"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="e.g. 5 Jain Veg, 20 Non-Veg, nut-free"
                    className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Order Lines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meal Line Items & Portions</CardTitle>
              <button
                type="button"
                onClick={addLine}
                className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
              >
                + Add Line
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#E5E5E5] p-3.5 bg-[#FAFAFA] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#737373]">
                      Line #{idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-xs text-rose-600 hover:text-rose-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#171717] mb-1">
                        Item / Package Name *
                      </label>
                      <input
                        type="text"
                        value={line.name}
                        onChange={(e) => handleLineChange(idx, "name", e.target.value)}
                        placeholder="e.g. Bento Lunch Box"
                        required
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#171717] mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, "quantity", Number(e.target.value))
                        }
                        required
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#171717] mb-1">
                        Unit Price ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          handleLineChange(idx, "unitPrice", Number(e.target.value))
                        }
                        required
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#737373] mb-1">
                        Description / Components
                      </label>
                      <input
                        type="text"
                        value={line.description || ""}
                        onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                        placeholder="e.g. Rice, curry, roti, salad, sweet"
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#737373] mb-1">
                        Dietary Label / Notes
                      </label>
                      <input
                        type="text"
                        value={line.dietaryNotes || ""}
                        onChange={(e) =>
                          handleLineChange(idx, "dietaryNotes", e.target.value)
                        }
                        placeholder="e.g. Jain Veg, Gluten-Free"
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end text-xs font-mono text-[#171717]">
                    Line Total:{" "}
                    <span className="font-semibold ml-1">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs border-b border-[#E5E5E5] pb-4">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Total Portions:</span>
                  <span className="font-mono font-semibold text-[#171717]">
                    {totals.totalQuantity} meals
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Subtotal:</span>
                  <span className="font-mono text-[#171717]">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[#737373]">Tax Rate (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-20 rounded border border-[#E5E5E5] px-2 py-0.5 text-right font-mono text-xs focus:border-[#171717] focus:outline-none"
                  />
                </div>

                <div className="flex justify-between text-[#737373]">
                  <span>Tax Amount:</span>
                  <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[#737373]">Discount ({currencySymbol}):</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-24 rounded border border-[#E5E5E5] px-2 py-0.5 text-right font-mono text-xs focus:border-[#171717] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-semibold text-sm text-[#171717]">Total Amount:</span>
                <span className="font-mono text-lg font-bold text-[#171717]">
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">
                Tenant currency: <span className="font-medium text-[#737373]">{currencyCode}</span>
              </p>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Customer Facing Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes shown on meal dispatch slip or customer copy..."
                  className="w-full rounded border border-[#E5E5E5] px-2.5 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Internal Kitchen / Ops Notes
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Kitchen prep instructions, driver assignments..."
                  className="w-full rounded border border-[#E5E5E5] px-2.5 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded bg-[#171717] py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Create Meal Order"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full rounded border border-[#E5E5E5] py-2 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
