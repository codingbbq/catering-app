# AI Project Instructions

## Architecture

- Use a pnpm workspace monorepo.
- Keep deployable applications under `apps/*`.
- Keep reusable packages under `packages/*`.
- Preserve clear tenant boundaries in all future domain models and API contracts.
- Do not introduce microservices unless explicitly requested.

## Backend conventions

- Use NestJS modules to organize domains.
- Keep request and response contracts aligned with shared Zod schemas where practical.
- Do not connect to external services during bootstrap unless explicitly required.
- Prefer configuration through environment variables with safe defaults.

## Frontend conventions

- Use Next.js App Router.
- Keep UI composition inside feature-oriented folders once features are introduced.
- Use TanStack Query for server state.
- Use TanStack Form with Zod validation for forms.
- Use TanStack Table for data grids.
- Use Tailwind CSS and daisyUI for styling.

## Shared package conventions

- Put reusable DTOs, enums and validation schemas in `packages/shared-types`.
- Keep shared packages framework-agnostic unless there is a strong reason not to.

## Coding standards

- Use strict TypeScript.
- Keep files small and responsibilities explicit.
- Favor composition over inheritance.
- Avoid hidden side effects during module initialization.
- Never commit secrets.
