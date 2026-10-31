# Decisions

## Purpose

This document records architectural decisions, working conventions, and important trade-offs so future development remains consistent across sessions.

## Confirmed baseline decisions

### Monorepo structure

- Keep the pnpm workspace monorepo.
- Keep deployable apps under `apps/*`.
- Keep reusable packages under `packages/*`.
- Do not introduce microservices unless there is a strong, explicit reason.

### Frontend stack

- Use Next.js App Router.
- Use React and strict TypeScript.
- Use Tailwind CSS and daisyUI for styling.
- Use TanStack Query for server state.
- Use TanStack Form with Zod validation for forms.
- Use TanStack Table for grids.

### Backend stack

- Use NestJS modules to organize domains.
- Use Prisma with PostgreSQL.
- Do not connect to external services during bootstrap unless explicitly required.
- Prefer configuration through environment variables with safe defaults.

### Shared packages

- Put reusable DTOs, enums, and validation schemas in `packages/shared-types`.
- Keep shared packages framework-agnostic unless a stronger reason appears.

## Platform architecture decisions

### Decision: modular monolith

Reason:

- fits the current team stage and product maturity
- reduces operational complexity
- supports sequential feature delivery

Trade-off:

- a modular monolith requires discipline in domain boundaries, but is simpler than microservices at this stage

### Decision: separate platform and tenant capabilities

Reason:

- the Super Admin Console is a platform capability, not a tenant-admin feature
- avoids blurred authorization rules

Trade-off:

- requires dual access models and route segmentation, but greatly reduces security ambiguity

### Decision: tenant isolation is non-negotiable

Reason:

- it is foundational to the SaaS model
- it reduces the highest-risk failure mode of the platform

Trade-off:

- introduces implementation overhead in every module, but this is preferable to retrofitting later

### Decision: sales-first MVP

Reason:

- customer, enquiry, menu, costing, quotation, and booking workflows create the earliest business value
- finance and operations depend on a stable commercial core

Trade-off:

- some tenants may want finance or operations earlier, but the roadmap favors the fastest coherent pilot release

### Decision: internal communication history before deep provider integrations

Reason:

- communication traceability matters early
- provider integrations can be added incrementally behind abstractions

Trade-off:

- first releases may log communication without full two-way provider synchronization

## Implementation conventions

- Build one feature at a time.
- Each feature should have a clear domain boundary, API contract, UI surface, and test plan.
- Prefer creating shared schemas only when more than one app/package needs them.
- Preserve existing documentation as the delivery plan source of truth.
- Keep files small and responsibilities explicit.

## Testing conventions

- Add unit tests for domain logic.
- Add integration tests for persistence, tenant scoping, and authorization.
- Add end-to-end coverage for primary user journeys.
- High-risk features must include tenancy boundary tests.

## Open decisions still requiring user input

- exact auth mechanism and provider choice
- whether one human identity can belong to multiple tenants in the first release
- branch/location model for tenants
- invoice numbering and tax model
- first communication providers
- depth of recipe costing in the pilot
- whether daily meal orders are in the first pilot or immediately after it
