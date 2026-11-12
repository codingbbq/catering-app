"use client";

import type {
  CreateEnquiryRequest,
  EnquiryStatus,
  ServiceType,
  UpdateEnquiryRequest,
} from "@catering/shared-types";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

export interface CustomerOption {
  id: string;
  name: string;
}

export interface EnquiryFormValues {
  customerId?: string | undefined;
  title?: string | undefined;
  serviceType?: ServiceType | undefined;
  eventDate?: string | undefined;
  guestCount?: string | undefined;
  eventType?: string | undefined;
  venue?: string | undefined;
  estimatedBudget?: string | undefined;
  notes?: string | undefined;
  nextAction?: string | undefined;
  nextActionDate?: string | undefined;
  status?: EnquiryStatus | undefined;
  lostReason?: string | undefined;
}

interface EnquiryFormProps {
  initialValues?: Partial<EnquiryFormValues>;
  customerOptions?: CustomerOption[];
  isEdit?: boolean;
  isPending?: boolean;
  onSubmit: (values: CreateEnquiryRequest & UpdateEnquiryRequest) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function EnquiryForm({
  initialValues,
  customerOptions = [],
  isEdit = false,
  isPending = false,
  onSubmit,
  onCancel,
  submitLabel,
}: EnquiryFormProps) {
  const { currencySymbol } = useTenantCurrency();
  const form = useForm({
    defaultValues: {
      customerId: initialValues?.customerId ?? (customerOptions[0]?.id ?? ""),
      title: initialValues?.title ?? "",
      serviceType: (initialValues?.serviceType ?? "event_catering") as ServiceType,
      eventDate: initialValues?.eventDate ?? "",
      guestCount: initialValues?.guestCount ?? "",
      eventType: initialValues?.eventType ?? "",
      venue: initialValues?.venue ?? "",
      estimatedBudget: initialValues?.estimatedBudget ?? "",
      notes: initialValues?.notes ?? "",
      nextAction: initialValues?.nextAction ?? "",
      nextActionDate: initialValues?.nextActionDate ?? "",
      status: initialValues?.status ?? ("new" as EnquiryStatus),
      lostReason: initialValues?.lostReason ?? "",
    },
    onSubmit: async ({ value }) => {
      const payload: CreateEnquiryRequest & UpdateEnquiryRequest = {
        customerId: value.customerId,
        title: value.title.trim(),
        serviceType: value.serviceType,
        eventDate: value.eventDate ? new Date(value.eventDate).toISOString() : undefined,
        guestCount: value.guestCount ? parseInt(value.guestCount, 10) : undefined,
        eventType: value.eventType.trim() || undefined,
        venue: value.venue.trim() || undefined,
        estimatedBudget: value.estimatedBudget ? parseFloat(value.estimatedBudget) : undefined,
        notes: value.notes.trim() || undefined,
        nextAction: value.nextAction.trim() || undefined,
        nextActionDate: value.nextActionDate ? new Date(value.nextActionDate).toISOString() : undefined,
      };

      if (isEdit) {
        payload.status = value.status;
        payload.lostReason = value.lostReason.trim() || undefined;
      }

      await onSubmit(payload);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-[#171717] pb-4 mb-4 border-b border-[#F0F0F0]">
          Core Enquiry Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Selection */}
          {!isEdit ? (
            <form.Field
              name="customerId"
              validators={{
                onChange: ({ value }) => (!value ? "Please select a customer" : undefined),
              }}
            >
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="customerId" className="block text-xs font-medium text-[#262626]">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="customerId"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                  >
                    <option value="" disabled>
                      Select a customer...
                    </option>
                    {customerOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          ) : null}

          {/* Title */}
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Title is required" : value.length > 200 ? "Max 200 characters" : undefined,
            }}
          >
            {(field) => (
              <div className={`space-y-1 ${isEdit ? "md:col-span-2" : ""}`}>
                <label htmlFor="title" className="block text-xs font-medium text-[#262626]">
                  Enquiry Title / Opportunity Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Acme Corp Annual Gala Dinner"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
                {field.state.meta.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-600">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          {/* Service Type */}
          <form.Field name="serviceType">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="serviceType" className="block text-xs font-medium text-[#262626]">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="serviceType"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as ServiceType)}
                  className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                >
                  <option value="event_catering">Event Catering</option>
                  <option value="daily_meals">Daily Meal Orders</option>
                  <option value="other">Other / Custom</option>
                </select>
              </div>
            )}
          </form.Field>

          {/* Event Type */}
          <form.Field name="eventType">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="eventType" className="block text-xs font-medium text-[#262626]">
                  Event Type
                </label>
                <input
                  id="eventType"
                  type="text"
                  placeholder="e.g. Wedding, Corporate Buffet, Birthday"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Event Date */}
          <form.Field name="eventDate">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="eventDate" className="block text-xs font-medium text-[#262626]">
                  Target Event Date
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Guest Count */}
          <form.Field name="guestCount">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="guestCount" className="block text-xs font-medium text-[#262626]">
                  Estimated Guest Count (pax)
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min="1"
                  placeholder="e.g. 120"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Venue */}
          <form.Field name="venue">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="venue" className="block text-xs font-medium text-[#262626]">
                  Venue / Location
                </label>
                <input
                  id="venue"
                  type="text"
                  placeholder="e.g. Royal Palace Banquet, Room 3"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Estimated Budget */}
          <form.Field name="estimatedBudget">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="estimatedBudget" className="block text-xs font-medium text-[#262626]">
                  Estimated Budget ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#737373]">
                    {currencySymbol}
                  </span>
                  <input
                    id="estimatedBudget"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000.00"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-md border border-[#E5E5E5] pl-7 pr-3 py-2 text-xs font-mono text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </form.Field>

          {/* Next Action */}
          <form.Field name="nextAction">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="nextAction" className="block text-xs font-medium text-[#262626]">
                  Next Follow-up Action
                </label>
                <input
                  id="nextAction"
                  type="text"
                  placeholder="e.g. Send menu proposals, Follow up call"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Next Action Date */}
          <form.Field name="nextActionDate">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="nextActionDate" className="block text-xs font-medium text-[#262626]">
                  Next Action Due Date
                </label>
                <input
                  id="nextActionDate"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="notes" className="block text-xs font-medium text-[#262626]">
                  Notes & Dietary / Menu Preferences
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Client requirements, dietary restrictions, special service requests..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                />
              </div>
            )}
          </form.Field>

          {/* Status & Lost reason (if editing) */}
          {isEdit && (
            <>
              <form.Field name="status">
                {(field) => (
                  <div className="space-y-1">
                    <label htmlFor="status" className="block text-xs font-medium text-[#262626]">
                      Enquiry Status
                    </label>
                    <select
                      id="status"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value as EnquiryStatus)}
                      className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
                    >
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="lostReason">
                {(field) => (
                  <div className="space-y-1">
                    <label htmlFor="lostReason" className="block text-xs font-medium text-[#262626]">
                      Lost / Cancellation Reason
                    </label>
                    <input
                      id="lostReason"
                      type="text"
                      placeholder="e.g. Budget out of range, Selected other caterer"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
                    />
                  </div>
                )}
              </form.Field>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting || isPending}
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              {isSubmitting || isPending
                ? "Saving..."
                : submitLabel ?? (isEdit ? "Save Changes" : "Create Enquiry")}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
