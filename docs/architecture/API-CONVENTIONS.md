# API Conventions

## Goals

- Keep APIs consistent across modules
- Preserve tenant isolation
- Align contracts with shared Zod schemas where practical
- Make feature delivery incremental and testable

## API style

- Use JSON over HTTP for the core application API
- Organize controllers by domain module in NestJS
- Prefer resource-oriented routes for CRUD and workflow endpoints
- Use explicit workflow actions for state transitions when simple CRUD is not enough

## Route segmentation

Separate platform and tenant concerns clearly.

### Platform routes

Examples:

- `/platform/auth/*`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/users`

### Tenant routes

Examples:

- `/tenant/me`
- `/tenant/users`
- `/customers`
- `/enquiries`
- `/catalogue-items`
- `/menus`
- `/quotations`
- `/bookings`

Whether tenant routes are path-scoped or context-scoped can be finalized later, but tenant resolution must be explicit and consistent.

## Contract conventions

- Define reusable DTOs, enums, and validation schemas in `packages/shared-types` where they are shared across frontend and backend
- Keep transport contracts explicit instead of leaking ORM model shapes directly to the UI
- Separate create/update input contracts from read models when needed

## Naming conventions

- Use plural nouns for collection routes
- Use verb-based suffixes only for workflow transitions or special actions
- Use stable identifiers in URLs
- Keep request payload keys descriptive and domain-specific

## Response conventions

Recommended baseline structure:

- successful reads return typed resource or collection payloads
- successful commands return updated resource summaries or operation results
- paginated lists return items plus paging metadata
- validation errors return field-level details where practical

## Query conventions

Support a predictable query model for list endpoints:

- pagination
- sorting
- search where appropriate
- status filtering
- date range filtering for operational lists

## Error conventions

Use normalized error categories:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `TENANT_SCOPE_VIOLATION`
- `EXTERNAL_PROVIDER_ERROR`
- `INTERNAL_ERROR`

Error responses should avoid leaking sensitive data.

## Authorization conventions

- Enforce authorization at controller and service boundaries
- Distinguish platform permissions from tenant permissions
- Do not allow tenant admins to access platform routes
- Validate tenant ownership before data access or mutation

## Workflow endpoint examples

Examples:

- `POST /quotations/:quotationId/revisions`
- `POST /quotations/:quotationId/send`
- `POST /quotations/:quotationId/accept`
- `POST /bookings/:bookingId/confirm`
- `POST /catalogue-imports`

## Integration conventions

External communication providers should be abstracted behind application services. Domain modules should record delivery intent and result metadata without hard-coding provider-specific logic into controllers.

## Testing conventions

Each feature API should include:

- unit tests for service rules
- integration tests for persistence and tenancy checks where practical
- end-to-end coverage for primary success paths and authorization failures
