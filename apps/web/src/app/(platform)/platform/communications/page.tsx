"use client";

import type {
  PlatformCommunicationConfigDto,
  PlatformCommunicationUsageSummary,
  TenantQuotaOverviewItem,
  UpdatePlatformCommunicationConfigRequest,
  UpdateTenantQuotaRequest,
} from "@catering/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getPlatformCommunicationConfig,
  getPlatformTenantQuotas,
  getPlatformUsageSummary,
  testGatewayConnection,
  updatePlatformCommunicationConfig,
  updateTenantQuota,
} from "@/lib/communications-api";
import { useAuth } from "@/providers/auth-provider";

export default function PlatformCommunicationsPage() {
  const { accessToken, isAuthenticated, isPlatform } = useAuth();
  const queryClient = useQueryClient();

  // Test Connection States
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [testTwilioRecipient, setTestTwilioRecipient] = useState("");
  const [testResult, setTestResult] = useState<{
    gateway: "resend" | "twilio";
    success: boolean;
    message: string;
  } | null>(null);

  // Gateway Config Form States
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [resendFromName, setResendFromName] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [twilioWhatsappNumber, setTwilioWhatsappNumber] = useState("");
  const [configFormInitialized, setConfigFormInitialized] = useState(false);

  // Edit Tenant Quota Modal States
  const [editingTenant, setEditingTenant] = useState<TenantQuotaOverviewItem | null>(null);
  const [editEmailLimit, setEditEmailLimit] = useState(1000);
  const [editSmsLimit, setEditSmsLimit] = useState(100);
  const [editWhatsappLimit, setEditWhatsappLimit] = useState(200);
  const [editAllowOverage, setEditAllowOverage] = useState(false);
  const [editOverageEmail, setEditOverageEmail] = useState(0.01);
  const [editOverageSms, setEditOverageSms] = useState(0.03);
  const [editOverageWhatsapp, setEditOverageWhatsapp] = useState(0.05);

  // Queries
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ["platform-communication-config"],
    queryFn: () => getPlatformCommunicationConfig(accessToken!),
    enabled: isAuthenticated && isPlatform && Boolean(accessToken),
  });

  // Populate form fields once config is fetched
  if (config && !configFormInitialized) {
    setMode(config.mode);
    setResendFromEmail(config.resendFromEmail || "");
    setResendFromName(config.resendFromName || "");
    setTwilioPhoneNumber(config.twilioPhoneNumber || "");
    setTwilioWhatsappNumber(config.twilioWhatsappNumber || "");
    setConfigFormInitialized(true);
  }

  const { data: usageSummary, isLoading: isUsageLoading } = useQuery({
    queryKey: ["platform-usage-summary"],
    queryFn: () => getPlatformUsageSummary(accessToken!),
    enabled: isAuthenticated && isPlatform && Boolean(accessToken),
  });

  const { data: tenantQuotas, isLoading: isQuotasLoading } = useQuery({
    queryKey: ["platform-tenant-quotas"],
    queryFn: () => getPlatformTenantQuotas(accessToken!),
    enabled: isAuthenticated && isPlatform && Boolean(accessToken),
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: (dto: UpdatePlatformCommunicationConfigRequest) =>
      updatePlatformCommunicationConfig(dto, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-communication-config"], updated);
      queryClient.invalidateQueries({ queryKey: ["platform-communication-config"] });
      alert("Gateway configuration successfully saved.");
    },
    onError: (err: any) => {
      alert(`Failed to save configuration: ${err.message || "Unknown error"}`);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: ({
      gateway,
      testRecipient,
    }: {
      gateway: "resend" | "twilio";
      testRecipient: string;
    }) => testGatewayConnection({ gateway, testRecipient }, accessToken!),
    onSuccess: (data) => {
      setTestResult({
        gateway: data.gateway,
        success: data.success,
        message: data.message,
      });
    },
    onError: (err: any) => {
      setTestResult({
        gateway: "resend",
        success: false,
        message: err.message || "Test dispatch request failed",
      });
    },
  });

  const updateQuotaMutation = useMutation({
    mutationFn: ({
      tenantId,
      dto,
    }: {
      tenantId: string;
      dto: UpdateTenantQuotaRequest;
    }) => updateTenantQuota(tenantId, dto, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-quotas"] });
      setEditingTenant(null);
    },
    onError: (err: any) => {
      alert(`Failed to update quota: ${err.message || "Unknown error"}`);
    },
  });

  if (!isAuthenticated || !isPlatform) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-base font-semibold text-[#171717]">Super Admin Privileges Required</h2>
        <p className="mt-1 text-xs text-[#737373]">
          Sign in as a platform super administrator to configure communications gateways and tenant quotas.
        </p>
        <Link
          href="/platform/sign-in"
          className="mt-4 inline-flex items-center justify-center rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdatePlatformCommunicationConfigRequest = {
      mode,
      resendFromEmail: resendFromEmail.trim() || undefined,
      resendFromName: resendFromName.trim() || undefined,
      twilioPhoneNumber: twilioPhoneNumber.trim() || undefined,
      twilioWhatsappNumber: twilioWhatsappNumber.trim() || undefined,
    };
    if (resendApiKey.trim()) payload.resendApiKey = resendApiKey.trim();
    if (twilioAccountSid.trim()) payload.twilioAccountSid = twilioAccountSid.trim();
    if (twilioAuthToken.trim()) payload.twilioAuthToken = twilioAuthToken.trim();

    updateConfigMutation.mutate(payload);
  };

  const handleOpenEditQuota = (item: TenantQuotaOverviewItem) => {
    setEditingTenant(item);
    setEditEmailLimit(item.quota.emailLimit);
    setEditSmsLimit(item.quota.smsLimit);
    setEditWhatsappLimit(item.quota.whatsappLimit);
    setEditAllowOverage(item.quota.allowOverage);
    setEditOverageEmail(item.quota.overageRateEmail);
    setEditOverageSms(item.quota.overageRateSms);
    setEditOverageWhatsapp(item.quota.overageRateWhatsapp);
  };

  const handleSaveTenantQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    updateQuotaMutation.mutate({
      tenantId: editingTenant.tenantId,
      dto: {
        emailLimit: editEmailLimit,
        smsLimit: editSmsLimit,
        whatsappLimit: editWhatsappLimit,
        allowOverage: editAllowOverage,
        overageRateEmail: editOverageEmail,
        overageRateSms: editOverageSms,
        overageRateWhatsapp: editOverageWhatsapp,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication Gateways & Quotas"
        description="Configure live delivery providers (Resend for Email, Twilio for SMS & WhatsApp), inspect message consumption, and govern tenant monthly quotas."
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                config?.mode === "live"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                  : "bg-stone-100 text-stone-800 border border-stone-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  config?.mode === "live" ? "bg-emerald-600 animate-pulse" : "bg-stone-500"
                }`}
              />
              Mode: {config?.mode === "live" ? "LIVE DISPATCH" : "MOCK (SIMULATED)"}
            </span>
          </div>
        }
      />

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Platform Emails
            </span>
            <div className="mt-1 text-2xl font-bold text-[#171717] font-mono">
              {usageSummary?.totalEmailsSent ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Via Resend / Mock
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Platform SMS
            </span>
            <div className="mt-1 text-2xl font-bold text-[#171717] font-mono">
              {usageSummary?.totalSmsSent ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Via Twilio SMS
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Platform WhatsApp
            </span>
            <div className="mt-1 text-2xl font-bold text-[#171717] font-mono">
              {usageSummary?.totalWhatsappSent ?? 0}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Via Twilio WhatsApp
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Est. Provider Cost
            </span>
            <div className="mt-1 text-2xl font-bold text-[#171717] font-mono">
              ${(usageSummary?.totalCostEstimate ?? 0).toFixed(2)}
            </div>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5 block">
              Across {usageSummary?.totalTenantsActive ?? 0} active tenants
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Configuration & Testing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b border-[#F0F0F0]">
              <CardTitle className="text-sm font-semibold text-[#171717] uppercase tracking-wider">
                Platform Master Gateway Credentials
              </CardTitle>
              <p className="text-xs text-[#737373]">
                These credentials power all tenant communications across the platform. In Mock mode, no external API calls or charges occur.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveConfig} className="space-y-5">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#262626] mb-1.5">
                    Dispatch Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        mode === "mock"
                          ? "border-[#171717] bg-stone-50"
                          : "border-[#E5E5E5] hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="mock"
                        checked={mode === "mock"}
                        onChange={() => setMode("mock")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-[#171717]">
                          Mock Simulation (Zero Cost)
                        </span>
                        <span className="block text-[11px] text-[#737373] mt-0.5">
                          Simulates successful delivery locally. Safe for development and CI testing.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        mode === "live"
                          ? "border-[#171717] bg-stone-50"
                          : "border-[#E5E5E5] hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="live"
                        checked={mode === "live"}
                        onChange={() => setMode("live")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-[#171717]">
                          Live Dispatch (Resend + Twilio)
                        </span>
                        <span className="block text-[11px] text-[#737373] mt-0.5">
                          Dispatches real emails via Resend and real SMS/WhatsApp via Twilio API.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Resend Settings */}
                <div className="border border-[#E5E5E5] rounded-lg p-4 bg-[#FAFAFA] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#171717]">
                        Resend (Email Gateway)
                      </span>
                      {config?.isEmailConfigured ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                          Configured
                        </span>
                      ) : (
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-medium">
                          Not set
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#737373]">
                      Current Key: {config?.resendApiKeyMasked || "None"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-[#737373] mb-1">
                        Resend API Key {config?.resendApiKeyMasked && "(Leave blank to keep existing)"}
                      </label>
                      <input
                        type="password"
                        placeholder={config?.resendApiKeyMasked || "re_1234567890abcdef..."}
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">From Email Address</label>
                      <input
                        type="email"
                        placeholder="onboarding@resend.dev"
                        value={resendFromEmail}
                        onChange={(e) => setResendFromEmail(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Sender Display Name</label>
                      <input
                        type="text"
                        placeholder="Catering Operations"
                        value={resendFromName}
                        onChange={(e) => setResendFromName(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Twilio Settings */}
                <div className="border border-[#E5E5E5] rounded-lg p-4 bg-[#FAFAFA] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#171717]">
                        Twilio (SMS & WhatsApp Gateway)
                      </span>
                      {config?.isSmsConfigured ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                          Configured
                        </span>
                      ) : (
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-medium">
                          Not set
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#737373]">
                      SID: {config?.twilioAccountSidMasked || "None"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Account SID</label>
                      <input
                        type="text"
                        placeholder={config?.twilioAccountSidMasked || "AC1234567890..."}
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">
                        Auth Token {config?.twilioAuthTokenMasked && "(Leave blank to keep existing)"}
                      </label>
                      <input
                        type="password"
                        placeholder={config?.twilioAuthTokenMasked || "auth_token_xyz..."}
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">SMS Phone Number</label>
                      <input
                        type="text"
                        placeholder="+15550192831"
                        value={twilioPhoneNumber}
                        onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">WhatsApp Sender Number</label>
                      <input
                        type="text"
                        placeholder="+14155238886 (or twilio sandbox)"
                        value={twilioWhatsappNumber}
                        onChange={(e) => setTwilioWhatsappNumber(e.target.value)}
                        className="w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updateConfigMutation.isPending}
                    className="rounded-md bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
                  >
                    {updateConfigMutation.isPending ? "Saving..." : "Save Gateway Configuration"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Connectivity Diagnostic Box */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-[#F0F0F0]">
              <CardTitle className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
                Connectivity Diagnostics
              </CardTitle>
              <p className="text-xs text-[#737373]">
                Validate that your third-party credentials and outbound routes can reach recipient devices.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Test Resend */}
              <div className="space-y-2 pb-3 border-b border-[#F0F0F0]">
                <span className="block text-xs font-semibold text-[#171717]">
                  Test Resend Outbound
                </span>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#262626] focus:border-[#171717] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!testEmailRecipient || testConnectionMutation.isPending}
                  onClick={() =>
                    testConnectionMutation.mutate({
                      gateway: "resend",
                      testRecipient: testEmailRecipient,
                    })
                  }
                  className="w-full rounded bg-[#171717] py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
                >
                  {testConnectionMutation.isPending ? "Dispatching..." : "Send Test Email"}
                </button>
              </div>

              {/* Test Twilio */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-[#171717]">
                  Test Twilio Outbound (SMS/WA)
                </span>
                <input
                  type="text"
                  placeholder="+15551234567"
                  value={testTwilioRecipient}
                  onChange={(e) => setTestTwilioRecipient(e.target.value)}
                  className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#262626] font-mono focus:border-[#171717] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!testTwilioRecipient || testConnectionMutation.isPending}
                  onClick={() =>
                    testConnectionMutation.mutate({
                      gateway: "twilio",
                      testRecipient: testTwilioRecipient,
                    })
                  }
                  className="w-full rounded bg-[#171717] py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
                >
                  {testConnectionMutation.isPending ? "Dispatching..." : "Send Test SMS"}
                </button>
              </div>

              {/* Diagnostic Result */}
              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-md text-xs border ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <div className="font-semibold mb-0.5">
                    {testResult.success ? "✓ Test Passed" : "✕ Test Failed"} ({testResult.gateway})
                  </div>
                  <div className="text-[11px] leading-relaxed break-all">
                    {testResult.message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tenant Quotas & Metering Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#F0F0F0]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#171717] uppercase tracking-wider">
                Tenant Quotas & Usage Metering
              </CardTitle>
              <p className="text-xs text-[#737373]">
                Monitor per-tenant message consumption, limits, and overage billing policies across the SaaS.
              </p>
            </div>
            <span className="text-xs text-[#737373] tabular-nums font-mono">
              {tenantQuotas?.length ?? 0} metered tenants
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] font-medium">
                <tr>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Email Quota</th>
                  <th className="py-3 px-4">SMS Quota</th>
                  <th className="py-3 px-4">WhatsApp Quota</th>
                  <th className="py-3 px-4">Overage Policy</th>
                  <th className="py-3 px-4">Period Resets</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-[#262626]">
                {tenantQuotas?.map((item) => {
                  const emailPct = Math.round(
                    (item.quota.emailUsed / (item.quota.emailLimit || 1)) * 100,
                  );
                  const smsPct = Math.round(
                    (item.quota.smsUsed / (item.quota.smsLimit || 1)) * 100,
                  );
                  const waPct = Math.round(
                    (item.quota.whatsappUsed / (item.quota.whatsappLimit || 1)) * 100,
                  );

                  return (
                    <tr key={item.tenantId} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div>{item.tenantName}</div>
                        <div className="text-[11px] text-[#737373] font-mono">
                          /{item.tenantSlug}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>{item.quota.emailUsed}</span>
                            <span className="text-[#737373]">/ {item.quota.emailLimit}</span>
                          </div>
                          <div className="w-full bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                emailPct >= 95 ? "bg-red-500" : emailPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
                              }`}
                              style={{ width: `${Math.min(100, emailPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>{item.quota.smsUsed}</span>
                            <span className="text-[#737373]">/ {item.quota.smsLimit}</span>
                          </div>
                          <div className="w-full bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                smsPct >= 95 ? "bg-red-500" : smsPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
                              }`}
                              style={{ width: `${Math.min(100, smsPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>{item.quota.whatsappUsed}</span>
                            <span className="text-[#737373]">/ {item.quota.whatsappLimit}</span>
                          </div>
                          <div className="w-full bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                waPct >= 95 ? "bg-red-500" : waPct >= 80 ? "bg-amber-500" : "bg-[#171717]"
                              }`}
                              style={{ width: `${Math.min(100, waPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.quota.allowOverage ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Overage (${item.quota.overageRateEmail}/ea)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                            Strict Cap
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#737373] tabular-nums font-mono">
                        {new Date(item.quota.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuota(item)}
                          className="rounded border border-[#E5E5E5] px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-white transition-colors"
                        >
                          Edit Quota
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Tenant Quota Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">
                  Configure Quota: {editingTenant.tenantName}
                </h3>
                <p className="text-xs text-[#737373]">
                  Adjust monthly message caps and overage billing options for this tenant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="text-[#737373] hover:text-[#171717] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTenantQuota} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#737373] mb-1 font-medium">Monthly Emails</label>
                  <input
                    type="number"
                    min={0}
                    value={editEmailLimit}
                    onChange={(e) => setEditEmailLimit(Number(e.target.value))}
                    className="w-full rounded border border-[#E5E5E5] px-2.5 py-1.5 font-mono focus:border-[#171717] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#737373] mb-1 font-medium">Monthly SMS</label>
                  <input
                    type="number"
                    min={0}
                    value={editSmsLimit}
                    onChange={(e) => setEditSmsLimit(Number(e.target.value))}
                    className="w-full rounded border border-[#E5E5E5] px-2.5 py-1.5 font-mono focus:border-[#171717] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#737373] mb-1 font-medium">Monthly WhatsApp</label>
                  <input
                    type="number"
                    min={0}
                    value={editWhatsappLimit}
                    onChange={(e) => setEditWhatsappLimit(Number(e.target.value))}
                    className="w-full rounded border border-[#E5E5E5] px-2.5 py-1.5 font-mono focus:border-[#171717] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border border-[#E5E5E5] rounded-md p-3 bg-stone-50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAllowOverage}
                    onChange={(e) => setEditAllowOverage(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium text-[#171717]">
                    Allow overage past monthly limit (Monetized)
                  </span>
                </label>

                {editAllowOverage && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E5E5E5]">
                    <div>
                      <label className="block text-[11px] text-[#737373] mb-1">Email Overage ($)</label>
                      <input
                        type="number"
                        step="0.001"
                        min={0}
                        value={editOverageEmail}
                        onChange={(e) => setEditOverageEmail(Number(e.target.value))}
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#737373] mb-1">SMS Overage ($)</label>
                      <input
                        type="number"
                        step="0.001"
                        min={0}
                        value={editOverageSms}
                        onChange={(e) => setEditOverageSms(Number(e.target.value))}
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#737373] mb-1">WhatsApp Overage ($)</label>
                      <input
                        type="number"
                        step="0.001"
                        min={0}
                        value={editOverageWhatsapp}
                        onChange={(e) => setEditOverageWhatsapp(Number(e.target.value))}
                        className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1 font-mono focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="rounded border border-[#E5E5E5] px-3.5 py-1.5 font-medium text-[#737373] hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateQuotaMutation.isPending}
                  className="rounded bg-[#171717] px-3.5 py-1.5 font-medium text-white hover:bg-[#262626] disabled:opacity-50"
                >
                  {updateQuotaMutation.isPending ? "Updating..." : "Save Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
