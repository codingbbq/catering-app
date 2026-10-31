# TEN-001 Tenant Administration and User Management

## Feature ID and name

- Feature ID: `TEN-001`
- Feature name: `Tenant Administration and User Management`

## Purpose and business value

Allow each tenant business to configure basic business administration, invite internal users, assign tenant roles, and manage active access within the tenant boundary.

## User roles and permissions

- Tenant Owner / Business Admin
- Tenant User Manager if split later
- Staff users with no admin permissions

## Functional requirements

- view and update tenant business profile basics
- invite tenant users
- assign tenant roles
- deactivate tenant users
- view user list and status
- support role-based access foundation for future feature permissions

## User stories

- As a tenant owner, I want to invite my sales and operations staff so they can work in the platform.
- As a tenant admin, I want to deactivate a former employee’s access immediately.
- As a staff user, I want to see only the functionality allowed by my role.

## UI screens and interactions

- tenant settings screen
- tenant user list screen
- invite user form
- role assignment and deactivation actions

## Data model changes

- `TenantSettings`
- `TenantUser`
- `TenantRole`
- `UserInvitation`
- audit log entries for user administration

## API endpoints or operations

- `GET /tenant/me`
- `PATCH /tenant/me`
- `GET /tenant/users`
- `POST /tenant/users/invitations`
- `PATCH /tenant/users/:tenantUserId`
- `POST /tenant/users/:tenantUserId/deactivate`

## Validation and business rules

- only tenant admins can manage tenant users
- at least one active tenant owner/admin must remain unless a safer replacement flow exists
- invitations should expire
- role changes should take effect on next authorization check or session refresh policy

## Security considerations

- prevent privilege escalation
- audit role and status changes
- ensure tenant admins cannot cross into platform permissions

## Error and edge cases

- duplicate user email within the same tenant or across tenants, depending on chosen identity model
- attempting to deactivate the last active tenant admin
- invitation accepted after deactivation

## Acceptance criteria

- tenant admins can manage business profile basics and tenant user access
- users see only allowed areas after authorization is wired
- lifecycle changes are audited

## Automated testing requirements

- unit tests for invitation and role-management rules
- integration tests for tenant authorization boundaries
- end-to-end tests for invite, activate, and deactivate flows

## Dependencies on other features

- `FND-001`
- `IAM-001`
- `PLT-001`

## Explicit out-of-scope items

- advanced branch or department hierarchy unless explicitly required later
- payroll or HR administration
