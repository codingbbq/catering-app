"use client";

import { useQuery } from "@tanstack/react-query";
import { getTenantQuota } from "@/lib/communications-api";
import { useAuth } from "@/providers/auth-provider";

export function TenantQuotaCard() {
  const { accessToken } = useAuth();

  const { data: quota, isLoading } = useQuery({
    queryKey: ["tenant-quota"],
    queryFn: () => getTenantQuota(accessToken || ""),
    enabled: Boolean(accessToken),
    staleTime: 60 * 1000,
  });

  if (isLoading || !quota) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-stone-100 animate-pulse rounded" />
          <div className="h-4 w-20 bg-stone-100 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-14 bg-stone-50 animate-pulse rounded" />
          <div className="h-14 bg-stone-50 animate-pulse rounded" />
          <div className="h-14 bg-stone-50 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const emailPct = Math.min(100, Math.round((quota.emailUsed / (quota.emailLimit || 1)) * 100));
  const smsPct = Math.min(100, Math.round((quota.smsUsed / (quota.smsLimit || 1)) * 100));
  const whatsappPct = Math.min(100, Math.round((quota.whatsappUsed / (quota.whatsappLimit || 1)) * 100));

  const renewalDate = new Date(quota.periodEnd).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isNearLimit = emailPct >= 80 || smsPct >= 80 || whatsappPct >= 80;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-[#F0F0F0]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#262626] uppercase tracking-wider">
              Monthly Communication Allowance
            </h3>
            {isNearLimit && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Approaching Quota
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-0.5">
            Usage resets on <span className="font-medium text-[#262626]">{renewalDate}</span>
          </p>
        </div>
        <div className="text-xs text-[#737373]">
          {quota.allowOverage ? (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              Overage billing active
            </span>
          ) : (
            <span className="text-stone-600 bg-stone-100 px-2 py-1 rounded">
              Standard quota capped
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Email Quota */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#262626] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </span>
            <span className="tabular-nums font-mono text-[#737373]">
              {quota.emailUsed} / {quota.emailLimit} ({emailPct}%)
            </span>
          </div>
          <div className="w-full bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                emailPct >= 95 ? "bg-red-500" : emailPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
              }`}
              style={{ width: `${emailPct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#737373] mt-1 tabular-nums">
            {Math.max(0, quota.emailLimit - quota.emailUsed)} emails remaining
          </p>
        </div>

        {/* SMS Quota */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#262626] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS Text
            </span>
            <span className="tabular-nums font-mono text-[#737373]">
              {quota.smsUsed} / {quota.smsLimit} ({smsPct}%)
            </span>
          </div>
          <div className="w-full bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                smsPct >= 95 ? "bg-red-500" : smsPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
              }`}
              style={{ width: `${smsPct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#737373] mt-1 tabular-nums">
            {Math.max(0, quota.smsLimit - quota.smsUsed)} SMS remaining
          </p>
        </div>

        {/* WhatsApp Quota */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#262626] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              WhatsApp
            </span>
            <span className="tabular-nums font-mono text-[#737373]">
              {quota.whatsappUsed} / {quota.whatsappLimit} ({whatsappPct}%)
            </span>
          </div>
          <div className="w-full bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                whatsappPct >= 95 ? "bg-red-500" : whatsappPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
              }`}
              style={{ width: `${whatsappPct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#737373] mt-1 tabular-nums">
            {Math.max(0, quota.whatsappLimit - quota.whatsappUsed)} WhatsApp remaining
          </p>
        </div>
      </div>
    </div>
  );
}
