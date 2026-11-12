"use client";

import type {
  CommunicationChannel,
  CommunicationTemplateItem,
  CreateCommunicationRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  createCommunication,
  getCommunicationTemplates,
} from "@/lib/communications-api";
import { ChannelIcon } from "./communication-channel-badge";

interface ContextEntity {
  type: "enquiry" | "quotation" | "booking" | "customer";
  id: string;
  label?: string;
  customerName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  quotationNumber?: string;
  bookingNumber?: string;
  eventDate?: string;
  venue?: string;
  amount?: number;
}

interface CommunicationComposerModalProps {
  tenantSlug: string;
  initialContext?: ContextEntity;
  onClose: () => void;
  onCreated?: () => void;
}

export function CommunicationComposerModal({
  tenantSlug,
  initialContext,
  onClose,
  onCreated,
}: CommunicationComposerModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { currency, formatCurrency } = useTenantCurrency();

  // Form State
  const [channel, setChannel] = useState<CommunicationChannel>("email");
  const [recipient, setRecipient] = useState(
    initialContext?.recipientEmail || initialContext?.recipientPhone || "",
  );
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Load Templates
  const { data: templates } = useQuery({
    queryKey: ["communication-templates"],
    queryFn: () => getCommunicationTemplates(accessToken!),
    enabled: !!accessToken,
  });

  // Channel switch helper: adjust recipient prefill if available
  const handleChannelChange = (newChannel: CommunicationChannel) => {
    setChannel(newChannel);
    if (newChannel === "email" && initialContext?.recipientEmail) {
      setRecipient(initialContext.recipientEmail);
    } else if (
      (newChannel === "sms" || newChannel === "whatsapp") &&
      initialContext?.recipientPhone
    ) {
      setRecipient(initialContext.recipientPhone);
    }
  };

  // Interpolate placeholders
  const applyTemplate = (template: CommunicationTemplateItem) => {
    let sub = template.subject || "";
    let body = template.body;

    const customerName = initialContext?.customerName || "Valued Customer";
    const quoteNum = initialContext?.quotationNumber || "QTN-XXXX";
    const bkgNum = initialContext?.bookingNumber || "BK-XXXX";
    const evDate = initialContext?.eventDate
      ? new Date(initialContext.eventDate).toLocaleDateString()
      : "Upcoming Service";
    const venueName = initialContext?.venue || "Your Selected Venue";
    const amountStr = initialContext?.amount
      ? formatCurrency(initialContext.amount)
      : `${currency} 0.00`;

    const replacePlaceholders = (text: string) => {
      return text
        .replace(/\{\{customer_name\}\}/g, customerName)
        .replace(/\{\{quotation_number\}\}/g, quoteNum)
        .replace(/\{\{booking_number\}\}/g, bkgNum)
        .replace(/\{\{event_date\}\}/g, evDate)
        .replace(/\{\{venue\}\}/g, venueName)
        .replace(/\{\{amount\}\}/g, amountStr)
        .replace(/\{\{currency\}\}/g, currency);
    };

    setSubject(replacePlaceholders(sub));
    setContent(replacePlaceholders(body));
  };

  const createMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!accessToken) throw new Error("Not authenticated");
      if (!recipient.trim()) throw new Error("Please specify a recipient email or phone.");
      if (!content.trim()) throw new Error("Please provide message content.");

      const payload: CreateCommunicationRequest = {
        channel,
        recipient: recipient.trim(),
        subject: subject.trim() || undefined,
        content: content.trim(),
        isDraft,
        customerId:
          initialContext?.type === "customer" ? initialContext.id : undefined,
        enquiryId:
          initialContext?.type === "enquiry" ? initialContext.id : undefined,
        quotationId:
          initialContext?.type === "quotation" ? initialContext.id : undefined,
        bookingId:
          initialContext?.type === "booking" ? initialContext.id : undefined,
      };

      return createCommunication(payload, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      queryClient.invalidateQueries({ queryKey: ["communication-stats"] });
      queryClient.invalidateQueries({ queryKey: ["entity-communications"] });
      queryClient.invalidateQueries({ queryKey: ["enquiry"] });
      queryClient.invalidateQueries({ queryKey: ["quotation"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      onCreated?.();
      onClose();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to process communication.");
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-[#E5E5E5] bg-white shadow-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">
              Compose Communication
            </h3>
            <p className="text-xs text-[#737373]">
              Send multichannel customer updates or record internal notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {formError}
            </div>
          )}

          {/* Context Badge if bound to entity */}
          {initialContext && (
            <div className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#737373]">
                Target Context:{" "}
                <span className="font-semibold text-[#171717] capitalize">
                  {initialContext.type}
                </span>{" "}
                {initialContext.label && (
                  <span className="font-mono text-[#171717]">({initialContext.label})</span>
                )}
              </span>
              {initialContext.customerName && (
                <span className="text-[#737373]">
                  Customer: <span className="font-medium text-[#171717]">{initialContext.customerName}</span>
                </span>
              )}
            </div>
          )}

          {/* Channel Selector */}
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1.5">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "email", label: "Email" },
                  { id: "sms", label: "SMS" },
                  { id: "whatsapp", label: "WhatsApp" },
                  { id: "internal_note", label: "Internal Note" },
                ] as const
              ).map((ch) => {
                const isSelected = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleChannelChange(ch.id)}
                    className={`flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-[#171717] bg-[#171717] text-white"
                        : "border-[#E5E5E5] bg-white text-[#262626] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <ChannelIcon channel={ch.id} className="w-4 h-4" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Picker */}
          {templates && templates.length > 0 && channel !== "internal_note" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#171717]">
                  Load From Template (Optional)
                </label>
                <span className="text-[11px] text-[#737373]">
                  Auto-fills message & merges variables
                </span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const tId = e.target.value;
                  setSelectedTemplateId(tId);
                  const found = templates.find((t) => t.id === tId);
                  if (found) {
                    setChannel(found.channel);
                    applyTemplate(found);
                  }
                }}
                className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
              >
                <option value="">-- Choose a standard message template --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.channel.toUpperCase()}] {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Recipient {channel === "email" ? "Email Address" : channel === "internal_note" ? "Target Reference" : "Phone Number"}
            </label>
            <input
              type={channel === "email" ? "email" : "text"}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                channel === "email"
                  ? "e.g. client@example.com"
                  : channel === "internal_note"
                  ? "e.g. Operations Log"
                  : "+1 (555) 000-0000"
              }
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          {/* Subject (for email or note) */}
          {(channel === "email" || channel === "internal_note") && (
            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quotation details for your upcoming catering"
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
              />
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Message Body
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#FAFAFA] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(true)}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] disabled:opacity-50 transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(false)}
              className="rounded-md bg-[#171717] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
