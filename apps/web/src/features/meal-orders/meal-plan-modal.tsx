"use client";

import { useEffect, useState } from "react";
import type {
  DailyMealPlanDetail,
  DailyMealPlanListItem,
  DailyMealSlot,
  DayOfWeek,
} from "@catering/shared-types";
import { createDailyMealPlan, updateDailyMealPlan } from "@/lib/daily-meal-orders-api";
import { listCustomers } from "@/lib/customers-api";
import type { CustomerListResponse } from "@catering/shared-types";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/features/tenancy/tenant-provider";

interface MealPlanModalProps {
  plan?: DailyMealPlanListItem | DailyMealPlanDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALL_DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export function MealPlanModal({
  plan,
  isOpen,
  onClose,
  onSuccess,
}: MealPlanModalProps) {
  const { accessToken } = useAuth();
  const { currencyCode, currencySymbol } = useTenant();

  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [serviceSlot, setServiceSlot] = useState<DailyMealSlot>("lunch");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [defaultQuantity, setDefaultQuantity] = useState(25);
  const [defaultUnitPrice, setDefaultUnitPrice] = useState(150);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "cancelled">("active");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && isOpen) {
      listCustomers(accessToken, { isActive: true })
        .then((res: CustomerListResponse) => setCustomers(res.data || []))
        .catch(() => {});
    }
  }, [accessToken, isOpen]);

  useEffect(() => {
    if (plan) {
      setCustomerId(plan.customerId);
      setName(plan.name);
      setServiceSlot(plan.serviceSlot);
      setDaysOfWeek(plan.daysOfWeek);
      setStartDate(plan.startDate ? plan.startDate.split("T")[0] || "" : "");
      setEndDate(plan.endDate ? plan.endDate.split("T")[0] || "" : "");
      setDefaultQuantity(plan.defaultQuantity);
      setDefaultUnitPrice(plan.defaultUnitPrice);
      setDeliveryAddress(plan.deliveryAddress || "");
      setDeliveryNotes(plan.deliveryNotes || "");
      setDietaryNotes(plan.dietaryNotes || "");
      setNotes(plan.notes || "");
      setStatus(plan.status);
    } else {
      setCustomerId("");
      setName("");
      setServiceSlot("lunch");
      setDaysOfWeek(["monday", "tuesday", "wednesday", "thursday", "friday"]);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setDefaultQuantity(25);
      setDefaultUnitPrice(150);
      setDeliveryAddress("");
      setDeliveryNotes("");
      setDietaryNotes("");
      setNotes("");
      setStatus("active");
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  function toggleDay(day: DayOfWeek) {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      if (plan) {
        await updateDailyMealPlan(
          plan.id,
          {
            name,
            status,
            serviceSlot,
            daysOfWeek,
            startDate: startDate || undefined,
            endDate: endDate || null,
            defaultQuantity: Number(defaultQuantity),
            defaultUnitPrice: Number(defaultUnitPrice),
            deliveryAddress: deliveryAddress || null,
            deliveryNotes: deliveryNotes || null,
            dietaryNotes: dietaryNotes || null,
            notes: notes || null,
          },
          accessToken,
        );
      } else {
        await createDailyMealPlan(
          {
            customerId,
            name,
            serviceSlot,
            daysOfWeek,
            startDate: startDate || "",
            endDate: endDate || null,
            defaultQuantity: Number(defaultQuantity),
            defaultUnitPrice: Number(defaultUnitPrice),
            deliveryAddress: deliveryAddress || null,
            deliveryNotes: deliveryNotes || null,
            dietaryNotes: dietaryNotes || null,
            notes: notes || null,
          },
          accessToken,
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save meal plan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <h3 className="text-base font-semibold text-[#171717]">
            {plan ? "Edit Standing Meal Plan" : "Create Standing Meal Plan"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!plan && (
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp Weekday Lunch Program"
              required
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Service Slot *
              </label>
              <select
                value={serviceSlot}
                onChange={(e) => setServiceSlot(e.target.value as DailyMealSlot)}
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              >
                <option value="breakfast">Breakfast</option>
                <option value="morning_tea">Morning Tea</option>
                <option value="lunch">Lunch</option>
                <option value="afternoon_tea">Afternoon Tea</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            {plan && (
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          {/* Days of Week selector */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1.5">
              Service Days of Week *
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(({ key, label }) => {
                const isSelected = daysOfWeek.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors border ${
                      isSelected
                        ? "bg-[#171717] text-white border-[#171717]"
                        : "bg-white text-[#737373] border-[#E5E5E5] hover:bg-[#F5F5F4]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Default Quantity (Meals) *
              </label>
              <input
                type="number"
                min={1}
                value={defaultQuantity}
                onChange={(e) => setDefaultQuantity(Number(e.target.value))}
                required
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Default Unit Price ({currencyCode} {currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={defaultUnitPrice}
                onChange={(e) => setDefaultUnitPrice(Number(e.target.value))}
                required
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Delivery Address
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. 4th Floor Pantry, Tower A"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Delivery Instructions / Notes
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Deliver by 12:15 PM sharp via service elevator"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
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
              placeholder="e.g. 5 Jain Veg, 20 Standard, peanut-free kitchen"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isLoading ? "Saving..." : plan ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
