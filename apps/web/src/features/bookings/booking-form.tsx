"use client";

import type {
  BookingDetail,
  BookingScheduleItemInput,
  CreateBookingRequest,
  ServiceType,
  UpdateBookingRequest,
} from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { listCustomers } from "@/lib/customers-api";
import { getQuotation } from "@/lib/quotations-api";

interface BookingFormProps {
  mode: "create" | "edit";
  tenantSlug: string;
  initialQuotationId?: string | undefined;
  initialData?: BookingDetail | undefined;
  onSubmit: (data: CreateBookingRequest | UpdateBookingRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function BookingForm({
  mode,
  tenantSlug,
  initialQuotationId,
  initialData,
  onSubmit,
  isSubmitting = false,
}: BookingFormProps) {
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { currencySymbol } = useTenantCurrency();

  // If quotationId is passed, fetch quotation details to prefill
  const { data: quotation, isLoading: isLoadingQuotation } = useQuery({
    queryKey: ["quotation", initialQuotationId],
    queryFn: () => getQuotation(initialQuotationId!, accessToken!),
    enabled: !!initialQuotationId && !!accessToken && mode === "create",
  });

  // Fetch customers list for standalone creation
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => listCustomers(accessToken!, { isActive: true }),
    enabled: isAuthenticated && isTenant && !!accessToken && mode === "create" && !initialQuotationId,
  });

