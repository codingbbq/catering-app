# Catering Management SaaS — Agent Instructions

## Project Context

This is a multi-tenant Catering Management SaaS for managing customers, enquiries, menus, food catalogues, costing, quotations, bookings, invoicing, payments, daily meal orders, inventory, and operational reporting.

The application must feel like professional, enterprise-grade business software used by established catering companies for daily operations.

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 and DaisyUI v5 (Executive Monochrome theme)
- **State & Data Fetching**: TanStack Query v5
- **Forms & Validation**: TanStack Form and Zod
- **Data Tables**: TanStack Table v8
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Monorepo**: pnpm workspaces (`apps/web`, `apps/api`, `packages/shared-types`)

Inspect installed versions before proposing or making changes.

## Architecture & Multi-Tenancy Rules

- **Tenant Isolation**: Row-level isolation must be preserved across all tenant data access queries. Never expose cross-tenant records.
- **Platform vs. Tenant Separation**: Keep platform Super Admin permissions and routes (`/platform/*`) strictly separate from tenant-level permissions and routes (`/tenant/[tenantSlug]/*`).
- **Shared Package Boundaries**: Reusable DTOs, enums, interfaces, and shared validation schemas belong in `packages/shared-types`. Keep shared packages framework-agnostic.
- **Strict TypeScript**: Strict mode is enforced. Keep responsibilities explicit and files modular.
- **API Conventions**: Follow documented REST conventions in `docs/architecture/API-CONVENTIONS.md`.
- **Security**: Never commit secrets or hardcoded credentials.

## Mandatory Design System Conventions

All UI development must strictly adhere to `docs/design-system/UI-GUIDELINES.md`:

1. **Executive Monochrome Theme**: The primary interface is strictly neutral (#171717 charcoal primary, #F5F5F4 page canvas, #FFFFFF card surface, #E5E5E5 border).
2. **No Vibrant Primary Colours**: Do not use pink, purple, bright blue, or multi-coloured gradients.
3. **Restrained Semantic Status Only**: Muted green (success), amber (warning), red (error), and neutral/stone (info/draft) may only be used to communicate real business status.
4. **Use DaisyUI Semantic Tokens**: Theme tokens defined in `apps/web/src/app/globals.css` must be used rather than ad-hoc inline styles.
5. **Reuse Shared Components**: Always use standardized components from `apps/web/src/components/ui/` (`StatusBadge`, `Card`, `PageHeader`, `EmptyState`) and table/form primitives.
6. **Layout Hierarchy**: All tenant features must integrate into the responsive sidebar navigation layout in `/tenant/[tenantSlug]/*`.
7. **Accessibility**: Maintain accessible contrast ratios, visible keyboard focus rings, and proper form labeling.

## Feature Development Workflow

Before implementing any feature:

1. Read `docs/product/PRD.md`.
2. Read the relevant specification in `docs/features/`.
3. Read `docs/development/CURRENT-STATUS.md`.
4. Inspect existing related implementations.
5. Identify dependencies and affected modules across `apps/web`, `apps/api`, and `packages/shared-types`.
6. Present a concise implementation plan before making large modifications.
7. Implement only the approved scope.
8. Add or update relevant tests and type verifications.
9. Verify that existing functionality is not broken.
10. Update feature documentation and status.

## Definition of Done

A feature is complete only when:

- Acceptance criteria from its feature spec are satisfied.
- Strict compliance with `docs/design-system/UI-GUIDELINES.md` is verified.
- Tenant isolation and permission checks are enforced.
- TypeScript checks pass cleanly with zero errors (`tsc --noEmit`).
- No unrelated functionality or existing pages are broken.
- Feature documentation and current status are updated.

## Authoritative Documentation

- Product Requirements: `docs/product/PRD.md`
- UI Design System: `docs/design-system/UI-GUIDELINES.md`
- System Architecture: `docs/architecture/SYSTEM-ARCHITECTURE.md`
- Current Status: `docs/development/CURRENT-STATUS.md`

Do not treat previous chat messages as authoritative over repository documentation.
