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

// --- IAM-001: Authentication and Session Management ---

export const platformRoleSchema = z.enum(["super_admin", "platform_ops"]);
export const tenantRoleSchema = z.enum(["owner", "admin", "manager", "staff"]);
export const invitationStatusSchema = z.enum(["pending", "accepted", "expired", "revoked"]);

export const signInRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const platformSignInResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: platformRoleSchema,
  }),
});

export const tenantSignInResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: tenantRoleSchema,
    tenantId: tenantIdSchema,
    tenantSlug: tenantSlugSchema,
  }),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const invitationAcceptRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(160),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: tenantSlugSchema,
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const authSessionSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  scope: accessScopeSchema,
  role: z.union([platformRoleSchema, tenantRoleSchema]),
  tenantId: tenantIdSchema.optional(),
  tenantSlug: tenantSlugSchema.optional(),
});

export const authenticatedPlatformContextSchema = platformRequestContextSchema.extend({
  userId: z.string().uuid(),
  role: platformRoleSchema,
});

export const authenticatedTenantContextSchema = tenantRequestContextSchema.extend({
  userId: z.string().uuid(),
  role: tenantRoleSchema,
});

export const authenticatedRequestContextSchema = z.discriminatedUnion("scope", [
  authenticatedPlatformContextSchema,
  authenticatedTenantContextSchema,
]);

export type PlatformRole = z.infer<typeof platformRoleSchema>;
export type TenantRole = z.infer<typeof tenantRoleSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type PlatformSignInResponse = z.infer<typeof platformSignInResponseSchema>;
export type TenantSignInResponse = z.infer<typeof tenantSignInResponseSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type InvitationAcceptRequest = z.infer<typeof invitationAcceptRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthenticatedPlatformContext = z.infer<typeof authenticatedPlatformContextSchema>;
export type AuthenticatedTenantContext = z.infer<typeof authenticatedTenantContextSchema>;
export type AuthenticatedRequestContext = z.infer<typeof authenticatedRequestContextSchema>;

// --- PLT-001: Super Admin Console ---

export const createTenantRequestSchema = z.object({
  slug: tenantSlugSchema,
  displayName: z.string().min(1).max(160),
  settings: z.object({
    timezone: z.string().min(1).max(64).optional(),
    currencyCode: z.string().length(3).optional(),
    locale: z.string().min(2).max(16).optional(),
  }).optional(),
});

export const updateTenantRequestSchema = z.object({
  displayName: z.string().min(1).max(160).optional(),
  settings: z.object({
    timezone: z.string().min(1).max(64).optional(),
    currencyCode: z.string().length(3).optional(),
    locale: z.string().min(2).max(16).optional(),
  }).optional(),
});

export const tenantDetailSchema = z.object({
  id: tenantIdSchema,
  slug: tenantSlugSchema,
  displayName: z.string().min(1).max(160),
  status: tenantStatusSchema,
  settings: tenantSettingsSchema.nullable(),
  userCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const tenantListResponseSchema = z.object({
  data: z.array(tenantSummarySchema.extend({ userCount: z.number().int().nonnegative() })),
  total: z.number().int().nonnegative(),
});

export const tenantLifecycleActionSchema = z.enum(["activate", "suspend", "archive"]);

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;
export type TenantDetail = z.infer<typeof tenantDetailSchema>;
export type TenantListResponse = z.infer<typeof tenantListResponseSchema>;
export type TenantLifecycleAction = z.infer<typeof tenantLifecycleActionSchema>;

// --- TEN-001: Tenant Administration and User Management ---

export const tenantProfileSchema = z.object({
  id: tenantIdSchema,
  slug: tenantSlugSchema,
  displayName: z.string().min(1).max(160),
  status: tenantStatusSchema,
  settings: tenantSettingsSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const updateTenantProfileSchema = z.object({
  displayName: z.string().min(1).max(160).optional(),
  settings: z.object({
    timezone: z.string().min(1).max(64).optional(),
    currencyCode: z.string().length(3).optional(),
    locale: z.string().min(2).max(16).optional(),
  }).optional(),
});

export const tenantUserItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: tenantRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const tenantUserListResponseSchema = z.object({
  data: z.array(tenantUserItemSchema),
  total: z.number().int().nonnegative(),
});

export const createInvitationRequestSchema = z.object({
  email: z.string().email(),
  role: tenantRoleSchema,
});

export const invitationItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: tenantRoleSchema,
  status: invitationStatusSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const invitationListResponseSchema = z.object({
  data: z.array(invitationItemSchema),
  total: z.number().int().nonnegative(),
});

export const updateTenantUserRoleSchema = z.object({
  role: tenantRoleSchema,
});

export type TenantProfile = z.infer<typeof tenantProfileSchema>;
export type UpdateTenantProfile = z.infer<typeof updateTenantProfileSchema>;
export type TenantUserItem = z.infer<typeof tenantUserItemSchema>;
export type TenantUserListResponse = z.infer<typeof tenantUserListResponseSchema>;
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export type InvitationItem = z.infer<typeof invitationItemSchema>;
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>;
export type UpdateTenantUserRole = z.infer<typeof updateTenantUserRoleSchema>;

// --- CRM-001: Customer Management ---

export const customerContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  email: z.string().email().nullable(),
  phone: z.string().max(32).nullable(),
  role: z.string().max(80).nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const customerItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable(),
  phone: z.string().max(32).nullable(),
  isActive: z.boolean(),
  contactCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const customerDetailSchema = customerItemSchema.extend({
  address: z.string().nullable(),
  notes: z.string().nullable(),
  contacts: z.array(customerContactSchema),
  updatedAt: z.string().datetime(),
});

export const customerListResponseSchema = z.object({
  data: z.array(customerItemSchema),
  total: z.number().int().nonnegative(),
});

export const createCustomerRequestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCustomerRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export const createContactRequestSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  role: z.string().max(80).optional(),
  isPrimary: z.boolean().optional(),
});

export const updateContactRequestSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  role: z.string().max(80).optional(),
  isPrimary: z.boolean().optional(),
});

export const customerSearchParamsSchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export type CustomerContact = z.infer<typeof customerContactSchema>;
export type CustomerItem = z.infer<typeof customerItemSchema>;
export type CustomerDetail = z.infer<typeof customerDetailSchema>;
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerRequestSchema>;
export type CreateContactRequest = z.infer<typeof createContactRequestSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactRequestSchema>;
export type CustomerSearchParams = z.infer<typeof customerSearchParamsSchema>;