  // Form states
  const [title, setTitle] = useState(
    initialData?.title ||
      (quotation ? `Booking: ${quotation.title}` : ""),
  );
  const [customerId, setCustomerId] = useState(
    initialData?.customerId || quotation?.customerId || "",
  );
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialData?.serviceType || "event_catering",
  );
  const [eventDate, setEventDate] = useState(
    initialData?.eventDate
      ? initialData.eventDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [status, setStatus] = useState<"draft" | "confirmed">(
    (initialData?.status as "draft" | "confirmed") || "confirmed",
  );
  const [guestCount, setGuestCount] = useState<number | string>(
    initialData?.guestCount ??
      quotation?.currentRevision?.guestCount ??
      "",
  );
  const [totalAmount, setTotalAmount] = useState<number | string>(
    initialData?.totalAmount ??
      quotation?.currentRevision?.totalAmount ??
      "",
  );
  const [venueName, setVenueName] = useState(
    initialData?.venueName || "",
  );
  const [venueAddress, setVenueAddress] = useState(
    initialData?.venueAddress || "",
  );
  const [contactName, setContactName] = useState(
    initialData?.contactName || quotation?.customerName || "",
  );
  const [contactPhone, setContactPhone] = useState(
    initialData?.contactPhone || quotation?.customerPhone || "",
  );
  const [contactEmail, setContactEmail] = useState(
    initialData?.contactEmail || quotation?.customerEmail || "",
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    initialData?.specialInstructions || quotation?.notes || "",
  );

  // Schedules state
  const [schedules, setSchedules] = useState<BookingScheduleItemInput[]>(
    initialData?.schedules && initialData.schedules.length > 0
      ? initialData.schedules.map((s) => ({
          title: s.title,
          scheduledDate: s.scheduledDate.slice(0, 10),
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          description: s.description || "",
          location: s.location || "",
          sortOrder: s.sortOrder,
        }))
      : [
          {
            title: "Kitchen & Staff Arrival / Setup",
            scheduledDate: eventDate,
            startTime: "10:00",
            endTime: "12:00",
            description: "Site setup, load-in and prep",
            location: venueName || "Venue",
            sortOrder: 0,
          },
          {
            title: "Catering Service Execution",
            scheduledDate: eventDate,
            startTime: "13:00",
            endTime: "16:00",
            description: "Live food & beverage service",
            location: venueName || "Venue",
            sortOrder: 1,
          },
          {
            title: "Packdown & Site Teardown",
            scheduledDate: eventDate,
            startTime: "16:30",
            endTime: "18:00",
            description: "Breakdown and equipment clearing",
            location: venueName || "Venue",
            sortOrder: 2,
          },
        ],
  );

  const [formError, setFormError] = useState<string | null>(null);

  // When quotation data arrives in create mode, sync fields if not yet edited
  if (quotation && !customerId && quotation.customerId) {
    setCustomerId(quotation.customerId);
    if (!title) setTitle(`Booking: ${quotation.title}`);
    if (quotation.currentRevision?.guestCount && !guestCount) {
      setGuestCount(quotation.currentRevision.guestCount);
    }
    if (quotation.currentRevision?.totalAmount && !totalAmount) {
      setTotalAmount(quotation.currentRevision.totalAmount);
    }
    if (quotation.customerName && !contactName) {
      setContactName(quotation.customerName);
    }
    if (quotation.customerPhone && !contactPhone) {
      setContactPhone(quotation.customerPhone);
    }
    if (quotation.customerEmail && !contactEmail) {
      setContactEmail(quotation.customerEmail);
    }
    if (quotation.notes && !specialInstructions) {
      setSpecialInstructions(quotation.notes);
    }
  }

  const handleAddSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      {
        title: "Additional Milestone",
        scheduledDate: eventDate,
        startTime: "",
        endTime: "",
        description: "",
        location: venueName || "",
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (
    index: number,
    field: keyof BookingScheduleItemInput,
    value: any,
  ) => {
    setSchedules((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Booking title is required.");
      return;
    }

    if (mode === "create" && !customerId) {
      setFormError("Please select a customer.");
      return;
    }

    if (!eventDate) {
      setFormError("Event date is required.");
      return;
    }

    try {
      if (mode === "create") {
        const payload: CreateBookingRequest = {
          title: title.trim(),
          customerId,
          quotationId: initialQuotationId || undefined,
          enquiryId: quotation?.enquiryId || undefined,
          serviceType,
          eventDate: new Date(eventDate).toISOString(),
          status,
          guestCount: guestCount ? Number(guestCount) : undefined,
          totalAmount: totalAmount ? Number(totalAmount) : 0,
          venueName: venueName.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          schedules: schedules.map((s, idx) => ({
            ...s,
            sortOrder: idx,
            scheduledDate: new Date(s.scheduledDate || eventDate).toISOString(),
          })),
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateBookingRequest = {
          title: title.trim(),
          serviceType,
          eventDate: new Date(eventDate).toISOString(),
          guestCount: guestCount ? Number(guestCount) : undefined,
          totalAmount: totalAmount ? Number(totalAmount) : 0,
          venueName: venueName.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          schedules: schedules.map((s, idx) => ({
            ...s,
            sortOrder: idx,
            scheduledDate: new Date(s.scheduledDate || eventDate).toISOString(),
          })),
        };
        await onSubmit(payload);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save booking. Please check your inputs.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quotation Conversion Banner */}
      {initialQuotationId && quotation && (
        <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#171717]">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Converting Accepted Quotation {quotation.quotationNumber}
          </div>
          <p className="mt-1 text-[#737373]">
            Commercial terms, customer, guest count, and pricing have been pre-filled from revision #{quotation.currentRevisionNumber}.
          </p>
        </div>
      )}

      {/* Error Message */}
      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {formError}
        </div>
      )}

      {/* Section 1: Core Event Overview */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 space-y-4">
        <h3 className="text-xs font-semibold text-[#171717] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
          1. Event & Booking Core Info
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Booking Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme Corp Annual Gala Banquet 2026"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          {mode === "create" && !initialQuotationId && (
            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const selected = customersData?.data.find((c) => c.id === e.target.value);
                  if (selected) {
                    setContactName(selected.name);
                    setContactEmail(selected.email || "");
                    setContactPhone(selected.phone || "");
                  }
                }}
                disabled={isLoadingCustomers}
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
              >
                <option value="">Select customer...</option>
                {customersData?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Primary Event Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                // Also update default scheduled dates if first milestone matches
                setSchedules((prev) =>
                  prev.map((s) => ({ ...s, scheduledDate: e.target.value })),
                );
              }}
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            >
              <option value="event_catering">Event Catering (Buffet / Plated)</option>
              <option value="daily_meals">Daily Corporate Meals</option>
              <option value="other">Other Food & Beverage Service</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Expected Guest Count
            </label>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="e.g. 150"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Total Booking Value ({currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-xs font-medium text-[#262626] mb-1">
                Initial Booking State
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "confirmed")}
                className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
              >
                <option value="confirmed">Confirmed (Default)</option>
                <option value="draft">Draft / Tentative</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Venue & On-Site Contact Details */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 space-y-4">
        <h3 className="text-xs font-semibold text-[#171717] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
          2. Venue & On-Site Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Venue / Facility Name
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Grand Metropolitan Ballroom"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Venue Address & Access Notes
            </label>
            <input
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="e.g. 100 Main St, 4th Floor Freight Elevator Access"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Primary Contact Person
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (555) 012-3456"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#262626] mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full rounded border border-[#E5E5E5] px-3 py-1.5 text-xs font-mono text-[#171717] focus:outline-hidden focus:border-[#171717]"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Service Schedule Timeline Milestones */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
          <div>
            <h3 className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              3. Service Schedule & Operational Timeline
            </h3>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Define kitchen arrival, food service start/end, and teardown milestones.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSchedule}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
          >
            + Add Milestone
          </button>
        </div>

        <div className="space-y-3">
          {schedules.map((schedule, idx) => (
            <div
              key={idx}
              className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-mono text-xs font-semibold text-[#737373] w-5">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={schedule.title}
                    onChange={(e) =>
                      handleScheduleChange(idx, "title", e.target.value)
                    }
                    placeholder="Milestone title (e.g. Cocktail Hour, Dinner Buffet)"
                    className="flex-1 rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
                  />
                </div>
                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSchedule(idx)}
                    className="text-[#737373] hover:text-red-600 text-xs px-2 py-1"
                    title="Remove milestone"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] text-[#737373] block mb-0.5">Date</label>
                  <input
                    type="date"
                    required
                    value={schedule.scheduledDate}
                    onChange={(e) =>
                      handleScheduleChange(idx, "scheduledDate", e.target.value)
                    }
                    className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#737373] block mb-0.5">Start Time</label>
                  <input
                    type="time"
                    value={schedule.startTime || ""}
                    onChange={(e) =>
                      handleScheduleChange(idx, "startTime", e.target.value)
                    }
                    className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#737373] block mb-0.5">End Time</label>
                  <input
                    type="time"
                    value={schedule.endTime || ""}
                    onChange={(e) =>
                      handleScheduleChange(idx, "endTime", e.target.value)
                    }
                    className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#737373] block mb-0.5">Station / Location</label>
                  <input
                    type="text"
                    value={schedule.location || ""}
                    onChange={(e) =>
                      handleScheduleChange(idx, "location", e.target.value)
                    }
                    placeholder="e.g. Main Lawn, Kitchen"
                    className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#171717]"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={schedule.description || ""}
                  onChange={(e) =>
                    handleScheduleChange(idx, "description", e.target.value)
                  }
                  placeholder="Operational notes for kitchen/service crew..."
                  className="w-full rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#171717] text-[11px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Operational Notes & Special Instructions */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 space-y-4">
        <h3 className="text-xs font-semibold text-[#171717] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
          4. Special Instructions & Operational Notes
        </h3>

        <div>
          <textarea
            rows={3}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Special dietary requirements, allergen protocols, loading bay restrictions, VIP handling notes..."
            className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:outline-hidden focus:border-[#171717]"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-[#171717] px-5 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Confirm & Create Booking"
              : "Save Booking Changes"}
        </button>
      </div>
    </form>
  );
}
