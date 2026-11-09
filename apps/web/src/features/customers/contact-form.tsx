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
                if (value.length > 160) {
                  return "Contact name cannot exceed 160 characters.";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="form-control w-full">
                <label className="label" htmlFor="contact-name">
                  <span className="label-text font-medium">Contact Person Name *</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="e.g. Jane Doe"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="text-error text-xs mt-1">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Role */}
        <div>
          <form.Field
            name="role"
            validators={{
              onChange: ({ value }) => {
                if (value && value.length > 80) {
                  return "Role cannot exceed 80 characters.";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="form-control w-full">
                <label className="label" htmlFor="contact-role">
                  <span className="label-text font-medium">Role / Title</span>
                </label>
                <input
                  id="contact-role"
                  type="text"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="e.g. Event Coordinator, Bride, Billing"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="text-error text-xs mt-1">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </span>
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
              <div className="form-control w-full">
                <label className="label" htmlFor="contact-phone">
                  <span className="label-text font-medium">Phone Number</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="+1 (555) 987-6543"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="text-error text-xs mt-1">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Email */}
        <div className="sm:col-span-2">
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
              <div className="form-control w-full">
                <label className="label" htmlFor="contact-email">
                  <span className="label-text font-medium">Direct Email</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="jane.doe@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="text-error text-xs mt-1">
                    {field.state.meta.errors.map((err) => String(err)).join(", ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Primary Contact Toggle */}
        <div className="sm:col-span-2">
          <form.Field name="isPrimary">
            {(field) => (
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  <span className="label-text font-medium">Mark as Primary Contact</span>
                </label>
                <p className="text-xs text-base-content/60 ml-9">
                  The primary contact is the default recipient for quotation emails and bookings.
                </p>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Action buttons */}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-ghost btn-sm"
                disabled={Boolean(isSubmitting) || isPending}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!canSubmit || Boolean(isSubmitting) || isPending}
            >
              {isSubmitting || isPending ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  Saving...
                </>
              ) : (
                submitLabel ?? (isEdit ? "Update Contact" : "Add Contact")
              )}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
