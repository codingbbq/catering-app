"use client";

import React, { useEffect, useState } from "react";
import type { CreateSupplierRequest, Supplier, SupplierPaymentTerms, UpdateSupplierRequest } from "@catering/shared-types";

interface SupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSupplierRequest | UpdateSupplierRequest) => Promise<void>;
  editingSupplier: Supplier | null;
  isSubmitting: boolean;
}

const PAYMENT_TERMS_OPTIONS: Array<{ value: SupplierPaymentTerms; label: string }> = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_15", label: "Net 15 Days" },
  { value: "net_30", label: "Net 30 Days" },
  { value: "net_45", label: "Net 45 Days" },
  { value: "net_60", label: "Net 60 Days" },
];

export function SupplierDialog({
  isOpen,
  onClose,
  onSubmit,
  editingSupplier,
  isSubmitting,
}: SupplierDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<SupplierPaymentTerms>("net_30");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSupplier) {
      setCode(editingSupplier.code);
      setName(editingSupplier.name);
      setContactName(editingSupplier.contactName || "");
      setEmail(editingSupplier.email || "");
      setPhone(editingSupplier.phone || "");
      setAddress(editingSupplier.address || "");
      setTaxId(editingSupplier.taxId || "");
      setPaymentTerms(editingSupplier.paymentTerms || "net_30");
      setNotes(editingSupplier.notes || "");
    } else {
      setCode("");
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setTaxId("");
      setPaymentTerms("net_30");
      setNotes("");
    }
    setError(null);
  }, [editingSupplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Supplier code is required");
      return;
    }
    if (!name.trim()) {
      setError("Supplier name is required");
      return;
    }

    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        taxId: taxId.trim() || null,
        paymentTerms,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save supplier");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#171717]">
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </h2>
            <p className="text-xs text-[#737373]">
              Configure vendor profile, contact details, and payment credit terms
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Supplier Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUP-DAIRY-01"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs font-mono uppercase focus:border-[#171717] focus:outline-hidden"
                required
              />
              <span className="text-[11px] text-[#737373]">Unique vendor identifier</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Heritage Farm & Dairy"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Contact Person
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as SupplierPaymentTerms)}
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              >
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@supplier.example"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Tax ID / GSTIN
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs font-mono uppercase focus:border-[#171717] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717]">
                Address / Warehouse
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Market Yard, Sector 4, Nashik"
                className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717]">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery schedule cut-off time, preferred contact hours..."
              className="mt-1 w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingSupplier ? "Update Supplier" : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
