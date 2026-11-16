"use client";

import type { KitchenProductionPlan } from "@catering/shared-types";
import { KitchenPlanStatusBadge, KitchenStationBadge } from "./kitchen-status-badge";

interface KitchenChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: KitchenProductionPlan;
}

export function KitchenChitModal({ isOpen, onClose, plan }: KitchenChitModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const tasksByStation = plan.tasks.reduce((acc, task) => {
    acc[task.station] = acc[task.station] || [];
    acc[task.station]?.push(task);
    return acc;
  }, {} as Record<string, typeof plan.tasks>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white print:static">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl border border-[#E5E5E5] print:max-w-none print:shadow-none print:border-none print:p-0">
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#171717] text-white px-2 py-0.5 rounded">
              KITCHEN CHIT
            </span>
            <span className="text-xs text-[#737373]">
              Formatted for station clipboards and wall displays
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Chit
            </button>
            <button
              onClick={onClose}
              className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4]"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Chit Area */}
        <div className="space-y-6 text-[#171717] font-sans">
          {/* Header */}
          <div className="border-b-2 border-[#171717] pb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#737373]">
                  KITCHEN PRODUCTION ORDER
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
                  {plan.title}
                </h1>
                <p className="text-sm font-mono font-bold text-[#171717] mt-1">
                  Plan #{plan.planNumber}
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block">
                  <KitchenPlanStatusBadge status={plan.status} />
                </div>
                <p className="text-xs font-mono text-[#737373] mt-2">
                  Service Date: <strong className="text-[#171717]">{plan.planDate.split("T")[0]}</strong>
                </p>
                {plan.serviceSlot && (
                  <p className="text-xs font-mono uppercase text-[#737373]">
                    Slot: <strong className="text-[#171717]">{plan.serviceSlot}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="mt-4 grid grid-cols-3 gap-3 bg-[#FAFAFA] p-3 rounded border border-[#E5E5E5]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#737373] block">Target Servings</span>
                <span className="text-lg font-mono font-bold text-[#171717]">
                  {plan.estimatedServings} Portions
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#737373] block">Source Demand</span>
                <span className="text-xs font-medium text-[#171717]">
                  {plan.booking
                    ? `Booking: ${plan.booking.bookingNumber} (${plan.booking.customer?.name || "Client"})`
                    : plan.dailyMealOrder
                    ? `Meal Order: ${plan.dailyMealOrder.orderNumber}`
                    : "Standalone Production"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#737373] block">Venue / Delivery</span>
                <span className="text-xs font-medium text-[#171717]">
                  {plan.venueNotes || "Main Production Kitchen"}
                </span>
              </div>
            </div>
          </div>

          {/* Critical Dietary & Allergen Warnings */}
          {plan.dietaryNotes && (
            <div className="border-2 border-amber-600 bg-amber-50 p-4 rounded-md">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                CRITICAL ALLERGEN & DIETARY ALERTS
              </div>
              <p className="mt-1 text-sm font-semibold text-amber-900">
                {plan.dietaryNotes}
              </p>
            </div>
          )}

          {/* Tasks By Station */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#737373] border-b border-[#E5E5E5] pb-1">
              Station Checklists & Mise-en-place
            </h2>

            {Object.entries(tasksByStation).map(([stationKey, tasks]) => (
              <div key={stationKey} className="border border-[#E5E5E5] rounded p-4 bg-white">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <KitchenStationBadge station={stationKey as any} />
                    <span className="text-xs text-[#737373]">({tasks.length} items)</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#737373]">Station Sign-off: _________</span>
                </div>

                <div className="divide-y divide-[#F0F0F0]">
                  {tasks.map((task) => (
                    <div key={task.id} className="py-2.5 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-4 w-4 rounded border-2 border-[#171717] bg-white flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-[#171717] leading-snug">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#737373]">
                            {task.targetQuantity && (
                              <span className="font-mono font-medium text-[#171717]">
                                Qty: {task.targetQuantity} {task.unit || "portions"}
                              </span>
                            )}
                            {task.dueTime && (
                              <span>Due: <strong className="text-[#171717]">{task.dueTime}</strong></span>
                            )}
                            {task.assignedTo && (
                              <span>Assigned: <strong>{task.assignedTo}</strong></span>
                            )}
                          </div>
                          {task.dietaryAlerts && (
                            <p className="mt-1 text-xs text-rose-700 font-medium">
                              ⚠ Alert: {task.dietaryAlerts}
                            </p>
                          )}
                          {task.notes && (
                            <p className="text-xs text-[#737373] italic mt-0.5">
                              Note: {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-xs text-[#737373] uppercase">
                          {task.taskNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* General Notes & Sign-off Footer */}
          {plan.notes && (
            <div className="p-3 bg-[#FAFAFA] rounded border border-[#E5E5E5] text-xs text-[#262626]">
              <strong>Special Instructions:</strong> {plan.notes}
            </div>
          )}

          <div className="pt-6 border-t border-[#171717] flex justify-between items-center text-xs text-[#737373] font-mono">
            <span>Prepared By: ___________________</span>
            <span>Head Chef Verification: ___________________</span>
            <span>Time Out: ___________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
