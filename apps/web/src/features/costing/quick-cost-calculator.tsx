"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

export function QuickCostCalculator() {
  const { currencySymbol, formatCurrency } = useTenantCurrency();
  const [guests, setGuests] = useState<number>(75);
  const [foodCostPerPerson, setFoodCostPerPerson] = useState<number>(14.5);
  const [laborType, setLaborType] = useState<"fixed" | "per_person">("fixed");
  const [laborAmount, setLaborAmount] = useState<number>(450);
  const [overheadAmount, setOverheadAmount] = useState<number>(200);
  const [contingencyPercent, setContingencyPercent] = useState<number>(5);
  const [targetMargin, setTargetMargin] = useState<number>(35);
  const [customPricePerGuest, setCustomPricePerGuest] = useState<string>("");

  const results = useMemo(() => {
    const safeGuests = guests > 0 ? guests : 1;
    const foodTotal = foodCostPerPerson * safeGuests;
    const laborTotal =
      laborType === "fixed" ? laborAmount : laborAmount * safeGuests;
    const baseSubtotal = foodTotal + laborTotal + overheadAmount;
    const contingencyTotal = (baseSubtotal * contingencyPercent) / 100;
    const totalCost = baseSubtotal + contingencyTotal;
    const costPerGuest = totalCost / safeGuests;

    // Margin formula: Selling Price = Cost / (1 - Margin/100)
    const marginDivisor = 1 - targetMargin / 100;
    const suggestedTotal = marginDivisor > 0 ? totalCost / marginDivisor : totalCost;
    const suggestedPerGuest = suggestedTotal / safeGuests;
    const targetMarkup = totalCost > 0 ? ((suggestedTotal - totalCost) / totalCost) * 100 : 0;

    // Actual pricing comparison
    const quotedPerGuest =
      customPricePerGuest !== "" && !isNaN(parseFloat(customPricePerGuest))
        ? parseFloat(customPricePerGuest)
        : suggestedPerGuest;
    const quotedTotal = quotedPerGuest * safeGuests;
    const netProfit = quotedTotal - totalCost;
    const actualMargin = quotedTotal > 0 ? (netProfit / quotedTotal) * 100 : 0;
    const actualMarkup = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      safeGuests,
      foodTotal,
      laborTotal,
      overheadAmount,
      contingencyTotal,
      totalCost,
      costPerGuest,
      suggestedTotal,
      suggestedPerGuest,
      targetMarkup,
      quotedPerGuest,
      quotedTotal,
      netProfit,
      actualMargin,
      actualMarkup,
      foodPct: totalCost > 0 ? (foodTotal / totalCost) * 100 : 0,
      laborPct: totalCost > 0 ? (laborTotal / totalCost) * 100 : 0,
      overheadPct:
        totalCost > 0 ? ((overheadAmount + contingencyTotal) / totalCost) * 100 : 0,
    };
  }, [
    guests,
    foodCostPerPerson,
    laborType,
    laborAmount,
    overheadAmount,
    contingencyPercent,
    targetMargin,
    customPricePerGuest,
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Parameters Panel */}
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Pricing Model Inputs</CardTitle>
            <p className="text-xs text-[#737373]">
              Simulate dynamic quote margins, food-to-labor ratios, and breakeven thresholds.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-[#171717] mb-1">
                <span>Guest Count: {guests} guests</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10) || 1)}
                className="w-full accent-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Food & Ingredient Cost per Guest ({currencySymbol})
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={foodCostPerPerson}
                  onChange={(e) =>
                    setFoodCostPerPerson(parseFloat(e.target.value) || 0)
                  }
                  className="block w-full rounded-md border border-[#E5E5E5] pl-7 pr-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#171717]">
                  Direct Kitchen & Service Labor
                </label>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLaborType("fixed")}
                    className={`px-1.5 py-0.5 rounded ${
                      laborType === "fixed"
                        ? "bg-[#171717] text-white"
                        : "bg-[#F5F5F4] text-[#737373]"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaborType("per_person")}
                    className={`px-1.5 py-0.5 rounded ${
                      laborType === "per_person"
                        ? "bg-[#171717] text-white"
                        : "bg-[#F5F5F4] text-[#737373]"
                    }`}
                  >
                    Per Guest
                  </button>
                </div>
              </div>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={laborAmount}
                  onChange={(e) => setLaborAmount(parseFloat(e.target.value) || 0)}
                  className="block w-full rounded-md border border-[#E5E5E5] pl-7 pr-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#171717]">
                  Equipment & Rentals ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={overheadAmount}
                  onChange={(e) =>
                    setOverheadAmount(parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717]">
                  Wastage / Buffer (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={contingencyPercent}
                  onChange={(e) =>
                    setContingencyPercent(parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 block w-full rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#171717] mb-1">
                <span>Target Gross Margin: {targetMargin}%</span>
                <span className="text-[#737373]">
                  Markup: {results.targetMarkup.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="75"
                step="1"
                value={targetMargin}
                onChange={(e) =>
                  setTargetMargin(parseInt(e.target.value, 10) || 0)
                }
                className="w-full accent-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717]">
                Custom Test Price per Guest ({currencySymbol})
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#737373]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={results.suggestedPerGuest.toFixed(2)}
                  value={customPricePerGuest}
                  onChange={(e) => setCustomPricePerGuest(e.target.value)}
                  className="block w-full rounded-md border border-[#E5E5E5] pl-7 pr-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Margin & Breakeven Results */}
      <div className="lg:col-span-7 space-y-4">
        {/* Main Executive Summary Card */}
        <div className="rounded-lg border border-[#171717] bg-[#171717] text-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#333333] pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
              Simulated Profit & Contract Output
            </span>
            <span className="text-xs font-mono text-[#A3A3A3]">
              {results.safeGuests} Guests
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-[#333333]">
            <div className="px-2">
              <span className="block text-[11px] text-[#A3A3A3] uppercase">Total Cost</span>
              <span className="text-xl font-bold font-mono text-white">
                {formatCurrency(results.totalCost)}
              </span>
              <span className="block text-[10px] text-[#737373]">
                {formatCurrency(results.costPerGuest)} / guest
              </span>
            </div>

            <div className="px-2">
              <span className="block text-[11px] text-[#A3A3A3] uppercase">Suggested Quote</span>
              <span className="text-xl font-bold font-mono text-stone-200">
                {formatCurrency(results.suggestedTotal)}
              </span>
              <span className="block text-[10px] text-[#737373]">
                {formatCurrency(results.suggestedPerGuest)} / guest
              </span>
            </div>

            <div className="px-2">
              <span className="block text-[11px] text-[#A3A3A3] uppercase">Quoted Revenue</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(results.quotedTotal)}
              </span>
              <span className="block text-[10px] text-[#737373]">
                {formatCurrency(results.quotedPerGuest)} / guest
              </span>
            </div>

            <div className="px-2">
              <span className="block text-[11px] text-[#A3A3A3] uppercase">Realized Margin</span>
              <span
                className={`text-xl font-bold font-mono ${
                  results.actualMargin >= targetMargin
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {results.actualMargin.toFixed(1)}%
              </span>
              <span className="block text-[10px] text-[#737373]">
                Profit: {formatCurrency(results.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Structure & Waterfall Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Structure Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visual Bar Breakdown */}
            <div className="h-4 w-full rounded-full bg-[#E5E5E5] flex overflow-hidden">
              <div
                style={{ width: `${results.foodPct}%` }}
                className="bg-neutral-800 h-full"
                title={`Food: ${results.foodPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${results.laborPct}%` }}
                className="bg-neutral-500 h-full"
                title={`Labor: ${results.laborPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${results.overheadPct}%` }}
                className="bg-neutral-300 h-full"
                title={`Overheads & Buffer: ${results.overheadPct.toFixed(1)}%`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#737373] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-800" />
                <span>Food: {formatCurrency(results.foodTotal)} ({results.foodPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-500" />
                <span>Labor: {formatCurrency(results.laborTotal)} ({results.laborPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                <span>Overhead + Buffer: {formatCurrency(results.overheadAmount + results.contingencyTotal)}</span>
              </div>
            </div>

            {/* Breakeven Table */}
            <div className="border-t border-[#E5E5E5] pt-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-3">
                  <span className="block text-[#737373] text-[11px] font-medium uppercase">
                    Breakeven Price per Guest
                  </span>
                  <span className="text-base font-bold font-mono text-[#171717]">
                    {formatCurrency(results.costPerGuest)}
                  </span>
                  <span className="block text-[11px] text-[#737373] mt-0.5">
                    Selling below this rate incurs an operational loss.
                  </span>
                </div>

                <div className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-3">
                  <span className="block text-[#737373] text-[11px] font-medium uppercase">
                    Target Markup Multiplier
                  </span>
                  <span className="text-base font-bold font-mono text-[#171717]">
                    {(results.suggestedTotal / (results.totalCost || 1)).toFixed(2)}x
                  </span>
                  <span className="block text-[11px] text-[#737373] mt-0.5">
                    Markup required to achieve {targetMargin}% gross margin.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
