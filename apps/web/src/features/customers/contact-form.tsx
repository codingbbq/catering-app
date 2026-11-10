"use client";

import type { CreateContactRequest, UpdateContactRequest } from "@catering/shared-types";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  isEdit?: boolean;
  isPending?: boolean;
  onSubmit: (values: CreateContactRequest & UpdateContactRequest) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ContactForm({
  initialValues,
  isEdit = false,
  isPending = false,
  onSubmit,
  onCancel,
  submitLabel,
}: ContactFormProps) {
  const form = useForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      role: initialValues?.role ?? "",
      isPrimary: initialValues?.isPrimary ?? false,
    },
    onSubmit: async ({ value }) => {
      const payload: CreateContactRequest & UpdateContactRequest = {
        name: value.name.trim(),
        email: value.email.trim() ? value.email.trim() : undefined,
        phone: value.phone.trim() ? value.phone.trim() : undefined,
        role: value.role.trim() ? value.role.trim() : undefined,
        isPrimary: value.isPrimary,
      };

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
                  return "Contact name is required.";
                }
                if (value.length > 200) {
                  return "Contact name cannot exceed 200 characters.";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="contact-name">
                  Full Name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="e.g. Michael Chang"
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

        {/* Role */}
        <div className="sm:col-span-2">
          <form.Field
            name="role"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                if (value.length > 100) return "Role cannot exceed 100 characters.";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="contact-role">
                  Role / Designation
                </label>
                <input
                  id="contact-role"
                  type="text"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="e.g. Event Coordinator, Bride, Purchasing Manager"
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
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="contact-email">
                  Direct Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="michael@company.com"
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
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373]" htmlFor="contact-phone">
                  Direct Phone
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#262626] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 ${
                    field.state.meta.errors.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-[#E5E5E5] focus:border-[#171717] focus:ring-[#171717]"
                  }`}
                  placeholder="+1 (555) 987-6543"
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

        {/* Primary Contact Toggle */}
        <div className="sm:col-span-2 rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3">
          <form.Field name="isPrimary">
            {(field) => (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[#E5E5E5] text-[#171717] focus:ring-[#171717]"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-semibold text-[#171717]">Primary Account Contact</span>
                  <p className="text-[11px] text-[#737373] mt-0.5">
                    Designated as default recipient for quotations, event confirmations, and invoices.
                  </p>
                </div>
              </label>
            )}
          </form.Field>
        </div>
      </div>

      {/* Form Action Buttons */}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0F0F0]">
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
                : submitLabel ?? (isEdit ? "Update Contact" : "Add Contact")}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
