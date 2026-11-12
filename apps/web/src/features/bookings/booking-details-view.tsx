"use client";

import type { BookingDetail } from "@catering/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { cancelBooking, confirmBooking } from "@/lib/bookings-api";
import { BookingStatusBadge } from "./booking-status-badge";

interface BookingDetailsViewProps {
  booking: BookingDetail;
  tenantSlug: string;
}

export function BookingDetailsView({ booking, tenantSlug }: BookingDetailsViewProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenantCurrency();

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Not authenticated");
      return confirmBooking(booking.id, accessToken, {
        notes: confirmNotes || undefined,
      });
    },
    onSuccess: () => {
      setShowConfirmDialog(false);
      setConfirmNotes("");
      queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to confirm booking.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Not authenticated");
      if (!cancellationReason.trim()) {
        throw new Error("Please provide a reason for cancelling this booking.");
      }
      return cancelBooking(
        booking.id,
        { cancellationReason: cancellationReason.trim() },
        accessToken,
      );
    },
    onSuccess: () => {
      setShowCancelDialog(false);
      setCancellationReason("");
      queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to cancel booking.");
    },
  });

  const eventDate = new Date(booking.eventDate);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
            <Link
              href={`/tenant/${tenantSlug}/bookings`}
              className="hover:underline text-[#737373]"
            >
              Bookings
            </Link>
            <span>/</span>
            <span className="font-mono font-medium text-[#171717]">
              {booking.bookingNumber}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#171717] tracking-tight">
              {booking.title}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {booking.status === "draft" && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              ✓ Confirm Booking
            </button>
          )}

          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {booking.status !== "cancelled" && (
            <Link
              href={`/tenant/${tenantSlug}/bookings/${booking.id}/edit`}
              className="rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              Edit Booking
            </Link>
          )}
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex justify-between items-center">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cancellation Banner */}
      {booking.status === "cancelled" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            Booking Cancelled {booking.cancelledAt && `on ${new Date(booking.cancelledAt).toLocaleDateString()}`}
          </div>
          {booking.cancellationReason && (
            <p className="text-red-800">
              <span className="font-medium">Reason:</span> {booking.cancellationReason}
            </p>
          )}
        </div>
      )}

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            Primary Event Date
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#171717]">
            {eventDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            {booking.confirmedAt ? "Confirmed schedule" : "Tentative date"}
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            Expected Guests
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#171717]">
            {booking.guestCount ? `${booking.guestCount} guests` : "Not specified"}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373] capitalize">
            {booking.serviceType.replace(/_/g, " ")}
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            Contracted Value
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#171717]">
            {formatCurrency(booking.totalAmount)}
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            {booking.quotationId ? "Tied to accepted quote" : "Direct booking agreement"}
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            Operational Milestones
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#171717]">
            {booking.schedules.length} scheduled
          </div>
          <div className="mt-0.5 text-[11px] text-[#737373]">
            Kitchen, service, breakdown
          </div>
        </div>
      </div>

      {/* Main Grid: Schedule Timeline & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Service Schedule Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                  Service Execution Schedule
                </h2>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  Chronological event timeline for kitchen, operations, and service staff.
                </p>
              </div>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-[#737373]">
                {booking.schedules.length} milestones
              </span>
            </div>

            {booking.schedules.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737373]">
                No operational milestones scheduled. Edit this booking to add timing milestones.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#E5E5E5] pl-6">
                {booking.schedules.map((schedule, idx) => {
                  const sDate = new Date(schedule.scheduledDate);
                  return (
                    <div
                      key={schedule.id}
                      className="relative rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 space-y-1.5"
                    >
                      {/* Timeline dot */}
                      <span className="absolute -left-[1.85rem] top-4 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#171717]" />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-xs text-[#171717]">
                            {schedule.title}
                          </span>
                          {schedule.location && (
                            <span className="ml-2 text-[11px] text-[#737373]">
                              @ {schedule.location}
                            </span>
                          )}
                        </div>

                        {(schedule.startTime || schedule.endTime) && (
                          <span className="rounded bg-white border border-[#E5E5E5] px-2 py-0.5 font-mono text-[11px] text-[#171717] font-medium shrink-0">
                            {schedule.startTime} {schedule.endTime ? `– ${schedule.endTime}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#737373]">
                        <span>
                          {sDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {schedule.description && (
                        <p className="text-xs text-[#262626] pt-1 border-t border-[#E5E5E5]/60 mt-1">
                          {schedule.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Notes & Special Instructions */}
          {booking.specialInstructions && (
            <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
                Special Instructions & Dietary Protocol
              </h2>
              <div className="text-xs text-[#262626] whitespace-pre-wrap leading-relaxed">
                {booking.specialInstructions}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Venue, Customer & Commercial Linkage */}
        <div className="space-y-6">
          {/* Customer & On-Site Contact */}
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
              Customer & On-Site Contact
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] text-[#737373] block">Account / Client</span>
                <Link
                  href={`/tenant/${tenantSlug}/customers/${booking.customerId}`}
                  className="font-medium text-[#171717] hover:underline"
                >
                  {booking.customer.name}
                </Link>
              </div>

              {booking.contactName && booking.contactName !== booking.customer.name && (
                <div>
                  <span className="text-[11px] text-[#737373] block">Day-of-Event Contact</span>
                  <span className="font-medium text-[#262626]">{booking.contactName}</span>
                </div>
              )}

              {booking.contactPhone && (
                <div>
                  <span className="text-[11px] text-[#737373] block">Contact Phone</span>
                  <a
                    href={`tel:${booking.contactPhone}`}
                    className="font-mono text-[#171717] hover:underline"
                  >
                    {booking.contactPhone}
                  </a>
                </div>
              )}

              {booking.contactEmail && (
                <div>
                  <span className="text-[11px] text-[#737373] block">Contact Email</span>
                  <a
                    href={`mailto:${booking.contactEmail}`}
                    className="font-mono text-[#171717] hover:underline"
                  >
                    {booking.contactEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Venue & Location */}
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
              Event Venue & Logistics
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] text-[#737373] block">Venue Name</span>
                <span className="font-medium text-[#171717]">
                  {booking.venueName || "Venue not specified"}
                </span>
              </div>

              {booking.venueAddress && (
                <div>
                  <span className="text-[11px] text-[#737373] block">Address & Access</span>
                  <span className="text-[#262626]">{booking.venueAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Commercial & CRM Linkage */}
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#E5E5E5] pb-2">
              Commercial Linkage
            </h3>

            <div className="space-y-2.5 text-xs">
              {booking.quotation ? (
                <div>
                  <span className="text-[11px] text-[#737373] block">Originated from Quotation</span>
                  <Link
                    href={`/tenant/${tenantSlug}/quotations/${booking.quotation.id}`}
                    className="font-mono font-medium text-[#171717] hover:underline"
                  >
                    {booking.quotation.quotationNumber} (v{booking.quotation.currentRevisionNumber})
                  </Link>
                  <div className="text-[11px] text-[#737373] truncate">
                    {booking.quotation.title}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] text-[#737373] block">Quotation Origin</span>
                  <span className="text-[#737373]">Direct booking without quotation</span>
                </div>
              )}

              {booking.enquiry && (
                <div>
                  <span className="text-[11px] text-[#737373] block">Linked CRM Enquiry</span>
                  <Link
                    href={`/tenant/${tenantSlug}/enquiries/${booking.enquiry.id}`}
                    className="font-mono text-[#171717] hover:underline"
                  >
                    {booking.enquiry.enquiryNumber}
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t border-[#F0F0F0] space-y-1 text-[11px] text-[#737373]">
                <div>
                  Created: {new Date(booking.createdAt).toLocaleString()}
                </div>
                {booking.confirmedAt && (
                  <div>
                    Confirmed: {new Date(booking.confirmedAt).toLocaleString()}
                  </div>
                )}
                <div>
                  Last Updated: {new Date(booking.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">
              Confirm Booking {booking.bookingNumber}
            </h3>
            <p className="text-xs text-[#737373]">
              Confirming this booking marks the event as locked in for kitchen prep and fulfillment.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Confirmation Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="e.g. Deposit received, kitchen crew notified"
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {confirmMutation.isPending ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog Modal */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-red-700">
              Cancel Booking {booking.bookingNumber}
            </h3>
            <p className="text-xs text-[#737373]">
              Cancelling a booking cannot be undone. Please specify the business reason for cancellation.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Client cancelled event due to weather / venue conflicts"
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending || !cancellationReason.trim()}
                className="rounded bg-red-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
