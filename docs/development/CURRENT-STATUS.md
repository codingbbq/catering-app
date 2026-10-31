# Current Status

## Current development phase

- Phase 0: Project foundation and engineering conventions

## Current feature

- None in active implementation yet
- Project is currently at scaffold-and-plan stage only

## Completed features

- None

## Features in progress

- None

## Blocked features

- None currently blocked at the product-planning level

## Next recommended feature

- `FND-001` Tenant Isolation Foundation

## Important unresolved decisions

- authentication approach and session strategy
- exact tenant/user identity model across multiple tenants
- whether pilot tenants need multi-branch/location support
- quotation approval workflow before customer send, if any
- tax, invoice numbering, and currency rules
- scope and timing of daily meal orders in the first pilot
- first communication providers for WhatsApp, email, and SMS
- first-release depth for recipe costing, unit conversions, and yield/wastage modeling

## Current implementation baseline

- pnpm workspace monorepo scaffold exists
- Next.js frontend scaffold exists
- NestJS backend scaffold exists
- Prisma/PostgreSQL baseline configuration exists
- shared types and shared config packages exist
- no business-domain features have been implemented yet

## Immediate recommendation

Start with `FND-001`, then `IAM-001`, before any business-domain UI or API feature work begins.
