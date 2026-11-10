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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <Link
          href={`/tenant/${tenantSlug}/sign-in`}
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        <p className="text-xs text-[#737373]">Loading customer profile...</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <div className="rounded border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          {error instanceof Error ? error.message : "Customer not found."}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5]"
            onClick={() => void refetch()}
          >
            Retry
          </button>
          <Link
            href={`/tenant/${tenantSlug}/customers`}
            className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
          >
            &larr; Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description="Client account details, communication records, and associated contact persons."
        backHref={`/tenant/${tenantSlug}/customers`}
        backLabel="Back to Customers"
        badge={
          <StatusBadge variant={customer.isActive ? "success" : "neutral"}>
            {customer.isActive ? "Active Account" : "Inactive Account"}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
              onClick={() => setIsEditingCustomer(true)}
            >
              Edit Account
            </button>
            <button
              type="button"
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
              onClick={() => {
                setErrorMessage(null);
                updateCustomerMutation.mutate({ isActive: !customer.isActive });
              }}
              disabled={updateCustomerMutation.isPending}
            >
              {customer.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        }
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="text-xs font-medium underline hover:no-underline"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                    Main Email
                  </span>
                  <div className="mt-1 font-mono text-sm text-[#262626]">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    ) : (
                      <span className="text-[#A3A3A3] italic">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                    Main Phone
                  </span>
                  <div className="mt-1 text-sm text-[#262626]">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-[#A3A3A3] italic">—</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[#F0F0F0]">
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                    Address
                  </span>
                  <div className="mt-1 text-xs text-[#262626] whitespace-pre-line">
                    {customer.address || <span className="text-[#A3A3A3] italic">—</span>}
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[#F0F0F0]">
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-[#737373]">
                    Internal Notes &amp; Preferences
                  </span>
                  <div className="mt-1 rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-xs text-[#262626] whitespace-pre-line">
                    {customer.notes || (
                      <span className="text-[#A3A3A3] italic">No internal relationship notes recorded.</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Contact Persons</CardTitle>
                <CardDescription>Planners, coordinators, and billing contacts for this account.</CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingContact(true)}
                className="inline-flex items-center gap-1 rounded bg-[#171717] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                + Add Contact
              </button>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Total Contacts</span>
                <span className="font-medium text-[#171717]">{customer.contactCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Status</span>
                <StatusBadge variant={customer.isActive ? "success" : "neutral"} showDot={true}>
                  {customer.isActive ? "Active" : "Inactive"}
                </StatusBadge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Customer ID</span>
                <span className="font-mono text-[11px] text-[#737373] truncate max-w-[120px]">
                  {customer.id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Account Created</span>
                <span className="text-[#171717]">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Last Updated</span>
                <span className="text-[#171717]">{new Date(customer.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
              Operational Lifecycle
            </h4>
            <p className="text-xs text-[#737373] leading-relaxed">
              This client account can be referenced across event enquiries, custom menu proposals, and catering quotations.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
            onClick={() => setIsEditingCustomer(false)}
          />
          <div className="relative w-full max-w-xl rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-lg">
            <h3 className="text-base font-semibold text-[#171717] mb-4">Edit Customer Account</h3>
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
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
            onClick={() => setIsAddingContact(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-lg">
            <h3 className="text-base font-semibold text-[#171717] mb-4">Add Contact Person</h3>
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
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
            onClick={() => setEditingContact(null)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-lg">
            <h3 className="text-base font-semibold text-[#171717] mb-4">Edit Contact Person</h3>
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
        </div>
      )}
    </div>
  );
}
