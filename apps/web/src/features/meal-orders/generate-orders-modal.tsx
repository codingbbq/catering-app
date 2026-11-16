"use client";

import { useState } from "react";
import type { DailyMealPlanListItem, GenerateOrdersResult } from "@catering/shared-types";
import { generateOrdersFromPlan } from "@/lib/daily-meal-orders-api";
import { useAuth } from "@/providers/auth-provider";

interface GenerateOrdersModalProps {
  plan: DailyMealPlanListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateOrdersModal({
  plan,
  isOpen,
  onClose,
  onSuccess,
}: GenerateOrdersModalProps) {
  const { accessToken } = useAuth();

  // Default date range: next 7 days
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const [fromDate, setFromDate] = useState<string>(
    today.toISOString().split("T")[0] || "",
  );
  const [toDate, setToDate] = useState<string>(
    nextWeek.toISOString().split("T")[0] || "",
  );
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateOrdersResult | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateOrdersFromPlan(
        plan.id,
        {
          fromDate,
          toDate,
          overwriteExisting,
        },
        accessToken,
      );
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to generate orders from plan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#171717]">
              Generate Daily Meal Orders
            </h3>
            <p className="text-xs text-[#737373] mt-0.5">
              Plan: {plan.planNumber} — {plan.name} ({plan.customerName})
            </p>
          </div>
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

        {result ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900">
              <p className="font-semibold text-sm">
                Successfully generated {result.generatedCount} daily meal{" "}
                {result.generatedCount === 1 ? "order" : "orders"}!
              </p>
              {result.createdOrderNumbers.length > 0 && (
                <div className="mt-2 font-mono text-xs text-emerald-800">
                  {result.createdOrderNumbers.join(", ")}
                </div>
              )}
            </div>

            {result.skippedDates.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900">
                <p className="font-medium">Skipped dates / existing orders:</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
                  {result.skippedDates.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="text-xs text-[#737373]">
              Scheduled Days:{" "}
              <span className="font-medium text-[#171717]">
                {plan.daysOfWeek.join(", ")}
              </span>{" "}
              • Default Volume:{" "}
              <span className="font-mono font-medium text-[#171717]">
                {plan.defaultQuantity} meals
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overwriteExisting"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-[#E5E5E5]"
              />
              <label
                htmlFor="overwriteExisting"
                className="text-xs text-[#737373]"
              >
                Overwrite existing orders for matching dates
              </label>
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
                {isLoading ? "Generating..." : "Generate Orders"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
