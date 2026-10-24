# Catering SaaS Monorepo

Production-oriented monorepo baseline for a multi-tenant catering SaaS.

## Stack

- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS, daisyUI
- Backend: NestJS, TypeScript
- Data: PostgreSQL, Prisma
- Validation and shared contracts: Zod
- Client state: TanStack Query
- Forms: TanStack Form
- Tables: TanStack Table
- Testing: Vitest and Playwright
- Package manager: pnpm workspaces

## Monorepo layout

- `apps/web`: Next.js frontend
- `apps/api`: NestJS backend
- `packages/shared-types`: shared contracts and schema package
- `packages/eslint-config`: shared ESLint configuration
- `packages/typescript-config`: shared TypeScript configuration

## Requirements

- Node.js 22+
- pnpm 11+

## Setup

1. Install dependencies:
   - `pnpm install`
2. Start the frontend:
   - `pnpm dev:web`
3. Start the backend:
   - `pnpm dev:api`
4. Start both apps:
   - `pnpm dev`

## Quality checks

- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Build: `pnpm build`
- Tests: `pnpm test`

## Environment files

Copy the example files before local development:

- `apps/web/.env.example`
- `apps/api/.env.example`

Never commit real secrets.

## Notes

- No business modules are implemented yet.
- Prisma is configured without running migrations.
- PostgreSQL is not assumed to be running.
- External integrations are intentionally deferred.
