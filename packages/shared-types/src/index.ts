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

// --- CRM-002: Enquiry Management ---

export const enquiryStatusSchema = z.enum([
  "new",
  "qualified",
  "proposal_sent",
  "converted",
  "lost",
  "cancelled",
]);

export const serviceTypeSchema = z.enum([
  "event_catering",
  "daily_meals",
  "other",
]);

export const activityTypeSchema = z.enum([
  "note",
  "call",
  "email",
  "meeting",
  "status_change",
]);

export const enquiryActivityItemSchema = z.object({
  id: z.string().uuid(),
  enquiryId: z.string().uuid(),
  type: activityTypeSchema,
  content: z.string(),
  authorId: z.string().nullable(),
  authorName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const enquiryItemSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  title: z.string().min(1).max(200),
  status: enquiryStatusSchema,
  serviceType: serviceTypeSchema,
  eventDate: z.string().nullable(),
  guestCount: z.number().int().positive().nullable(),
  estimatedBudget: z.number().nonnegative().nullable(),
  assignedToId: z.string().nullable(),
  assignedToName: z.string().nullable(),
  nextAction: z.string().nullable(),
  nextActionDate: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const enquiryDetailSchema = enquiryItemSchema.extend({
  eventType: z.string().nullable(),
  venue: z.string().nullable(),
  notes: z.string().nullable(),
  lostReason: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  activities: z.array(enquiryActivityItemSchema),
});

export const enquiryListResponseSchema = z.object({
  data: z.array(enquiryItemSchema),
  total: z.number().int().nonnegative(),
});

export const createEnquiryRequestSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1).max(200),
  serviceType: serviceTypeSchema.default("event_catering"),
  eventDate: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  eventType: z.string().max(100).optional(),
  venue: z.string().max(250).optional(),
  estimatedBudget: z.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
  assignedToId: z.string().uuid().optional(),
  nextAction: z.string().max(200).optional(),
  nextActionDate: z.string().optional(),
});

export const updateEnquiryRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  serviceType: serviceTypeSchema.optional(),
  status: enquiryStatusSchema.optional(),
  eventDate: z.string().nullable().optional(),
  guestCount: z.number().int().positive().nullable().optional(),
  eventType: z.string().max(100).nullable().optional(),
  venue: z.string().max(250).nullable().optional(),
  estimatedBudget: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  nextAction: z.string().max(200).nullable().optional(),
  nextActionDate: z.string().nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
});

export const createEnquiryActivityRequestSchema = z.object({
  type: activityTypeSchema.default("note"),
  content: z.string().min(1).max(2000),
});

export const enquirySearchParamsSchema = z.object({
  search: z.string().optional(),
  status: enquiryStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  serviceType: serviceTypeSchema.optional(),
});

export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;
export type ServiceType = z.infer<typeof serviceTypeSchema>;
export type ActivityType = z.infer<typeof activityTypeSchema>;
export type EnquiryActivityItem = z.infer<typeof enquiryActivityItemSchema>;
export type EnquiryItem = z.infer<typeof enquiryItemSchema>;
export type EnquiryDetail = z.infer<typeof enquiryDetailSchema>;
export type EnquiryListResponse = z.infer<typeof enquiryListResponseSchema>;
export type CreateEnquiryRequest = z.infer<typeof createEnquiryRequestSchema>;
export type UpdateEnquiryRequest = z.infer<typeof updateEnquiryRequestSchema>;
export type CreateEnquiryActivityRequest = z.infer<typeof createEnquiryActivityRequestSchema>;
export type EnquirySearchParams = z.infer<typeof enquirySearchParamsSchema>;

// --- CAT-001: Food Catalogue and Catalogue Import ---

export const catalogueCategorySchema = z.enum([
  "starter",
  "main",
  "dessert",
  "beverage",
  "bread",
  "side",
  "salad",
  "snack",
  "other",
]);

export const pricingUnitSchema = z.enum([
  "per_person",
  "per_plate",
  "per_kg",
  "per_tray",
  "per_piece",
  "per_liter",
  "fixed",
]);

