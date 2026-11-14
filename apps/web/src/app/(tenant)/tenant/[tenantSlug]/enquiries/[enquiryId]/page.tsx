"use client";

import type {
  ActivityType,
  CreateEnquiryActivityRequest,
  UpdateEnquiryRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EntityCommunicationsTimeline } from "@/features/communications/entity-communications-timeline";
import { EnquiryActivityTimeline } from "@/features/enquiries/enquiry-activity-timeline";
import { EnquiryForm } from "@/features/enquiries/enquiry-form";
import { EnquiryStatusBadge } from "@/features/enquiries/enquiry-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import {
  addEnquiryActivity,
  getEnquiry,
  qualifyEnquiry,
  updateEnquiry,
} from "@/lib/enquiries-api";
import { useAuth } from "@/providers/auth-provider";

const SERVICE_LABELS: Record<string, string> = {
  event_catering: "Event Catering",
  daily_meals: "Daily Meals",
  other: "Other / Custom",
};

export default function EnquiryDetailPage() {
  const { tenantSlug, enquiryId } = useParams<{ tenantSlug: string; enquiryId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const { formatCurrency } = useTenantCurrency();

  const [isEditing, setIsEditing] = useState(false);
  const [feedTab, setFeedTab] = useState<"activities" | "communications">("activities");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState("");

  const queryKey = ["tenant", tenantSlug, "enquiry", enquiryId];

  const { data: enquiry, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => getEnquiry(enquiryId, accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken && !!enquiryId,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateEnquiryRequest) => updateEnquiry(enquiryId, dto, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setIsEditing(false);
      setErrorMessage(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to update enquiry.");
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: () => qualifyEnquiry(enquiryId, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setErrorMessage(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to qualify enquiry.");
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: (dto: CreateEnquiryActivityRequest) =>
      addEnquiryActivity(enquiryId, dto, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to log activity.");
    },
  });

  const handleMarkLost = async () => {
    if (!lostReasonInput.trim()) return;
    await updateMutation.mutateAsync({
      status: "lost",
      lostReason: lostReasonInput.trim(),
    });
    setShowLostDialog(false);
    setLostReasonInput("");
  };

  if (!isAuthenticated || !isTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Workspace Authentication Required</h2>
        <p className="mt-1 text-xs text-[#737373]">Sign in to access this sales enquiry.</p>
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
      <div className="flex h-48 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white">
        <p className="text-xs text-[#737373]">Loading enquiry details...</p>
      </div>
    );
  }

  if (isError || !enquiry) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <p className="text-xs font-medium text-red-800">
          Enquiry not found or could not be loaded: {(error as Error)?.message || "Unknown error"}
        </p>
        <Link
          href={`/tenant/${tenantSlug}/enquiries`}
          className="inline-flex rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white"
        >
          Back to Enquiries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={enquiry.title}
        description={`Commercial enquiry for ${enquiry.customerName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tenant/${tenantSlug}/enquiries`}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA]"
            >
              ← Back
            </Link>

            {/* Quick action: Qualify */}
            {enquiry.status === "new" && (
              <button
                onClick={() => qualifyMutation.mutate()}
                disabled={qualifyMutation.isPending}
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {qualifyMutation.isPending ? "Qualifying..." : "✓ Qualify Enquiry"}
              </button>
            )}

            {/* Create Quotation */}
            {enquiry.status !== "lost" && enquiry.status !== "cancelled" && (
              <Link
                href={`/tenant/${tenantSlug}/quotations/new?enquiryId=${enquiry.id}`}
                className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
              >
                + Create Quotation
              </Link>
            )}

            {/* Quick action: Mark as Lost */}
            {enquiry.status !== "lost" && enquiry.status !== "converted" && (
              <button
                onClick={() => setShowLostDialog(true)}
                className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#737373] hover:text-red-700 hover:border-red-200 transition-colors"
              >
                Mark as Lost
              </button>
            )}

            {/* Edit details toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
            >
              {isEditing ? "Cancel Editing" : "Edit Details"}
            </button>
          </div>
        }
      />

      {/* Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E5E5E5] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#737373]">Current Status:</span>
          <EnquiryStatusBadge status={enquiry.status} />
          <span className="text-xs text-[#737373]">•</span>
          <span className="text-xs text-[#262626] font-medium">
            {SERVICE_LABELS[enquiry.serviceType] ?? enquiry.serviceType}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#737373]">
          <div>
            Created: <span className="font-mono text-[#262626]">{new Date(enquiry.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            Updated: <span className="font-mono text-[#262626]">{new Date(enquiry.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Mark as Lost Dialog / Inline Confirmation */}
      {showLostDialog && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-red-900">Mark Enquiry as Lost</h4>
          <p className="text-xs text-red-700">
            Please provide a brief reason for tracking sales performance (e.g. Price too high, chosen competitor, event postponed).
          </p>
          <input
            type="text"
            placeholder="Reason for loss..."
            value={lostReasonInput}
            onChange={(e) => setLostReasonInput(e.target.value)}
            className="w-full rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs text-[#171717] focus:outline-hidden"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowLostDialog(false)}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkLost}
              disabled={!lostReasonInput.trim() || updateMutation.isPending}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Confirm Lost"}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Details & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Details or Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <EnquiryForm
              isEdit
              initialValues={{
                customerId: enquiry.customerId,
                title: enquiry.title,
                serviceType: enquiry.serviceType,
                eventDate: enquiry.eventDate ? enquiry.eventDate.slice(0, 10) : "",
                guestCount: enquiry.guestCount !== null ? String(enquiry.guestCount) : "",
                eventType: enquiry.eventType ?? "",
                venue: enquiry.venue ?? "",
                estimatedBudget: enquiry.estimatedBudget !== null ? String(enquiry.estimatedBudget) : "",
                notes: enquiry.notes ?? "",
                nextAction: enquiry.nextAction ?? "",
                nextActionDate: enquiry.nextActionDate ? enquiry.nextActionDate.slice(0, 10) : "",
                status: enquiry.status,
                lostReason: enquiry.lostReason ?? "",
              }}
              isPending={updateMutation.isPending}
              onSubmit={async (values) => {
                await updateMutation.mutateAsync(values);
              }}
              onCancel={() => setIsEditing(false)}
              submitLabel="Save Changes"
            />
          ) : (
            <>
              {/* Event & Commercial Parameters Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Event &amp; Scope Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[11px] font-medium text-[#737373]">Target Event Date</div>
                      <div className="mt-1 font-mono text-xs font-semibold text-[#171717]">
                        {enquiry.eventDate
                          ? new Date(enquiry.eventDate).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Not scheduled yet"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-[#737373]">Estimated Guests</div>
                      <div className="mt-1 font-mono text-xs font-semibold text-[#171717]">
                        {enquiry.guestCount !== null ? `${enquiry.guestCount} pax` : "Not specified"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-[#737373]">Estimated Budget</div>
                      <div className="mt-1 font-mono text-xs font-semibold text-[#171717]">
                        {enquiry.estimatedBudget !== null
                          ? formatCurrency(enquiry.estimatedBudget)
                          : "Not specified"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-[#737373]">Event Type</div>
                      <div className="mt-1 text-xs text-[#262626]">
                        {enquiry.eventType || "—"}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-[11px] font-medium text-[#737373]">Venue / Location</div>
                      <div className="mt-1 text-xs text-[#262626]">
                        {enquiry.venue || "—"}
                      </div>
                    </div>
                  </div>

                  {enquiry.lostReason && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                      <div className="text-[11px] font-semibold text-red-800">Reason Enquiry Was Lost:</div>
                      <div className="mt-0.5 text-xs text-red-900">{enquiry.lostReason}</div>
                    </div>
                  )}

                  {enquiry.notes && (
                    <div className="pt-2 border-t border-[#F0F0F0]">
                      <div className="text-[11px] font-medium text-[#737373]">Notes &amp; Dietary Specifications</div>
                      <p className="mt-1 text-xs text-[#262626] whitespace-pre-wrap leading-relaxed">
                        {enquiry.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Step / Follow-up Action Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Next Sales Action</CardTitle>
                </CardHeader>
                <CardContent>
                  {enquiry.nextAction ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs font-medium text-[#171717]">{enquiry.nextAction}</div>
                      {enquiry.nextActionDate && (
                        <div className="font-mono text-xs text-[#737373]">
                          Due: {new Date(enquiry.nextActionDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#737373] italic">No next action set.</p>
                  )}
                </CardContent>
              </Card>

              {/* Linked Customer Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/tenant/${tenantSlug}/customers/${enquiry.customerId}`}
                        className="text-xs font-semibold text-[#171717] hover:underline"
                      >
                        {enquiry.customerName} →
                      </Link>
                      <div className="text-[11px] text-[#737373]">
                        {enquiry.customerEmail || "No email"} • {enquiry.customerPhone || "No phone"}
                      </div>
                    </div>
                    <Link
                      href={`/tenant/${tenantSlug}/customers/${enquiry.customerId}`}
                      className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA]"
                    >
                      View Profile
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right Column: Activity Feed & Communications */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex border-b border-[#E5E5E5] bg-white rounded-lg p-1">
            <button
              type="button"
              onClick={() => setFeedTab("activities")}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                feedTab === "activities"
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Activities & Notes
            </button>
            <button
              type="button"
              onClick={() => setFeedTab("communications")}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                feedTab === "communications"
                  ? "bg-[#171717] text-white"
                  : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              Communications
            </button>
          </div>

          {feedTab === "activities" ? (
            <EnquiryActivityTimeline
              activities={enquiry.activities}
              onAddActivity={async (data) => {
                await addActivityMutation.mutateAsync(data);
              }}
              isPending={addActivityMutation.isPending}
            />
          ) : (
            <EntityCommunicationsTimeline
              tenantSlug={tenantSlug}
              entityType="enquiry"
              entityId={enquiry.id}
              entityLabel={enquiry.title}
              customerName={enquiry.customerName}
              recipientEmail={enquiry.customerEmail ?? undefined}
              recipientPhone={enquiry.customerPhone ?? undefined}
              eventDate={enquiry.eventDate ?? undefined}
              venue={enquiry.venue ?? undefined}
              amount={enquiry.estimatedBudget ? Number(enquiry.estimatedBudget) : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
