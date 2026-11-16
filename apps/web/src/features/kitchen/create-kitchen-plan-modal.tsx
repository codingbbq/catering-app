"use client";

import { useEffect, useState } from "react";
import type {
  CreateKitchenPlanRequest,
  CreateKitchenTaskItem,
  KitchenPlanSource,
  KitchenStation,
} from "@catering/shared-types";
import { createKitchenPlan } from "@/lib/kitchen-api";
import { listBookings } from "@/lib/bookings-api";
import { listDailyMealOrders } from "@/lib/daily-meal-orders-api";

interface CreateKitchenPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}

const STATIONS: { value: KitchenStation; label: string }[] = [
  { value: "prep", label: "Prep / Mise-en-place" },
  { value: "hot_kitchen", label: "Hot Kitchen" },
  { value: "cold_kitchen", label: "Cold Kitchen / Salad" },
  { value: "bakery_pastry", label: "Bakery & Pastry" },
  { value: "assembly_packing", label: "Assembly & Packing" },
  { value: "beverages", label: "Beverages / Bar" },
  { value: "other", label: "General" },
];

export function CreateKitchenPlanModal({
  isOpen,
  onClose,
  token,
  onSuccess,
}: CreateKitchenPlanModalProps) {
  const [source, setSource] = useState<KitchenPlanSource>("manual");
  const [title, setTitle] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [serviceSlot, setServiceSlot] = useState("lunch");
  const [estimatedServings, setEstimatedServings] = useState(50);
  const [bookingId, setBookingId] = useState("");
  const [dailyMealOrderId, setDailyMealOrderId] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [notes, setNotes] = useState("");

  // Confirmed bookings and meal orders for linking
  const [bookings, setBookings] = useState<any[]>([]);
  const [mealOrders, setMealOrders] = useState<any[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Initial tasks
  const [tasks, setTasks] = useState<CreateKitchenTaskItem[]>([
    {
      title: "Mise-en-place & ingredient prep",
      station: "prep",
      targetQuantity: 50,
      unit: "portions",
      dueTime: "10:00",
      sortOrder: 1,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingSources(true);
    Promise.all([
      listBookings(token, { limit: 50 })
        .then((res) => setBookings(res.items || []))
        .catch(() => {}),
      listDailyMealOrders(token, { limit: 50 })
        .then((res) => setMealOrders(res.items || []))
        .catch(() => {}),
    ]).finally(() => setLoadingSources(false));
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleBookingSelect = (id: string) => {
    setBookingId(id);
    const b = bookings.find((item) => item.id === id);
    if (b) {
      setTitle(`Production for ${b.title}`);
      if (b.eventDate) {
        setPlanDate(b.eventDate.split("T")[0]);
      }
      if (b.guestCount) {
        setEstimatedServings(b.guestCount);
      }
      if (b.venueName || b.venueAddress) {
        setVenueNotes(`${b.venueName || ""} ${b.venueAddress || ""}`.trim());
      }
      if (b.specialInstructions) {
        setDietaryNotes(b.specialInstructions);
      }
    }
  };

  const handleMealOrderSelect = (id: string) => {
    setDailyMealOrderId(id);
    const order = mealOrders.find((item) => item.id === id);
    if (order) {
      setTitle(`Daily Meal Production ${order.orderNumber}`);
      if (order.serviceDate) {
        setPlanDate(order.serviceDate.split("T")[0]);
      }
      if (order.serviceSlot) {
        setServiceSlot(order.serviceSlot);
      }
      if (order.totalQuantity) {
        setEstimatedServings(Number(order.totalQuantity));
      }
      if (order.deliveryAddress) {
        setVenueNotes(order.deliveryAddress);
      }
      if (order.dietaryNotes) {
        setDietaryNotes(order.dietaryNotes);
      }
    }
  };

  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        title: "",
        station: "hot_kitchen",
        targetQuantity: estimatedServings,
        unit: "portions",
        dueTime: "",
        sortOrder: tasks.length + 1,
      },
    ]);
  };

  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleTaskChange = (idx: number, field: keyof CreateKitchenTaskItem, val: any) => {
    const updated = [...tasks];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], [field]: val };
      setTasks(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Plan title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateKitchenPlanRequest = {
        title,
        planDate,
        serviceSlot,
        estimatedServings: Number(estimatedServings) || 1,
        source,
        bookingId: source === "booking" && bookingId ? bookingId : null,
        dailyMealOrderId: source === "daily_meal_order" && dailyMealOrderId ? dailyMealOrderId : null,
        venueNotes: venueNotes || null,
        dietaryNotes: dietaryNotes || null,
        notes: notes || null,
        tasks: tasks.filter((t) => t.title.trim().length > 0),
      };

      await createKitchenPlan(payload, token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create kitchen production plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5]">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#171717]">
              New Kitchen Production Plan
            </h2>
            <p className="text-xs text-[#737373]">
              Schedule kitchen preparation for commercial events or meal orders
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] text-lg font-mono"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Source Selector */}
          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Production Plan Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSource("manual")}
                className={`py-2 px-3 text-xs font-medium rounded border text-center transition-colors ${
                  source === "manual"
                    ? "bg-[#171717] text-white border-[#171717]"
                    : "bg-white text-[#262626] border-[#E5E5E5] hover:bg-[#F5F5F4]"
                }`}
              >
                Standalone / Manual
              </button>
              <button
                type="button"
                onClick={() => setSource("booking")}
                className={`py-2 px-3 text-xs font-medium rounded border text-center transition-colors ${
                  source === "booking"
                    ? "bg-[#171717] text-white border-[#171717]"
                    : "bg-white text-[#262626] border-[#E5E5E5] hover:bg-[#F5F5F4]"
                }`}
              >
                From Booking
              </button>
              <button
                type="button"
                onClick={() => setSource("daily_meal_order")}
                className={`py-2 px-3 text-xs font-medium rounded border text-center transition-colors ${
                  source === "daily_meal_order"
                    ? "bg-[#171717] text-white border-[#171717]"
                    : "bg-white text-[#262626] border-[#E5E5E5] hover:bg-[#F5F5F4]"
                }`}
              >
                From Meal Order
              </button>
            </div>
          </div>

          {/* Conditional Dropdown for Source */}
          {source === "booking" && (
            <div className="bg-[#FAFAFA] p-3 rounded border border-[#E5E5E5]">
              <label className="block text-xs font-medium text-[#262626]">
                Select Confirmed Booking *
              </label>
              {loadingSources ? (
                <div className="h-8 bg-white border border-[#E5E5E5] rounded animate-pulse mt-1" />
              ) : (
                <select
                  value={bookingId}
                  onChange={(e) => handleBookingSelect(e.target.value)}
                  className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                  required
                >
                  <option value="">-- Choose a booking --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNumber} — {b.title} ({b.customerName || b.customer?.name || "Client"}) [
                      {b.eventDate ? b.eventDate.split("T")[0] : ""}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {source === "daily_meal_order" && (
            <div className="bg-[#FAFAFA] p-3 rounded border border-[#E5E5E5]">
              <label className="block text-xs font-medium text-[#262626]">
                Select Daily Meal Order *
              </label>
              {loadingSources ? (
                <div className="h-8 bg-white border border-[#E5E5E5] rounded animate-pulse mt-1" />
              ) : (
                <select
                  value={dailyMealOrderId}
                  onChange={(e) => handleMealOrderSelect(e.target.value)}
                  className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                  required
                >
                  <option value="">-- Choose a meal order --</option>
                  {mealOrders.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.orderNumber} — {m.customerName || m.customer?.name || "Customer"} ({m.serviceSlot}) [
                      {m.serviceDate ? m.serviceDate.split("T")[0] : ""}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Basic Fields */}
          <div>
            <label className="block text-xs font-medium text-[#262626]">
              Production Plan Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Executive Lunch Buffet Prep"
              className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#262626]">
                Plan Date *
              </label>
              <input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#262626]">
                Service Slot / Shift
              </label>
              <select
                value={serviceSlot}
                onChange={(e) => setServiceSlot(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              >
                <option value="breakfast">Breakfast</option>
                <option value="morning_tea">Morning Tea</option>
                <option value="lunch">Lunch</option>
                <option value="afternoon_tea">Afternoon Tea</option>
                <option value="dinner">Dinner</option>
                <option value="all_day">All Day Service</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#262626]">
                Target Servings (Portions)
              </label>
              <input
                type="number"
                min="1"
                value={estimatedServings}
                onChange={(e) => setEstimatedServings(parseInt(e.target.value, 10) || 1)}
                className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#262626]">
                Venue / Delivery Notes
              </label>
              <input
                type="text"
                value={venueNotes}
                onChange={(e) => setVenueNotes(e.target.value)}
                placeholder="e.g. Grand Ballroom, 2nd Floor"
                className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#262626]">
                Dietary & Allergen Alerts
              </label>
              <input
                type="text"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="e.g. 5 Nut Allergies, 10 Halal, 8 Vegan"
                className="mt-1 block w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          {/* Initial Tasks Setup */}
          <div className="border-t border-[#E5E5E5] pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Initial Kitchen Preparation Tasks
              </label>
              <button
                type="button"
                onClick={handleAddTask}
                className="text-xs font-medium text-[#171717] hover:underline"
              >
                + Add Task
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5]"
                >
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => handleTaskChange(idx, "title", e.target.value)}
                    placeholder="Task title (e.g. Chop vegetables)"
                    className="flex-1 rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                    required
                  />
                  <select
                    value={task.station}
                    onChange={(e) => handleTaskChange(idx, "station", e.target.value)}
                    className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  >
                    {STATIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={task.dueTime || ""}
                    onChange={(e) => handleTaskChange(idx, "dueTime", e.target.value)}
                    placeholder="Due (10:00)"
                    className="w-20 rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  />
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-xs text-[#737373] hover:text-rose-600 px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              {isSubmitting ? "Creating Plan..." : "Create Production Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
