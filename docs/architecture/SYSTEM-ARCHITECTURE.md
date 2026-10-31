# System Architecture

## Current technical baseline

- Monorepo managed with pnpm workspaces
- Frontend in `apps/web` using Next.js App Router, React, TypeScript, Tailwind CSS, daisyUI, TanStack Query, TanStack Form, TanStack Table, and Zod
- Backend in `apps/api` using NestJS, TypeScript, Prisma, and PostgreSQL
- Shared contracts package in `packages/shared-types`
- Shared lint and TypeScript configuration packages in `packages/eslint-config` and `packages/typescript-config`

## Architectural style

The system should remain a modular monolith for the foreseeable roadmap:

- One Next.js frontend application
- One NestJS backend application
- One PostgreSQL database
- Shared workspace packages for contracts and common configuration

No microservices are required at this stage.

## High-level component model

### Web application

Responsibilities:

- Authentication flows and session-aware navigation
- Feature-oriented screens for Super Admin and tenant-facing business users
- Forms with Zod-backed validation integration
- Query-driven data loading and cache invalidation using TanStack Query
- Tables and operational worklists

### API application

Responsibilities:

- Domain modules organized by business capability
- Authentication, authorization, and tenant context enforcement
- Tenant-safe CRUD and workflow orchestration
- Validation, persistence, and auditing
- Integration adapters for communication providers and later external systems

### Database

Responsibilities:

- Persistent tenant, identity, CRM, sales, finance, and operations data
- Tenant-scoped business records
- Auditable history for important workflow transitions

### Shared types package

Responsibilities:

- Reusable DTOs, enums, and validation schemas that stay framework-agnostic where practical
- Stable shared contracts between frontend and backend

## Domain partitioning

Recommended NestJS modules:

- `identity`
- `tenancy`
- `super-admin`
- `customers`
- `enquiries`
- `catalogue`
- `menus`
- `costing`
- `quotations`
- `bookings`
- `communications`
- `invoicing`
- `payments`
- `daily-meals`
- `inventory`
- `procurement`
- `kitchen`
- `reporting`
- `audit`

Not all modules need to be implemented immediately. The roadmap should activate them sequentially.

## Tenant isolation model

Tenant isolation is foundational.

Required principles:

- Business records must always carry a tenant boundary.
- API operations must derive or verify tenant context before data access.
- Super Admin operations must use platform-scoped paths or guards and must not silently reuse tenant-scoped permissions.
- Shared identifiers must avoid accidental cross-tenant leakage in UI, logs, and exports.
- Later reporting must distinguish platform analytics from tenant analytics.

## Role model

Two role layers are required:

- Platform roles for Super Admin Console access
- Tenant roles for business administration and operational usage

These layers must remain separate in code, API policies, and UI navigation.

## Frontend structure direction

Recommended feature-oriented structure in `apps/web/src` once business features begin:

- `app/(public)` for unauthenticated routes
- `app/(platform)` for Super Admin Console routes
- `app/(tenant)` for tenant-facing routes
- `features/<feature-name>` for feature-specific UI composition, hooks, query logic, and forms
- `lib` for app-specific utilities
- `providers` for shared providers only

## Backend structure direction

Recommended feature-oriented structure in `apps/api/src`:

- `modules/<domain>` or top-level domain folders by NestJS module
- each module containing controller, service, DTO/schema adapters, repository/persistence logic, policy checks, and tests
- shared infrastructure for auth, tenancy, config, prisma access, and auditing

## Integration architecture

The application should not connect to external services during bootstrap.

External integrations should be introduced via provider abstractions and module boundaries:

- communication providers: WhatsApp, email, SMS
- later finance/export integrations if required

## Cross-cutting concerns

- authentication and authorization
- tenant context resolution
- validation
- audit logging
- idempotent workflow transitions where appropriate
- error normalization and API response consistency
- observability and operational logging

## Release strategy

The roadmap should prioritize a smallest useful pilot release that proves the sales workflow first. Finance and operations should layer on top of a stable commercial core.