export const dietaryTagSchema = z.enum([
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "spicy",
  "organic",
]);

export const catalogueImportStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
  "partially_failed",
]);

export const catalogueItemImageSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  url: z.string(),
  caption: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
});

export const addCatalogueItemImageRequestSchema = z.object({
  url: z.string().min(1),
  caption: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

export const uploadCatalogueItemImageRequestSchema = z.object({
  fileBase64: z.string().min(1),
  filename: z.string().min(1).max(255),
  caption: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

export const catalogueItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.string().min(1).max(60),
  pricingUnit: pricingUnitSchema,
  costPrice: z.number().nonnegative().nullable(),
  sellingPrice: z.number().nonnegative(),
  dietaryTags: z.array(z.string()),
  minQuantity: z.number().int().positive().nullable(),
  isArchived: z.boolean(),
  images: z.array(catalogueItemImageSchema).default([]),
  primaryImageUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const catalogueItemListStatsSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  activeItems: z.number().int().nonnegative(),
  archivedItems: z.number().int().nonnegative(),
  categoriesCount: z.number().int().nonnegative(),
});

export const catalogueItemListResponseSchema = z.object({
  data: z.array(catalogueItemSchema),
  total: z.number().int().nonnegative(),
  stats: catalogueItemListStatsSchema.optional(),
});

export const createCatalogueItemRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(60).default("main"),
  pricingUnit: pricingUnitSchema.default("per_person"),
  costPrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative(),
  dietaryTags: z.array(z.string()).default([]),
  minQuantity: z.number().int().positive().optional(),
});

export const updateCatalogueItemRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(60).optional(),
  pricingUnit: pricingUnitSchema.optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  dietaryTags: z.array(z.string()).optional(),
  minQuantity: z.number().int().positive().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const catalogueSearchParamsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "archived", "all"]).optional(),
  dietaryTag: z.string().optional(),
});

export const catalogueImportRowErrorSchema = z.object({
  row: z.number().int().positive(),
  name: z.string().optional(),
  errors: z.array(z.string()),
});

export const catalogueImportRequestSchema = z.object({
  filename: z.string().max(255).optional(),
  rows: z.array(
    z.object({
      name: z.string(),
      category: z.string().optional(),
      description: z.string().optional(),
      costPrice: z.union([z.number(), z.string()]).optional(),
      sellingPrice: z.union([z.number(), z.string()]),
      pricingUnit: z.string().optional(),
      dietaryTags: z.union([z.string(), z.array(z.string())]).optional(),
      minQuantity: z.union([z.number(), z.string()]).optional(),
    })
  ),
});

export const catalogueImportResultSchema = z.object({
  jobId: z.string().uuid(),
  status: catalogueImportStatusSchema,
  totalRows: z.number().int().nonnegative(),
  successfulRows: z.number().int().nonnegative(),
  failedRows: z.number().int().nonnegative(),
  errors: z.array(catalogueImportRowErrorSchema),
});

