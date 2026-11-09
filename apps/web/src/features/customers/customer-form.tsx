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
                  return "Customer name is required.";
                }
                if (value.length > 200) {
                  return "Customer name cannot exceed 200 characters.";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="form-control w-full">
                <label className="label" htmlFor="customer-name">
                  <span className="label-text font-medium">Customer / Company Name *</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="e.g. Apex Corporation or John Smith"
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
              <div className="form-control w-full">
                <label className="label" htmlFor="customer-email">
                  <span className="label-text font-medium">Email Address</span>
                </label>
                <input
                  id="customer-email"
                  type="email"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="contact@company.com"
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
                <label className="label" htmlFor="customer-phone">
                  <span className="label-text font-medium">Phone Number</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  className={`input input-bordered w-full ${field.state.meta.errors.length > 0 ? "input-error" : ""}`}
                  placeholder="+1 (555) 123-4567"
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
              <div className="form-control w-full">
                <label className="label" htmlFor="customer-address">
                  <span className="label-text font-medium">Address</span>
                </label>
                <textarea
                  id="customer-address"
                  className={`textarea textarea-bordered w-full ${field.state.meta.errors.length > 0 ? "textarea-error" : ""}`}
                  placeholder="Street address, suite, city, state, postal code"
                  rows={2}
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
              <div className="form-control w-full">
                <label className="label" htmlFor="customer-notes">
                  <span className="label-text font-medium">Internal Notes</span>
                </label>
                <textarea
                  id="customer-notes"
                  className={`textarea textarea-bordered w-full ${field.state.meta.errors.length > 0 ? "textarea-error" : ""}`}
                  placeholder="Key relationship details, dietary preferences, billing terms, special handling instructions"
                  rows={3}
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

        {/* Active Toggle (Edit mode only) */}
        {isEdit && (
          <div className="sm:col-span-2">
            <form.Field name="isActive">
              {(field) => (
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                    />
                    <span className="label-text font-medium">Active Customer</span>
                  </label>
                  <p className="text-xs text-base-content/60 ml-9">
                    Inactive customers remain in records for historical quotations and invoices, but are flagged in sales lookups.
                  </p>
                </div>
              )}
            </form.Field>
          </div>
        )}
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
                submitLabel ?? (isEdit ? "Save Changes" : "Create Customer")
              )}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
