"use client";

import type {
  CommunicationChannel,
  CommunicationTemplateItem,
  CreateCommunicationRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  createCommunication,
  getCommunicationTemplates,
} from "@/lib/communications-api";
import { ChannelIcon } from "./communication-channel-badge";

export interface ContextEntityInfo {
  type?: "enquiry" | "quotation" | "booking" | "customer" | undefined;
  id?: string | undefined;
  label?: string | undefined;
  customerName?: string | undefined;
  recipientEmail?: string | undefined;
  recipientPhone?: string | undefined;
  quotationNumber?: string | undefined;
  bookingNumber?: string | undefined;
  eventDate?: string | undefined;
  venue?: string | undefined;
  amount?: number | undefined;
}

interface CommunicationComposerFormProps {
  tenantSlug: string;
  initialContext?: ContextEntityInfo | undefined;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommunicationComposerForm({
  tenantSlug,
  initialContext,
  onSuccess,
  onCancel,
}: CommunicationComposerFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { currencyCode, formatCurrency } = useTenantCurrency();

  // Form State
  const [channel, setChannel] = useState<CommunicationChannel>("email");
  const [recipient, setRecipient] = useState(
    initialContext?.recipientEmail || initialContext?.recipientPhone || "",
  );
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Load Templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
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
    const sub = template.subject || "";
    const body = template.body;

    const customerName = initialContext?.customerName || "Valued Customer";
    const quoteNum = initialContext?.quotationNumber || "QTN-XXXX";
    const bkgNum = initialContext?.bookingNumber || "BK-XXXX";
    const evDate = initialContext?.eventDate
      ? new Date(initialContext.eventDate).toLocaleDateString()
      : "Upcoming Service";
    const venueName = initialContext?.venue || "Your Selected Venue";
    const amountStr = initialContext?.amount
      ? formatCurrency(initialContext.amount)
      : `${currencyCode} 0.00`;

    const replacePlaceholders = (text: string) => {
      return text
        .replace(/\{\{customer_name\}\}/g, customerName)
        .replace(/\{\{quotation_number\}\}/g, quoteNum)
        .replace(/\{\{booking_number\}\}/g, bkgNum)
        .replace(/\{\{event_date\}\}/g, evDate)
        .replace(/\{\{venue\}\}/g, venueName)
        .replace(/\{\{amount\}\}/g, amountStr)
        .replace(/\{\{currency\}\}/g, currencyCode);
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
        sender: sender.trim() || undefined,
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
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/tenant/${tenantSlug}/communications`);
      }
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to process communication.");
    },
  });

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/tenant/${tenantSlug}/communications`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Message Details & Channel Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {formError}
          </div>
        )}

        {/* Linked Context Notice if pre-filled */}
        {initialContext?.type && initialContext.id && (
          <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[#737373]">
                Linked Context:{" "}
                <span className="font-semibold text-[#171717] capitalize">
                  {initialContext.type}
                </span>{" "}
                {initialContext.label && (
                  <span className="font-mono text-[#171717]">({initialContext.label})</span>
                )}
              </span>
              {initialContext.customerName && (
                <div className="text-[#737373] text-[11px]">
                  Customer: <span className="font-medium text-[#171717]">{initialContext.customerName}</span>
                </div>
              )}
            </div>
            {initialContext.amount != null && (
              <div className="font-mono text-xs font-semibold text-[#171717] bg-white border border-[#E5E5E5] px-2.5 py-1 rounded">
                Amount: {formatCurrency(initialContext.amount)}
              </div>
            )}
          </div>
        )}

        {/* Channel Selection Buttons */}
        <div>
          <label className="text-xs font-semibold text-[#171717] block mb-2">
            Communication Channel
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { id: "email", label: "Email", desc: "Formal proposal, invoice, update" },
                { id: "sms", label: "SMS", desc: "Urgent mobile dispatch reminder" },
                { id: "whatsapp", label: "WhatsApp", desc: "Interactive client chatting" },
                { id: "internal_note", label: "Internal Note", desc: "Kitchen & ops team memo" },
              ] as const
            ).map((ch) => {
              const isSelected = channel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleChannelChange(ch.id)}
                  className={`flex flex-col text-left rounded-lg border p-3 text-xs transition-colors ${
                    isSelected
                      ? "border-[#171717] bg-[#171717] text-white"
                      : "border-[#E5E5E5] bg-white text-[#262626] hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelIcon channel={ch.id} className="w-4 h-4" />
                    <span className="font-medium">{ch.label}</span>
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
                      isSelected ? "text-neutral-300" : "text-[#737373]"
                    }`}
                  >
                    {ch.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Selector */}
        {channel !== "internal_note" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#171717]">
                Quick Template (Optional)
              </label>
              <span className="text-[11px] text-[#737373]">
                Auto-fills message body and substitutes dynamic tags
              </span>
            </div>
            <select
              value={selectedTemplateId}
              disabled={loadingTemplates}
              onChange={(e) => {
                const tId = e.target.value;
                setSelectedTemplateId(tId);
                const found = templates?.find((t) => t.id === tId);
                if (found) {
                  setChannel(found.channel);
                  applyTemplate(found);
                }
              }}
              className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            >
              <option value="">-- Choose a pre-configured template --</option>
              {templates?.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  [{tpl.channel.toUpperCase()}] {tpl.name} ({tpl.category})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sender & Recipient Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Recipient {channel === "email" ? "Email Address" : channel === "internal_note" ? "Department / Stakeholder" : "Phone Number"}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              type={channel === "email" ? "email" : "text"}
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                channel === "email"
                  ? "e.g. client@example.com"
                  : channel === "internal_note"
                  ? "e.g. Executive Chef & Ops Team"
                  : "+1 (555) 019-2831"
              }
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Sender Display Name (Optional)
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. Catering Sales Desk"
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Subject (for email / note) */}
        {(channel === "email" || channel === "internal_note") && (
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quotation QT-202611-0001 for Upcoming Annual Banquet"
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>
        )}

        {/* Message Content Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[#171717]">
              Message Content <span className="text-rose-600">*</span>
            </label>
            <span className="text-[11px] text-[#737373] font-mono">
              {content.length} characters
            </span>
          </div>
          <textarea
            rows={8}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your communication message here..."
            className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden font-sans leading-relaxed"
          />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#FAFAFA] p-4">
        <button
          type="button"
          onClick={handleCancelClick}
          className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={createMutation.isPending || !content.trim() || !recipient.trim()}
            onClick={() => createMutation.mutate(true)}
            className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] disabled:opacity-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={createMutation.isPending || !content.trim() || !recipient.trim()}
            onClick={() => createMutation.mutate(false)}
            className="rounded-md bg-[#171717] px-5 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