export const catalogueImportJobSchema = z.object({
  id: z.string().uuid(),
  status: catalogueImportStatusSchema,
  filename: z.string().nullable(),
  totalRows: z.number().int().nonnegative(),
  successfulRows: z.number().int().nonnegative(),
  failedRows: z.number().int().nonnegative(),
  errors: z.array(catalogueImportRowErrorSchema),
  importedByName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CatalogueCategory = z.infer<typeof catalogueCategorySchema>;
export type PricingUnit = z.infer<typeof pricingUnitSchema>;
export type DietaryTag = z.infer<typeof dietaryTagSchema>;
export type CatalogueImportStatus = z.infer<typeof catalogueImportStatusSchema>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type CatalogueItemListStats = z.infer<typeof catalogueItemListStatsSchema>;
export type CatalogueItemListResponse = z.infer<typeof catalogueItemListResponseSchema>;
export type CreateCatalogueItemRequest = z.infer<typeof createCatalogueItemRequestSchema>;
export type UpdateCatalogueItemRequest = z.infer<typeof updateCatalogueItemRequestSchema>;
export type CatalogueSearchParams = z.infer<typeof catalogueSearchParamsSchema>;
export type CatalogueImportRowError = z.infer<typeof catalogueImportRowErrorSchema>;
export type CatalogueImportRequest = z.infer<typeof catalogueImportRequestSchema>;
export type CatalogueImportResult = z.infer<typeof catalogueImportResultSchema>;
export type CatalogueImportJob = z.infer<typeof catalogueImportJobSchema>;
export type CatalogueItemImage = z.infer<typeof catalogueItemImageSchema>;
export type AddCatalogueItemImageRequest = z.infer<typeof addCatalogueItemImageRequestSchema>;
export type UploadCatalogueItemImageRequest = z.infer<typeof uploadCatalogueItemImageRequestSchema>;

// --- MEN-001: Menu Builder ---

export const menuStatusSchema = z.enum(["draft", "active", "archived"]);

export const menuItemSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  catalogueItemId: z.string().uuid().nullable().optional(),
  section: z.string().min(1).max(100).default("General"),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
  costPrice: z.number().nonnegative().nullable().optional(),
  dietaryTags: z.array(z.string()).default([]),
  sortOrder: z.number().int().nonnegative().default(0),
  servingNotes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const menuItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  catalogueItemId: z.string().uuid().nullable().optional(),
  section: z.string().min(1).max(100).default("General"),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  quantity: z.number().positive().optional().default(1),
  unitPrice: z.number().nonnegative().optional().default(0),
  costPrice: z.number().nonnegative().nullable().optional(),
  dietaryTags: z.array(z.string()).optional().default([]),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  servingNotes: z.string().nullable().optional(),
});

export const menuSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  serviceStyle: z.string().nullable().optional(),
  status: menuStatusSchema,
  minGuests: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(menuItemSchema).default([]),
  itemsCount: z.number().int().nonnegative().optional(),
  totalSellingPrice: z.number().nonnegative().optional(),
  totalCostPrice: z.number().nonnegative().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createMenuRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  serviceStyle: z.string().max(60).optional(),
  status: menuStatusSchema.default("active"),
  minGuests: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(menuItemInputSchema).default([]),
});

export const updateMenuRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  serviceStyle: z.string().max(60).nullable().optional(),
  status: menuStatusSchema.optional(),
  minGuests: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(menuItemInputSchema).optional(),
});

export const duplicateMenuRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const menuSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "draft", "archived", "all"]).optional(),
  serviceStyle: z.string().optional(),
});

export const menuListStatsSchema = z.object({
  totalMenus: z.number().int().nonnegative(),
  activeMenus: z.number().int().nonnegative(),
  draftMenus: z.number().int().nonnegative(),
  archivedMenus: z.number().int().nonnegative(),
});

export const menuListResponseSchema = z.object({
  data: z.array(menuSchema),
  total: z.number().int().nonnegative(),
  stats: menuListStatsSchema.optional(),
});

export type MenuStatus = z.infer<typeof menuStatusSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuItemInput = z.input<typeof menuItemInputSchema>;
export type Menu = z.infer<typeof menuSchema>;
export type CreateMenuRequest = z.input<typeof createMenuRequestSchema>;
export type UpdateMenuRequest = z.input<typeof updateMenuRequestSchema>;
export type DuplicateMenuRequest = z.infer<typeof duplicateMenuRequestSchema>;
export type MenuSearchParams = z.infer<typeof menuSearchParamsSchema>;
export type MenuListStats = z.infer<typeof menuListStatsSchema>;
export type MenuListResponse = z.infer<typeof menuListResponseSchema>;

// --- CST-001: Costing Engine & Recipes ---

