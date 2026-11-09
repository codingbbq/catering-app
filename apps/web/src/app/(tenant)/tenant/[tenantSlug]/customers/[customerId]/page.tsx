"use client";

import type {
  CreateContactRequest,
  CustomerContact,
  UpdateContactRequest,
  UpdateCustomerRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ContactForm } from "@/features/customers/contact-form";
import { ContactTable } from "@/features/customers/contact-table";
import { CustomerForm } from "@/features/customers/customer-form";
import {
  addCustomerContact,
  getCustomer,
  updateCustomer,
  updateCustomerContact,
} from "@/lib/customers-api";
import { useAuth } from "@/providers/auth-provider";

export default function CustomerDetailPage() {
  const { tenantSlug, customerId } = useParams<{ tenantSlug: string; customerId: string }>();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isTenant } = useAuth();

  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = ["tenant", tenantSlug, "customer", customerId];

  const {
    data: customer,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getCustomer(customerId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!customerId,
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (dto: UpdateCustomerRequest) => updateCustomer(customerId, dto, accessToken!),
    onSuccess: () => {
      setIsEditingCustomer(false);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "customers"] });
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update customer.");
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (dto: CreateContactRequest) => addCustomerContact(customerId, dto, accessToken!),
    onSuccess: () => {
      setIsAddingContact(false);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "customers"] });
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to add contact.");
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, dto }: { contactId: string; dto: UpdateContactRequest }) =>
      updateCustomerContact(customerId, contactId, dto, accessToken!),
    onSuccess: () => {
      setEditingContact(null);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenant", tenantSlug, "customers"] });
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update contact.");
    },
  });

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Tenant access required</h2>
        <Link href={`/tenant/${tenantSlug}/sign-in`} className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <span className="loading loading-spinner loading-md text-primary" />
        <p className="text-sm text-base-content/60">Loading customer details...</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-12 text-center">
        <div className="alert alert-error text-sm">
          <span>{error instanceof Error ? error.message : "Customer not found."}</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void refetch()}>
            Retry
          </button>
          <Link href={`/tenant/${tenantSlug}/customers`} className="btn btn-primary btn-sm">
            &larr; Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Page Header */}
      <div>
        <Link
          href={`/tenant/${tenantSlug}/customers`}
          className="btn btn-ghost btn-sm -ml-2 mb-2 gap-1 text-base-content/70"
        >
          &larr; Back to Customers
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            <span
              className={`badge badge-sm ${
                customer.isActive
                  ? "badge-success text-success-content"
                  : "badge-ghost opacity-60"
              }`}
            >
              {customer.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setIsEditingCustomer(true)}
            >
              Edit Customer
            </button>
            <button
              type="button"
              className={`btn btn-sm ${customer.isActive ? "btn-ghost text-error" : "btn-success btn-outline"}`}
              onClick={() => {
                setErrorMessage(null);
                updateCustomerMutation.mutate({ isActive: !customer.isActive });
              }}
              disabled={updateCustomerMutation.isPending}
            >
              {customer.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="alert alert-error text-sm">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Customer Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Account Information */}
        <div className="md:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-6">
              <h3 className="text-base font-semibold border-b border-base-200 pb-3">
                Account Details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    Main Email
                  </div>
                  <div className="mt-1 text-sm font-mono">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                        {customer.email}
                      </a>
                    ) : (
                      <span className="text-base-content/40 italic">Not provided</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    Main Phone
                  </div>
                  <div className="mt-1 text-sm">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-base-content/40 italic">Not provided</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    Address
                  </div>
                  <div className="mt-1 text-sm whitespace-pre-line">
                    {customer.address || (
                      <span className="text-base-content/40 italic">Not provided</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    Internal Relationship Notes
                  </div>
                  <div className="mt-1 text-sm rounded-lg bg-base-200/50 p-3 whitespace-pre-line">
                    {customer.notes || (
                      <span className="text-base-content/40 italic">
                        No internal notes recorded for this customer yet.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between border-b border-base-200 pb-3">
                <div>
                  <h3 className="text-base font-semibold">Contact Persons</h3>
                  <p className="text-xs text-base-content/60">
                    Planners, organizers, and billing contacts representing this customer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(true)}
                  className="btn btn-primary btn-xs gap-1"
                >
                  + Add Contact
                </button>
              </div>

              <div className="pt-4">
                <ContactTable
                  data={customer.contacts}
                  onEditContact={(contact) => setEditingContact(contact)}
                  onSetPrimary={(contact) => {
                    setErrorMessage(null);
                    updateContactMutation.mutate({
                      contactId: contact.id,
                      dto: { isPrimary: true },
                    });
                  }}
                  isActionPending={updateContactMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Quick Actions */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-5 space-y-3">
              <h3 className="text-sm font-semibold border-b border-base-200 pb-2">
                Metadata &amp; Commercial Summary
              </h3>

              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/60">Total Contacts</span>
                <span className="font-semibold">{customer.contactCount}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/60">Account Status</span>
                <span className="font-semibold">{customer.isActive ? "Active" : "Inactive"}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/60">Customer Since</span>
                <span className="font-medium">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/60">Last Updated</span>
                <span className="font-medium">
                  {new Date(customer.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Context Card */}
          <div className="card bg-base-200/50 border border-base-200">
            <div className="card-body p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                Sales Pipeline Integration
              </h4>
              <p className="text-xs text-base-content/70 mt-1">
                This customer account can be linked directly when logging enquiries (CRM-002) and preparing quotations (QTN-001).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditingCustomer && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h3 className="text-lg font-bold mb-4">Edit Customer Account</h3>
            <CustomerForm
              initialValues={{
                name: customer.name,
                email: customer.email ?? "",
                phone: customer.phone ?? "",
                address: customer.address ?? "",
                notes: customer.notes ?? "",
                isActive: customer.isActive,
              }}
              isEdit
              isPending={updateCustomerMutation.isPending}
              onSubmit={(values) => {
                setErrorMessage(null);
                updateCustomerMutation.mutate(values);
              }}
              onCancel={() => setIsEditingCustomer(false)}
              submitLabel="Save Changes"
            />
          </div>
          <div
            className="modal-backdrop bg-black/40"
            onClick={() => setIsEditingCustomer(false)}
          />
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Contact Person</h3>
            <ContactForm
              initialValues={{
                isPrimary: customer.contacts.length === 0,
              }}
              isPending={addContactMutation.isPending}
              onSubmit={(values) => {
                setErrorMessage(null);
                addContactMutation.mutate(values);
              }}
              onCancel={() => setIsAddingContact(false)}
              submitLabel="Add Contact"
            />
          </div>
          <div
            className="modal-backdrop bg-black/40"
            onClick={() => setIsAddingContact(false)}
          />
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Contact Person</h3>
            <ContactForm
              initialValues={{
                name: editingContact.name,
                email: editingContact.email ?? "",
                phone: editingContact.phone ?? "",
                role: editingContact.role ?? "",
                isPrimary: editingContact.isPrimary,
              }}
              isEdit
              isPending={updateContactMutation.isPending}
              onSubmit={(values) => {
                setErrorMessage(null);
                updateContactMutation.mutate({
                  contactId: editingContact.id,
                  dto: values,
                });
              }}
              onCancel={() => setEditingContact(null)}
              submitLabel="Save Contact"
            />
          </div>
          <div
            className="modal-backdrop bg-black/40"
            onClick={() => setEditingContact(null)}
          />
        </div>
      )}
    </div>
  );
}
