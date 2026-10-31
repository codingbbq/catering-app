# PLT-001 Super Admin Console

## Feature ID and name

- Feature ID: `PLT-001`
- Feature name: `Super Admin Console`

## Purpose and business value

Provide a platform-only console for the SaaS operator to manage tenant businesses, track lifecycle state, and support platform governance without entering tenant business workflows.

## User roles and permissions

- Super Admin: full platform oversight
- Platform Operations / Support: limited operational views depending on final policy
- No tenant role has access

## Functional requirements

- list tenants with lifecycle status
- view tenant summary details
- create tenant record and onboarding state
- activate, suspend, or archive tenant access
- view high-level tenant usage/support metadata
- record platform-facing notes or support context if adopted

## User stories

- As a Super Admin, I want to onboard a new tenant so the business can start configuration.
- As a platform operator, I want to suspend a tenant safely when required.
- As platform support, I want a tenant summary view without accessing tenant business records casually.

## UI screens and interactions

- platform dashboard home
- tenant list screen
- tenant detail screen
- create tenant form
- tenant lifecycle action controls

## Data model changes

- `Tenant`
- `TenantSettings`
- optional `TenantNote` or equivalent support metadata if adopted later
- platform audit log records

## API endpoints or operations

- `GET /platform/tenants`
- `POST /platform/tenants`
- `GET /platform/tenants/:tenantId`
- `PATCH /platform/tenants/:tenantId`
- `POST /platform/tenants/:tenantId/activate`
- `POST /platform/tenants/:tenantId/suspend`
- `POST /platform/tenants/:tenantId/archive`

## Validation and business rules

- only platform roles may access these operations
- tenant status changes must be auditable
- suspended tenants must have downstream access restrictions enforced
- platform summaries must avoid accidental disclosure of sensitive tenant operational detail beyond stated need

## Security considerations

- strict platform route protection
- audit logs for all tenant lifecycle changes
- no implicit tenant impersonation in MVP

## Error and edge cases

- duplicate tenant slug or identifier
- tenant activation attempted before minimum onboarding data exists
- tenant suspension while active bookings exist

## Acceptance criteria

- platform users can create and manage tenant records
- tenant lifecycle actions are recorded and enforceable
- no tenant user can access platform screens or routes

## Automated testing requirements

- unit tests for tenant lifecycle policies
- integration tests for platform authorization and state transitions
- end-to-end tests for tenant creation and suspension flows

## Dependencies on other features

- `FND-001`
- `IAM-001`

## Explicit out-of-scope items

- tenant business operations
- subscription billing automation unless explicitly introduced later