export const recipeItemSchema = z.object({
  id: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  catalogueItemId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(30).default("kg"),
  unitCost: z.number().nonnegative().default(0),
  totalCost: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const recipeItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  catalogueItemId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(30).default("kg"),
  unitCost: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export const recipeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional().default("general"),
  yield: z.number().positive().default(1),
  yieldUnit: z.string().min(1).max(50).default("portion"),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  targetMargin: z.number().min(0).max(99.99).nullable().optional(),
  isArchived: z.boolean().default(false),
  items: z.array(recipeItemSchema).default([]),
  totalCost: z.number().nonnegative().default(0),
  costPerYieldUnit: z.number().nonnegative().default(0),
  suggestedSellingPrice: z.number().nonnegative().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createRecipeRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(60).optional().default("general"),
  yield: z.number().positive().default(1),
  yieldUnit: z.string().min(1).max(50).default("portion"),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  targetMargin: z.number().min(0).max(99.99).optional().default(30),
  items: z.array(recipeItemInputSchema).default([]),
});

export const updateRecipeRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  yield: z.number().positive().optional(),
  yieldUnit: z.string().min(1).max(50).optional(),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  targetMargin: z.number().min(0).max(99.99).nullable().optional(),
  isArchived: z.boolean().optional(),
  items: z.array(recipeItemInputSchema).optional(),
});

export const recipeSearchParamsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  isArchived: z.enum(["true", "false", "all"]).optional(),
});

export const recipeListStatsSchema = z.object({
  totalRecipes: z.number().int().nonnegative(),
  activeRecipes: z.number().int().nonnegative(),
  archivedRecipes: z.number().int().nonnegative(),
  avgCostPerPortion: z.number().nonnegative(),
});

export const recipeListResponseSchema = z.object({
  data: z.array(recipeSchema),
  total: z.number().int().nonnegative(),
  stats: recipeListStatsSchema.optional(),
});

export const costSheetItemTypeSchema = z.enum(["ingredient", "recipe", "labor", "overhead", "other"]);
export const costSheetStatusSchema = z.enum(["draft", "active", "archived"]);

export const costSheetItemSchema = z.object({
  id: z.string().uuid().optional(),
  costSheetId: z.string().uuid().optional(),
  itemType: costSheetItemTypeSchema.default("ingredient"),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(30).default("unit"),
  unitCost: z.number().nonnegative().default(0),
  totalCost: z.number().nonnegative().default(0),
  sortOrder: z.number().int().nonnegative().default(0),
  notes: z.string().nullable().optional(),
});

export const costSheetItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  itemType: costSheetItemTypeSchema.default("ingredient"),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(30).default("unit"),
  unitCost: z.number().nonnegative().default(0),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  notes: z.string().nullable().optional(),
});

export const costSheetCalculationInputSchema = z.object({
  servings: z.number().positive().default(1),
  items: z.array(costSheetItemInputSchema).default([]),
  laborCost: z.number().nonnegative().optional().default(0),
  overheadCost: z.number().nonnegative().optional().default(0),
  otherCost: z.number().nonnegative().optional().default(0),
  targetMarginPercent: z.number().min(0).max(99.99).optional().default(30),
  quotedPrice: z.number().nonnegative().optional(),
});

export const costSheetCalculationResultSchema = z.object({
  servings: z.number().positive(),
  ingredientCost: z.number().nonnegative(),
  laborCost: z.number().nonnegative(),
  overheadCost: z.number().nonnegative(),
  otherCost: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  costPerServing: z.number().nonnegative(),
  targetMarginPercent: z.number().nonnegative(),
  markupPercent: z.number().nonnegative(),
  suggestedPrice: z.number().nonnegative(),
  suggestedPricePerServing: z.number().nonnegative(),
  quotedPrice: z.number().nonnegative(),
  quotedPricePerServing: z.number().nonnegative(),
  actualMarginPercent: z.number(),
  actualMarkupPercent: z.number(),
  grossProfit: z.number(),
});

