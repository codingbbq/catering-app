import { z } from "zod";
export const accessScopeSchema = z.enum(["platform", "tenant"]);
export const tenantIdSchema = z.string().uuid();
export const tenantSlugSchema = z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const tenantStatusSchema = z.enum(["onboarding", "active", "suspended", "archived"]);
export const tenantSummarySchema = z.object({
    id: tenantIdSchema,
    slug: tenantSlugSchema,
    displayName: z.string().min(1).max(160),
    status: tenantStatusSchema,
    createdAt: z.string().datetime()
});
export const tenantSettingsSchema = z.object({
    tenantId: tenantIdSchema,
    timezone: z.string().min(1).max(64),
    currencyCode: z.string().length(3),
    locale: z.string().min(2).max(16)
});
export const platformRequestContextSchema = z.object({
    scope: z.literal("platform")
});
export const tenantRequestContextSchema = z.object({
    scope: z.literal("tenant"),
    tenantId: tenantIdSchema,
    tenantSlug: tenantSlugSchema.optional(),
    tenantStatus: tenantStatusSchema
});
export const requestContextSchema = z.discriminatedUnion("scope", [
    platformRequestContextSchema,
    tenantRequestContextSchema
]);
export const tenantContextHeadersSchema = z.object({
    "x-tenant-id": tenantIdSchema,
    "x-tenant-slug": tenantSlugSchema.optional(),
    "x-tenant-status": tenantStatusSchema.optional()
});
export const auditLogScopeSchema = z.enum(["platform", "tenant"]);
export const auditLogOutcomeSchema = z.enum(["allowed", "denied"]);
//# sourceMappingURL=index.js.map