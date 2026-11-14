"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { getCurrencySymbol } from "@/lib/currency";
import { listCustomers } from "@/lib/customers-api";
import { listBookings, getBooking } from "@/lib/bookings-api";
import {
  calculateInvoiceTotals,
  type CreateInvoiceLineItemRequest,
  type CreateInvoiceRequest,
  type InvoiceDetail,
  type UpdateInvoiceRequest,
} from "@catering/shared-types";

interface InvoiceFormProps {
  mode: "create" | "edit";
  tenantSlug: string;
  initialBookingId?: string | undefined;
  initialData?: InvoiceDetail | undefined;
  onSubmit: (data: CreateInvoiceRequest | UpdateInvoiceRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function InvoiceForm({
  mode,
  tenantSlug,
  initialBookingId,
  initialData,
  onSubmit,
  isSubmitting = false,
}: InvoiceFormProps) {
  const router = useRouter();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { currencyCode, currencySymbol, formatCurrency } = useTenantCurrency();

  // Fetch prefill booking if provided
  const { data: bookingData } = useQuery({
    queryKey: ["booking", initialBookingId],
    queryFn: () => getBooking(initialBookingId!, accessToken!),
    enabled: !!initialBookingId && !!accessToken && mode === "create",
  });

  const activeCurrency =
    initialData?.currency || bookingData?.currency || currencyCode || "INR";
  const activeSymbol = getCurrencySymbol(activeCurrency);

  // Fetch active customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => listCustomers(accessToken!, { isActive: true }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Fetch bookings for linking
  const { data: bookingsData } = useQuery({
    queryKey: ["bookings", "select"],
    queryFn: () => listBookings(accessToken!, { limit: 100 }),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  // Form states
  const [customerId, setCustomerId] = useState(
    initialData?.customerId || bookingData?.customerId || "",
  );
  const [bookingId, setBookingId] = useState(
    initialData?.bookingId || initialBookingId || "",
  );
  const [title, setTitle] = useState(
    initialData?.title ||
      (bookingData ? `Invoice for ${bookingData.title}` : ""),
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDueStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [issueDate, setIssueDate] = useState<string>(
    initialData?.issueDate
      ? initialData.issueDate.slice(0, 10)
      : todayStr,
  );
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate
      ? initialData.dueDate.slice(0, 10)
      : defaultDueStr,
  );

  const [taxRate, setTaxRate] = useState<number>(
    initialData?.taxRate ?? 0,
  );
  const [discountAmount, setDiscountAmount] = useState<number>(
    initialData?.discountAmount ?? 0,
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [terms, setTerms] = useState(
    initialData?.terms || "Payment is due within 14 days of invoice date.",
  );

  // Line items state
  const [lineItems, setLineItems] = useState<CreateInvoiceLineItemRequest[]>(
    initialData?.lineItems && initialData.lineItems.length > 0
      ? initialData.lineItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          sortOrder: item.sortOrder ?? idx,
        }))
      : [
          {
            description: "",
            quantity: 1,
            unitPrice: 0,
            notes: null,
            sortOrder: 0,
          },
        ],
  );

  // Sync if booking was fetched asynchronously
  useEffect(() => {
    if (bookingData && mode === "create" && !initialData) {
      if (!customerId) setCustomerId(bookingData.customerId);
      if (!title) setTitle(`Invoice for ${bookingData.title}`);
      if (!bookingId) setBookingId(bookingData.id);
      if (lineItems.length === 1 && lineItems[0]?.description === "") {
        setLineItems([
          {
            description: `Catering Services — ${bookingData.title}`,
            quantity: 1,
            unitPrice: bookingData.totalAmount || 0,
            notes: `Booking ${bookingData.bookingNumber}`,
            sortOrder: 0,
          },
        ]);
      }
    }
  }, [bookingData, mode, initialData]);

  // Live totals calculation
  const totals = useMemo(() => {
    return calculateInvoiceTotals(lineItems, taxRate, discountAmount);
  }, [lineItems, taxRate, discountAmount]);

  // Line item manipulation helpers
  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        notes: null,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CreateInvoiceLineItemRequest,
    val: any,
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const current = next[index] ?? {
        description: "",
        quantity: 1,
        unitPrice: 0,
        notes: null,
        sortOrder: index,
      };
      next[index] = { ...current, [field]: val };
      return next;
    });
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError("Please select a customer");
      return;
    }
    if (!title.trim()) {
      setFormError("Please provide an invoice title");
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      setFormError("All line items must have a description");
      return;
    }

    try {
      const finalIssueDate = issueDate || todayStr;
      const finalDueDate = dueDate || defaultDueStr;

      if (mode === "create") {
        const payload: CreateInvoiceRequest = {
          customerId,
          bookingId: bookingId || null,
          title: title.trim(),
          issueDate: finalIssueDate,
          dueDate: finalDueDate,
          currency: activeCurrency,
          taxRate: Number(taxRate) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          lineItems,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateInvoiceRequest = {
          customerId,
          title: title.trim(),
          issueDate: finalIssueDate,
          dueDate: finalDueDate,
          currency: activeCurrency,
          taxRate: Number(taxRate) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          lineItems,
        };
        await onSubmit(payload);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save invoice");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {formError}
        </div>
      )}

      {/* Top Details Card */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4">
          Invoice Overview & Parties
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={mode === "edit"}
              required
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none disabled:bg-[#F5F5F4]"
            >
              <option value="">Select customer...</option>
              {customersData?.data?.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name}
                </option>
              ))}
            </select>
          </div>

          {/* Linked Booking */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Linked Booking (Optional)
            </label>
            <select
              value={bookingId}
              onChange={(e) => {
                const bId = e.target.value;
                setBookingId(bId);
                const selected = bookingsData?.items.find((b) => b.id === bId);
                if (selected && !title) {
                  setTitle(`Invoice for ${selected.title}`);
                }
              }}
              disabled={mode === "edit"}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none disabled:bg-[#F5F5F4]"
            >
              <option value="">No linked booking (Standalone)</option>
              {bookingsData?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} — {b.title} ({formatCurrency(b.totalAmount)})
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Title */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Invoice Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wedding Reception Catering Services"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          {/* Issue Date */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Issue Date *
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Itemized Line Items Card */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#737373]">
              Line Items
            </h3>
            <p className="text-xs text-[#737373] mt-0.5">
              Specify billable services, catering menus, staff, or rentals.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4] flex items-center gap-1.5"
          >
            <span>+</span> Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-[#737373]">
                <th className="pb-2 font-medium w-[40%]">Description *</th>
                <th className="pb-2 font-medium w-[15%]">Qty</th>
                <th className="pb-2 font-medium w-[20%]">
                  Unit Price ({activeSymbol})
                </th>
                <th className="pb-2 font-medium w-[15%] text-right">
                  Total ({activeSymbol})
                </th>
                <th className="pb-2 font-medium w-[10%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {lineItems.map((item, index) => {
                const rowTotal =
                  Math.round(item.quantity * item.unitPrice * 100) / 100;
                return (
                  <tr key={index} className="align-top py-2">
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        required
                        placeholder="Item description or service name"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Optional notes / breakdown details..."
                        value={item.notes || ""}
                        onChange={(e) =>
                          handleItemChange(index, "notes", e.target.value)
                        }
                        className="w-full mt-1.5 text-[11px] text-[#737373] border-b border-dashed border-[#E5E5E5] focus:border-[#171717] focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs font-semibold text-[#171717]">
                      {formatCurrency(rowTotal, activeCurrency)}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        disabled={lineItems.length <= 1}
                        onClick={() => handleRemoveItem(index)}
                        className="text-[#737373] hover:text-red-600 disabled:opacity-20 px-1 py-0.5 text-sm"
                        title="Delete line"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation & Summary Footer */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-6 border-t border-[#E5E5E5] pt-4">
          <div className="w-full sm:w-1/2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Discount Amount ({activeSymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) =>
                  setDiscountAmount(parseFloat(e.target.value) || 0)
                }
                className="w-full max-w-xs rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) =>
                  setTaxRate(parseFloat(e.target.value) || 0)
                }
                className="w-full max-w-xs rounded-md border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div className="w-full sm:w-80 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] p-4 text-xs space-y-2">
            <div className="flex justify-between text-[#737373]">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-[#171717]">
                {formatCurrency(totals.subtotal, activeCurrency)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-[#737373]">
                <span>Discount:</span>
                <span className="font-mono text-emerald-700">
                  - {formatCurrency(totals.discountAmount, activeCurrency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#737373]">
              <span>Tax ({taxRate}%):</span>
              <span className="font-mono font-medium text-[#171717]">
                {formatCurrency(totals.taxAmount, activeCurrency)}
              </span>
            </div>
            <div className="border-t border-[#E5E5E5] pt-2 flex justify-between text-sm font-semibold text-[#171717]">
              <span>Grand Total:</span>
              <span className="font-mono text-base">
                {formatCurrency(totals.totalAmount, activeCurrency)}
              </span>
            </div>
            <div className="text-[11px] text-[#737373] text-right">
              Currency: <span className="font-semibold text-[#171717]">{activeCurrency} ({activeSymbol})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms Card */}
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4">
          Notes & Payment Terms
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Customer Notes
            </label>
            <textarea
              rows={3}
              placeholder="Notes printed on invoice (e.g. thank you note, event details)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Payment Terms & Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Bank account details, wire instructions, penalties for late payment..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#171717] hover:bg-[#F5F5F4]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#171717] px-6 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create Draft Invoice"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
