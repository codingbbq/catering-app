import { z } from "zod";
export declare const accessScopeSchema: z.ZodEnum<{
    platform: "platform";
    tenant: "tenant";
}>;
export declare const tenantIdSchema: z.ZodString;
export declare const tenantSlugSchema: z.ZodString;
export declare const tenantStatusSchema: z.ZodEnum<{
    onboarding: "onboarding";
    active: "active";
    suspended: "suspended";
    archived: "archived";
}>;
export declare const tenantSummarySchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    displayName: z.ZodString;
    status: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const tenantSettingsSchema: z.ZodObject<{
    tenantId: z.ZodString;
    timezone: z.ZodString;
    currencyCode: z.ZodString;
    locale: z.ZodString;
}, z.core.$strip>;
export declare const platformRequestContextSchema: z.ZodObject<{
    scope: z.ZodLiteral<"platform">;
}, z.core.$strip>;
export declare const tenantRequestContextSchema: z.ZodObject<{
    scope: z.ZodLiteral<"tenant">;
    tenantId: z.ZodString;
    tenantSlug: z.ZodOptional<z.ZodString>;
    tenantStatus: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
}, z.core.$strip>;
export declare const requestContextSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    scope: z.ZodLiteral<"platform">;
}, z.core.$strip>, z.ZodObject<{
    scope: z.ZodLiteral<"tenant">;
    tenantId: z.ZodString;
    tenantSlug: z.ZodOptional<z.ZodString>;
    tenantStatus: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
}, z.core.$strip>], "scope">;
export declare const tenantContextHeadersSchema: z.ZodObject<{
    "x-tenant-id": z.ZodString;
    "x-tenant-slug": z.ZodOptional<z.ZodString>;
    "x-tenant-status": z.ZodOptional<z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>>;
}, z.core.$strip>;
export declare const auditLogScopeSchema: z.ZodEnum<{
    platform: "platform";
    tenant: "tenant";
}>;
export declare const auditLogOutcomeSchema: z.ZodEnum<{
    allowed: "allowed";
    denied: "denied";
}>;
export type AccessScope = z.infer<typeof accessScopeSchema>;
export type TenantId = z.infer<typeof tenantIdSchema>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type TenantSummary = z.infer<typeof tenantSummarySchema>;
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;
export type PlatformRequestContext = z.infer<typeof platformRequestContextSchema>;
export type TenantRequestContext = z.infer<typeof tenantRequestContextSchema>;
export type RequestContext = z.infer<typeof requestContextSchema>;
export type TenantContextHeaders = z.infer<typeof tenantContextHeadersSchema>;
export type AuditLogScope = z.infer<typeof auditLogScopeSchema>;
export type AuditLogOutcome = z.infer<typeof auditLogOutcomeSchema>;
