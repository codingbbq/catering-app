import { z } from "zod";

export const tenantIdSchema = z.uuid();

export const tenantStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const tenantSummarySchema = z.object({
  id: tenantIdSchema,
  slug: z.string().min(2).max(64),
  displayName: z.string().min(1).max(160),
  status: tenantStatusSchema,
  createdAt: z.string().datetime()
});

export type TenantId = z.infer<typeof tenantIdSchema>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type TenantSummary = z.infer<typeof tenantSummarySchema>;