export const costSheetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  status: costSheetStatusSchema,
  menuId: z.string().uuid().nullable().optional(),
  menuName: z.string().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  recipeName: z.string().nullable().optional(),
  servings: z.number().positive(),
  ingredientCost: z.number().nonnegative(),
  laborCost: z.number().nonnegative(),
  overheadCost: z.number().nonnegative(),
  otherCost: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  costPerServing: z.number().nonnegative(),
  targetMarginPercent: z.number().nonnegative(),
  markupPercent: z.number().nonnegative(),
  suggestedPrice: z.number().nonnegative(),
  quotedPrice: z.number().nonnegative(),
  actualMarginPercent: z.number(),
  notes: z.string().nullable().optional(),
  items: z.array(costSheetItemSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCostSheetRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: costSheetStatusSchema.default("draft"),
  menuId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  servings: z.number().positive().default(1),
  targetMarginPercent: z.number().min(0).max(99.99).optional().default(30),
  quotedPrice: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional().default(0),
  overheadCost: z.number().nonnegative().optional().default(0),
  otherCost: z.number().nonnegative().optional().default(0),
  notes: z.string().max(2000).optional(),
  items: z.array(costSheetItemInputSchema).default([]),
});

export const updateCostSheetRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: costSheetStatusSchema.optional(),
  menuId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  servings: z.number().positive().optional(),
  targetMarginPercent: z.number().min(0).max(99.99).optional(),
  quotedPrice: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  overheadCost: z.number().nonnegative().optional(),
  otherCost: z.number().nonnegative().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(costSheetItemInputSchema).optional(),
});

export const costSheetSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "draft", "archived", "all"]).optional(),
  menuId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
});

export const costSheetListStatsSchema = z.object({
  totalCostSheets: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  draftCount: z.number().int().nonnegative(),
  archivedCount: z.number().int().nonnegative(),
  avgMarginPercent: z.number(),
  avgCostPerServing: z.number().nonnegative(),
});

export const costSheetListResponseSchema = z.object({
  data: z.array(costSheetSchema),
  total: z.number().int().nonnegative(),
  stats: costSheetListStatsSchema.optional(),
});

export type RecipeItem = z.infer<typeof recipeItemSchema>;
export type RecipeItemInput = z.input<typeof recipeItemInputSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type CreateRecipeRequest = z.input<typeof createRecipeRequestSchema>;
export type UpdateRecipeRequest = z.input<typeof updateRecipeRequestSchema>;
export type RecipeSearchParams = z.infer<typeof recipeSearchParamsSchema>;
export type RecipeListStats = z.infer<typeof recipeListStatsSchema>;
export type RecipeListResponse = z.infer<typeof recipeListResponseSchema>;

export type CostSheetItemType = z.infer<typeof costSheetItemTypeSchema>;
export type CostSheetStatus = z.infer<typeof costSheetStatusSchema>;
export type CostSheetItem = z.infer<typeof costSheetItemSchema>;
export type CostSheetItemInput = z.input<typeof costSheetItemInputSchema>;
export type CostSheetCalculationInput = z.input<typeof costSheetCalculationInputSchema>;
export type CostSheetCalculationResult = z.infer<typeof costSheetCalculationResultSchema>;
export type CostSheet = z.infer<typeof costSheetSchema>;
export type CreateCostSheetRequest = z.input<typeof createCostSheetRequestSchema>;
export type UpdateCostSheetRequest = z.input<typeof updateCostSheetRequestSchema>;
export type CostSheetSearchParams = z.infer<typeof costSheetSearchParamsSchema>;
export type CostSheetListStats = z.infer<typeof costSheetListStatsSchema>;
export type CostSheetListResponse = z.infer<typeof costSheetListResponseSchema>;

// --- Deterministic Costing Calculation Engine ---

const round2 = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

