"use client";

import type {
  CommunicationChannel,
  CommunicationStatus,
} from "@catering/shared-types";
import { useQuery } from "@tanstack/react-query";
import { use, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/providers/auth-provider";
import { CommunicationComposerModal } from "@/features/communications/communication-composer-modal";
import { CommunicationTable } from "@/features/communications/communication-table";
import {
  getCommunicationStats,
  listCommunications,
} from "@/lib/communications-api";

export default function CommunicationHubPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { accessToken } = useAuth();

  // Filters
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Queries
  const {
    data: listData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "communications",
      selectedChannel,
      selectedStatus,
      selectedEntityType,
      search,
    ],
    queryFn: () =>
      listCommunications(accessToken!, {
        channel: selectedChannel as any,
        status: selectedStatus as any,
        entityType: selectedEntityType as any,
        search: search.trim() || undefined,
        limit: 100,
      }),
    enabled: !!accessToken,
  });

  const { data: statsData } = useQuery({
    queryKey: ["communication-stats"],
    queryFn: () => getCommunicationStats(accessToken!),
    enabled: !!accessToken,
  });

  const stats = statsData || listData?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Communication Hub"
        description="Centralize and monitor customer communications across Email, SMS, WhatsApp, and internal logs."
        actions={
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="rounded-md bg-[#171717] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#262626] transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose Message
          </button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Total Messages
            </span>
            <div className="mt-1 text-2xl font-bold text-[#171717] font-mono">
              {stats?.total ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Logged events
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Delivered & Sent
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono">
              {(stats?.delivered ?? 0) + (stats?.sent ?? 0)}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Successful dispatches
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Pending / Drafts
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-700 font-mono">
              {stats?.pending ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Awaiting transmission
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Delivery Issues
            </span>
            <div className="mt-1 text-2xl font-bold text-rose-700 font-mono">
              {stats?.failed ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Require attention / retry
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 rounded-lg border border-[#E5E5E5] bg-white p-4">
        {/* Channel Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#F0F0F0] pb-3">
          {(
            [
              { id: "all", label: "All Channels" },
              { id: "email", label: "Email" },
              { id: "sms", label: "SMS" },
              { id: "whatsapp", label: "WhatsApp" },
              { id: "internal_note", label: "Internal Notes" },
            ] as const
          ).map((tab) => {
            const isActive = selectedChannel === tab.id;
            const count =
              tab.id === "all"
                ? stats?.total
                : stats?.byChannel?.[tab.id as keyof typeof stats.byChannel];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedChannel(tab.id)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#171717] text-white"
                    : "bg-[#FAFAFA] text-[#737373] hover:bg-[#F5F5F4] hover:text-[#171717]"
                }`}
              >
                <span>{tab.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#E5E5E5] text-[#737373]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A3A3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by recipient, subject, content, quote, or booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] pl-9 pr-3 py-1.5 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="sm:w-44">
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-hidden"
            >
              <option value="all">All Linked Entities</option>
              <option value="quotation">Quotations</option>
              <option value="booking">Bookings</option>
              <option value="enquiry">Enquiries</option>
              <option value="customer">Customers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <CommunicationTable
        items={listData?.items || []}
        tenantSlug={tenantSlug}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      {/* Composer Modal */}
      {isComposerOpen && (
        <CommunicationComposerModal
          tenantSlug={tenantSlug}
          onClose={() => setIsComposerOpen(false)}
          onCreated={() => refetch()}
        />
      )}
    </div>
  );
}
