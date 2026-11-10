"use client";

import type { CreateCustomerRequest, UpdateCustomerRequest } from "@catering/shared-types";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  isActive?: boolean;
}

interface CustomerFormProps {
  initialValues?: Partial<CustomerFormValues>;
  isEdit?: boolean;
  isPending?: boolean;
  onSubmit: (values: CreateCustomerRequest & UpdateCustomerRequest) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function CustomerForm({
  initialValues,
  isEdit = false,
  isPending = false,
  onSubmit,
  onCancel,
  submitLabel,
}: CustomerFormProps) {
  const form = useForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      address: initialValues?.address ?? "",
      notes: initialValues?.notes ?? "",
      isActive: initialValues?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      const payload: CreateCustomerRequest & UpdateCustomerRequest = {
        name: value.name.trim(),
        email: value.email.trim() ? value.email.trim() : undefined,
        phone: value.phone.trim() ? value.phone.trim() : undefined,
        address: value.address.trim() ? value.address.trim() : undefined,
        notes: value.notes.trim() ? value.notes.trim() : undefined,
      };

      if (isEdit) {
        payload.isActive = value.isActive;
      }

      await onSubmit(payload);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-2">
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim().length === 0) {
                  return "Customer / company name is required.";
                }
                if (value.length > 200) {
                  return "Customer name cannot exceed 200 characters.";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="customer-name">
                  Customer / Corporate Account Name *
                </label>
                <input
                  id="customer-name"
                  type="text"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="e.g. Apex Corporation or John Smith"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-rose-600">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Email */}
        <div>
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === "") return undefined;
                const result = z.string().email().safeParse(value.trim());
                return result.success ? undefined : "Please enter a valid email address.";
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="customer-email">
                  Primary Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="contact@company.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-rose-600">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Phone */}
        <div>
          <form.Field
            name="phone"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === "") return undefined;
                if (value.length > 32) return "Phone cannot exceed 32 characters.";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="customer-phone">
                  Phone Number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="+1 (555) 123-4567"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-rose-600">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <form.Field
            name="address"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                if (value.length > 500) return "Address cannot exceed 500 characters.";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="customer-address">
                  Physical / Billing Address
                </label>
                <textarea
                  id="customer-address"
                  rows={2}
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="Street address, suite, city, state, postal code"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-rose-600">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <form.Field
            name="notes"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                if (value.length > 2000) return "Notes cannot exceed 2000 characters.";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="customer-notes">
                  Internal Catering Notes
                </label>
                <textarea
                  id="customer-notes"
                  rows={3}
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="Key relationship details, dietary preferences, billing terms, special handling instructions"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-rose-600">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Active Toggle (Edit mode only) */}
        {isEdit && (
          <div className="sm:col-span-2 rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
            <form.Field name="isActive">
              {(field) => (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-[#E5E5E5] text-[#171717] focus:ring-[#171717]"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#171717]">Account Status Active</span>
                    <p className="text-[11px] text-[#737373] mt-0.5">
                      Inactive customers remain preserved for historical quotations and invoices, but are omitted from active sales lookups.
                    </p>
                  </div>
                </label>
              )}
            </form.Field>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#F0F0F0]">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                disabled={Boolean(isSubmitting) || isPending}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
              disabled={!canSubmit || Boolean(isSubmitting) || isPending}
            >
              {isSubmitting || isPending
                ? "Saving..."
                : submitLabel ?? (isEdit ? "Save Changes" : "Create Customer")}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