export function calculateRecipeMetrics(
  items: Array<{ quantity: number; unitCost: number }>,
  yieldCount: number = 1,
  targetMarginPercent: number = 30
) {
  const safeYield = yieldCount > 0 ? yieldCount : 1;
  const safeMargin = Math.min(Math.max(targetMarginPercent, 0), 99.99);

  const totalCost = round2(
    items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0)
  );
  const costPerYieldUnit = round2(totalCost / safeYield);

  // Suggested selling price based on target gross margin: Total Cost / (1 - Margin/100)
  const marginFactor = 1 - safeMargin / 100;
  const suggestedSellingPrice = marginFactor > 0 ? round2(totalCost / marginFactor) : totalCost;
  const suggestedPricePerYieldUnit = round2(suggestedSellingPrice / safeYield);

  // Markup percentage: (Selling Price - Total Cost) / Total Cost * 100
  const markupPercent = totalCost > 0 ? round2(((suggestedSellingPrice - totalCost) / totalCost) * 100) : 0;

  return {
    totalCost,
    costPerYieldUnit,
    suggestedSellingPrice,
    suggestedPricePerYieldUnit,
    markupPercent,
    targetMarginPercent: safeMargin,
  };
}

export function calculateCostSheetEngine(input: {
  servings?: number | undefined;
  items?:
    | Array<{
        itemType?: CostSheetItemType | undefined;
        name?: string | undefined;
        quantity: number;
        unitCost?: number | undefined;
        unit?: string | undefined;
        totalCost?: number | undefined;
      }>
    | undefined;
  laborCost?: number | undefined;
  overheadCost?: number | undefined;
  otherCost?: number | undefined;
  targetMarginPercent?: number | undefined;
  quotedPrice?: number | undefined;
}): CostSheetCalculationResult {
  const servings = Number(input.servings) > 0 ? Number(input.servings) : 1;
  const targetMargin = Math.min(Math.max(Number(input.targetMarginPercent ?? 30), 0), 99.99);

  let rawIngredientCost = 0;
  let itemLaborCost = 0;
  let itemOverheadCost = 0;
  let itemOtherCost = 0;

  if (input.items && Array.isArray(input.items)) {
    for (const item of input.items) {
      const lineCost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
      switch (item.itemType) {
        case "labor":
          itemLaborCost += lineCost;
          break;
        case "overhead":
          itemOverheadCost += lineCost;
          break;
        case "other":
          itemOtherCost += lineCost;
          break;
        case "ingredient":
        case "recipe":
        default:
          rawIngredientCost += lineCost;
          break;
      }
    }
  }

  const ingredientCost = round2(rawIngredientCost);
  const laborCost = round2(itemLaborCost + (Number(input.laborCost) || 0));
  const overheadCost = round2(itemOverheadCost + (Number(input.overheadCost) || 0));
  const otherCost = round2(itemOtherCost + (Number(input.otherCost) || 0));

  const totalCost = round2(ingredientCost + laborCost + overheadCost + otherCost);
  const costPerServing = round2(totalCost / servings);

  // Suggested price based on target gross margin
  const marginDivisor = 1 - targetMargin / 100;
  const suggestedPrice = marginDivisor > 0 ? round2(totalCost / marginDivisor) : totalCost;
  const suggestedPricePerServing = round2(suggestedPrice / servings);

  // Target markup
  const markupPercent = totalCost > 0 ? round2(((suggestedPrice - totalCost) / totalCost) * 100) : 0;

  // Quoted price
  const quotedPrice = input.quotedPrice !== undefined && input.quotedPrice !== null && !isNaN(Number(input.quotedPrice))
    ? round2(Number(input.quotedPrice))
    : suggestedPrice;
  const quotedPricePerServing = round2(quotedPrice / servings);

  // Actual realized margins based on quoted price
  const grossProfit = round2(quotedPrice - totalCost);
  const actualMarginPercent = quotedPrice > 0 ? round2((grossProfit / quotedPrice) * 100) : 0;
  const actualMarkupPercent = totalCost > 0 ? round2((grossProfit / totalCost) * 100) : 0;

  return {
    servings,
    ingredientCost,
    laborCost,
    overheadCost,
    otherCost,
    totalCost,
    costPerServing,
    targetMarginPercent: targetMargin,
    markupPercent,
    suggestedPrice,
    suggestedPricePerServing,
    quotedPrice,
    quotedPricePerServing,
    actualMarginPercent,
    actualMarkupPercent,
    grossProfit,
  };
}

