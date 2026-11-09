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
export declare const platformRoleSchema: z.ZodEnum<{
    super_admin: "super_admin";
    platform_ops: "platform_ops";
}>;
export declare const tenantRoleSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    manager: "manager";
    staff: "staff";
}>;
export declare const invitationStatusSchema: z.ZodEnum<{
    pending: "pending";
    accepted: "accepted";
    expired: "expired";
    revoked: "revoked";
}>;
export declare const signInRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const platformSignInResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<{
            super_admin: "super_admin";
            platform_ops: "platform_ops";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const tenantSignInResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<{
            owner: "owner";
            admin: "admin";
            manager: "manager";
            staff: "staff";
        }>;
        tenantId: z.ZodString;
        tenantSlug: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const refreshRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const refreshResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const invitationAcceptRequestSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordRequestSchema: z.ZodObject<{
    email: z.ZodString;
    tenantSlug: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordRequestSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const authSessionSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    scope: z.ZodEnum<{
        platform: "platform";
        tenant: "tenant";
    }>;
    role: z.ZodUnion<readonly [z.ZodEnum<{
        super_admin: "super_admin";
        platform_ops: "platform_ops";
    }>, z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>]>;
    tenantId: z.ZodOptional<z.ZodString>;
    tenantSlug: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const authenticatedPlatformContextSchema: z.ZodObject<{
    scope: z.ZodLiteral<"platform">;
    userId: z.ZodString;
    role: z.ZodEnum<{
        super_admin: "super_admin";
        platform_ops: "platform_ops";
    }>;
}, z.core.$strip>;
export declare const authenticatedTenantContextSchema: z.ZodObject<{
    scope: z.ZodLiteral<"tenant">;
    tenantId: z.ZodString;
    tenantSlug: z.ZodOptional<z.ZodString>;
    tenantStatus: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
    userId: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
}, z.core.$strip>;
export declare const authenticatedRequestContextSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    scope: z.ZodLiteral<"platform">;
    userId: z.ZodString;
    role: z.ZodEnum<{
        super_admin: "super_admin";
        platform_ops: "platform_ops";
    }>;
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
    userId: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
}, z.core.$strip>], "scope">;
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
export declare const createTenantRequestSchema: z.ZodObject<{
    slug: z.ZodString;
    displayName: z.ZodString;
    settings: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodOptional<z.ZodString>;
        currencyCode: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateTenantRequestSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodOptional<z.ZodString>;
        currencyCode: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const tenantDetailSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    displayName: z.ZodString;
    status: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
    settings: z.ZodNullable<z.ZodObject<{
        tenantId: z.ZodString;
        timezone: z.ZodString;
        currencyCode: z.ZodString;
        locale: z.ZodString;
    }, z.core.$strip>>;
    userCount: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const tenantListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
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
        userCount: z.ZodNumber;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const tenantLifecycleActionSchema: z.ZodEnum<{
    activate: "activate";
    suspend: "suspend";
    archive: "archive";
}>;
export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;
export type TenantDetail = z.infer<typeof tenantDetailSchema>;
export type TenantListResponse = z.infer<typeof tenantListResponseSchema>;
export type TenantLifecycleAction = z.infer<typeof tenantLifecycleActionSchema>;
export declare const tenantProfileSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    displayName: z.ZodString;
    status: z.ZodEnum<{
        onboarding: "onboarding";
        active: "active";
        suspended: "suspended";
        archived: "archived";
    }>;
    settings: z.ZodNullable<z.ZodObject<{
        tenantId: z.ZodString;
        timezone: z.ZodString;
        currencyCode: z.ZodString;
        locale: z.ZodString;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const updateTenantProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodOptional<z.ZodString>;
        currencyCode: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const tenantUserItemSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const tenantUserListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<{
            owner: "owner";
            admin: "admin";
            manager: "manager";
            staff: "staff";
        }>;
        isActive: z.ZodBoolean;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const createInvitationRequestSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
}, z.core.$strip>;
export declare const invitationItemSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
    status: z.ZodEnum<{
        pending: "pending";
        accepted: "accepted";
        expired: "expired";
        revoked: "revoked";
    }>;
    expiresAt: z.ZodString;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const invitationListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<{
            owner: "owner";
            admin: "admin";
            manager: "manager";
            staff: "staff";
        }>;
        status: z.ZodEnum<{
            pending: "pending";
            accepted: "accepted";
            expired: "expired";
            revoked: "revoked";
        }>;
        expiresAt: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const updateTenantUserRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        manager: "manager";
        staff: "staff";
    }>;
}, z.core.$strip>;
export type TenantProfile = z.infer<typeof tenantProfileSchema>;
export type UpdateTenantProfile = z.infer<typeof updateTenantProfileSchema>;
export type TenantUserItem = z.infer<typeof tenantUserItemSchema>;
export type TenantUserListResponse = z.infer<typeof tenantUserListResponseSchema>;
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export type InvitationItem = z.infer<typeof invitationItemSchema>;
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>;
export type UpdateTenantUserRole = z.infer<typeof updateTenantUserRoleSchema>;
export declare const customerContactSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    role: z.ZodNullable<z.ZodString>;
    isPrimary: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const customerItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    contactCount: z.ZodNumber;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const customerDetailSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    contactCount: z.ZodNumber;
    createdAt: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    contacts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        phone: z.ZodNullable<z.ZodString>;
        role: z.ZodNullable<z.ZodString>;
        isPrimary: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const customerListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        phone: z.ZodNullable<z.ZodString>;
        isActive: z.ZodBoolean;
        contactCount: z.ZodNumber;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const createCustomerRequestSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateCustomerRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const createContactRequestSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateContactRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const customerSearchParamsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
}, z.core.$strip>;
export type CustomerContact = z.infer<typeof customerContactSchema>;
export type CustomerItem = z.infer<typeof customerItemSchema>;
export type CustomerDetail = z.infer<typeof customerDetailSchema>;
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerRequestSchema>;
export type CreateContactRequest = z.infer<typeof createContactRequestSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactRequestSchema>;
export type CustomerSearchParams = z.infer<typeof customerSearchParamsSchema>;
