# Catering Management SaaS — Agent Instructions

## Project Context

This is a multi-tenant Catering Management SaaS
for managing customers, enquiries, menus, quotations,
bookings, invoicing, payments, daily meal orders,
inventory and reporting.

The application must feel like professional,
enterprise-grade business software.

## Technology Stack

- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS and DaisyUI
- Forms: TanStack Form and Zod
- Data fetching: TanStack Query
- Backend: NestJS
- Database: PostgreSQL with Prisma

Inspect installed versions before making changes.

## Mandatory Design Rules

1. Follow docs/design-system/UI-GUIDELINES.md.
2. Use the Executive Monochrome design system.
3. Primary UI colours must be neutral.
4. Do not introduce pink, purple, bright blue,
   decorative gradients or colourful cards.
5. Use DaisyUI components and semantic theme tokens.
6. Reuse existing shared components.
7. Maintain consistent spacing, typography,
   borders and responsive behaviour.
8. Use colour only when it conveys business meaning.
9. Maintain accessible contrast and focus states.
10. Do not redesign unrelated pages.

## Architecture Rules

- Preserve tenant isolation across all data access.
- Keep platform Super Admin permissions separate
  from tenant-level permissions.
- Follow existing frontend/backend boundaries.
- Use Zod for input validation where appropriate.
- Do not introduce dependencies unnecessarily.
- Do not duplicate existing business logic.

## Feature Development

Before implementing a feature:

1. Read docs/product/PRD.md.
2. Read the relevant docs/features specification.
3. Read docs/development/CURRENT-STATUS.md.
4. Inspect existing related implementations.
5. Identify dependencies and affected modules.
6. Present a concise implementation plan.
7. Implement only the approved scope.
8. Add or update relevant tests.
9. Verify existing functionality.
10. Update feature documentation and status.

## Definition of Done

A feature is complete only when:

- Its acceptance criteria are satisfied.
- It follows the established design system.
- Tenant isolation and permissions are enforced.
- Relevant validation and tests pass.
- No unrelated functionality is broken.
- Documentation is updated.

## Important

Do not treat previous chat messages as the
authoritative project specification.

The repository documentation and approved
design system are the source of truth.

If instructions conflict, identify the conflict
and ask for clarification before proceeding.


## Shared package conventions

- Put reusable DTOs, enums and validation schemas in `packages/shared-types`.
- Keep shared packages framework-agnostic unless there is a strong reason not to.

## Coding standards

- Use strict TypeScript.
- Keep files small and responsibilities explicit.
- Favor composition over inheritance.
- Avoid hidden side effects during module initialization.
- Never commit secrets.