// ============================================================================
// QTN-001: Quotations and Revisions Contracts & Calculations
// ============================================================================

export const quotationStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "superseded",
]);
export type QuotationStatus = z.infer<typeof quotationStatusSchema>;

export const revisionStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "superseded",
]);
export type RevisionStatus = z.infer<typeof revisionStatusSchema>;

export const quotationLineItemSchema = z.object({
  id: z.string().uuid(),
  revisionId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().default("Food & Beverage"),
  quantity: z.number().positive(),
  unit: z.string().default("guest"),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  unitCost: z.number().nonnegative().nullable().optional(),
  totalCost: z.number().nonnegative().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type QuotationLineItem = z.infer<typeof quotationLineItemSchema>;

export const quotationLineItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().nullable().optional(),
  category: z.string().default("Food & Beverage"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().default("guest"),
  unitPrice: z.number().nonnegative("Unit price must be positive or 0"),
  unitCost: z.number().nonnegative().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});
export type QuotationLineItemInput = z.input<typeof quotationLineItemInputSchema>;

export const quotationRevisionSchema = z.object({
  id: z.string().uuid(),
  quotationId: z.string().uuid(),
  revisionNumber: z.number().int().positive(),
  status: revisionStatusSchema,
  menuId: z.string().uuid().nullable().optional(),
  menuName: z.string().nullable().optional(),
  costSheetId: z.string().uuid().nullable().optional(),
  costSheetName: z.string().nullable().optional(),
  guestCount: z.number().int().positive().nullable().optional(),
  pricePerPerson: z.number().nonnegative().nullable().optional(),
  subtotal: z.number().nonnegative(),
  taxPercent: z.number().min(0).max(100).default(0),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative().nullable().optional(),
  estimatedMarginPercent: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  changeSummary: z.string().nullable().optional(),
  createdByUserId: z.string().nullable().optional(),
  items: z.array(quotationLineItemSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type QuotationRevision = z.infer<typeof quotationRevisionSchema>;

export const quotationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  enquiryId: z.string().uuid(),
  enquiryTitle: z.string().optional(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  quotationNumber: z.string(),
  title: z.string().min(1),
  status: quotationStatusSchema,
  currentRevisionNumber: z.number().int().positive(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  currentRevision: quotationRevisionSchema.nullable().optional(),
  revisions: z.array(quotationRevisionSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Quotation = z.infer<typeof quotationSchema>;

export const createQuotationRequestSchema = z.object({
  enquiryId: z.string().uuid("A valid enquiry must be selected"),
  title: z.string().min(1, "Quotation title is required").max(200),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  menuId: z.string().uuid().nullable().optional(),
  costSheetId: z.string().uuid().nullable().optional(),
  guestCount: z.number().int().positive().nullable().optional(),
  pricePerPerson: z.number().nonnegative().nullable().optional(),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  changeSummary: z.string().nullable().optional(),
  items: z.array(quotationLineItemInputSchema).min(1, "At least one line item is required"),
});
export type CreateQuotationRequest = z.input<typeof createQuotationRequestSchema>;

export const updateQuotationRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
});
export type UpdateQuotationRequest = z.input<typeof updateQuotationRequestSchema>;

export const createQuotationRevisionRequestSchema = z.object({
  changeSummary: z.string().min(1, "A summary of revisions is required for history tracking").max(500),
  menuId: z.string().uuid().nullable().optional(),
  costSheetId: z.string().uuid().nullable().optional(),
  guestCount: z.number().int().positive().nullable().optional(),
  pricePerPerson: z.number().nonnegative().nullable().optional(),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  notes: z.string().nullable().optional(),
  items: z.array(quotationLineItemInputSchema).min(1, "At least one line item is required"),
});
export type CreateQuotationRevisionRequest = z.input<typeof createQuotationRevisionRequestSchema>;

export const updateDraftRevisionRequestSchema = z.object({
  menuId: z.string().uuid().nullable().optional(),
  costSheetId: z.string().uuid().nullable().optional(),
  guestCount: z.number().int().positive().nullable().optional(),
  pricePerPerson: z.number().nonnegative().nullable().optional(),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  notes: z.string().nullable().optional(),
  changeSummary: z.string().nullable().optional(),
  items: z.array(quotationLineItemInputSchema).min(1, "At least one line item is required"),
});
export type UpdateDraftRevisionRequest = z.input<typeof updateDraftRevisionRequestSchema>;

export const sendQuotationRequestSchema = z.object({
  revisionId: z.string().uuid().optional(),
  sendNotes: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
});
export type SendQuotationRequest = z.input<typeof sendQuotationRequestSchema>;

export const quotationSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["draft", "sent", "accepted", "rejected", "expired", "superseded", "all"])
    .optional(),
  enquiryId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});
export type QuotationSearchParams = z.infer<typeof quotationSearchParamsSchema>;

export const quotationListItemSchema = z.object({
  id: z.string().uuid(),
  quotationNumber: z.string(),
  title: z.string(),
  status: quotationStatusSchema,
  enquiryId: z.string().uuid(),
  enquiryTitle: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  currentRevisionNumber: z.number().int().positive(),
  totalRevisions: z.number().int().positive(),
  totalAmount: z.number().nonnegative(),
  guestCount: z.number().int().positive().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type QuotationListItem = z.infer<typeof quotationListItemSchema>;

export const quotationListStatsSchema = z.object({
  totalQuotations: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  acceptedValue: z.number().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  pendingValue: z.number().nonnegative(),
});
export type QuotationListStats = z.infer<typeof quotationListStatsSchema>;

export const quotationListResponseSchema = z.object({
  items: z.array(quotationListItemSchema),
  stats: quotationListStatsSchema,
  total: z.number().int().nonnegative(),
});
export type QuotationListResponse = z.infer<typeof quotationListResponseSchema>;

// Deterministic Quotation Calculation Engine
export function calculateQuotationTotals(input: {
  items: Array<{
    quantity: number;
    unitPrice: number;
    unitCost?: number | null | undefined;
  }>;
  discountAmount?: number | undefined;
  taxPercent?: number | undefined;
  guestCount?: number | null | undefined;
  pricePerPerson?: number | null | undefined;
}) {
  const discount = Math.max(0, Number(input.discountAmount ?? 0));
  const taxPct = Math.min(Math.max(0, Number(input.taxPercent ?? 0)), 100);

  let rawSubtotal = 0;
  let rawTotalCost = 0;
  let hasCosts = false;

  for (const item of input.items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemTotal = round2(qty * price);
    rawSubtotal += itemTotal;

    if (item.unitCost != null && Number(item.unitCost) >= 0) {
      hasCosts = true;
      rawTotalCost += round2(qty * Number(item.unitCost));
    }
  }

  const subtotal = round2(rawSubtotal);
  const discountedSubtotal = Math.max(0, round2(subtotal - discount));
  const taxAmount = round2((discountedSubtotal * taxPct) / 100);
  const totalAmount = round2(discountedSubtotal + taxAmount);

  const estimatedCost = hasCosts ? round2(rawTotalCost) : null;
  let estimatedMarginPercent: number | null = null;

  if (estimatedCost != null && discountedSubtotal > 0) {
    const grossProfit = discountedSubtotal - estimatedCost;
    estimatedMarginPercent = round2((grossProfit / discountedSubtotal) * 100);
  }

  const guestCount = input.guestCount && Number(input.guestCount) > 0 ? Number(input.guestCount) : null;
  const calculatedPricePerPerson =
    guestCount && guestCount > 0 ? round2(totalAmount / guestCount) : (input.pricePerPerson ? round2(Number(input.pricePerPerson)) : null);

  return {
    subtotal,
    discountAmount: discount,
    taxPercent: taxPct,
    taxAmount,
    totalAmount,
    estimatedCost,
    estimatedMarginPercent,
    pricePerPerson: calculatedPricePerPerson,
  };
}


