# Current Status

## Current development phase

- Phase 1: Commercial Sales Workflow MVP

## Current feature

- `QTN-001` Quotations and Revisions (Completed)

## Completed features

- `FND-001` Tenant Isolation Foundation
- `IAM-001` Authentication and Session Management
- `PLT-001` Super Admin Console
- `TEN-001` Tenant Administration and User Management
- `CRM-001` Customer Management
- `CRM-002` Enquiry Management
- `CAT-001` Food Catalogue and Catalogue Import
- `MEN-001` Menu Builder
- `CST-001` Costing Engine
- `QTN-001` Quotations and Revisions

## Features in progress

- None

## Blocked features

- None

## Next recommended feature

- `BKG-001` Booking Management

## Current implementation baseline

- pnpm workspace monorepo configured
- Next.js 16 frontend with DaisyUI v5 executive monochrome theme
- NestJS backend with tenant-scoped controllers, services, guards, and audit logging
- Prisma/PostgreSQL schema with Tenant, User, Customer, Enquiry, CatalogueItem, CatalogueImportJob, Menu, MenuItem, Recipe, RecipeItem, CostSheet, CostSheetItem, Quotation, QuotationRevision, and QuotationLineItem models
- Shared contracts, Zod schemas, and deterministic quotation and costing calculation engines in `@catering/shared-types`
- Customer and Enquiry CRUD, timeline activities, status transitions, and qualification flows complete
- Food catalogue worklist, item creation/editing, archive/reactivate, gross margin calculator, and CSV bulk importer with validation and job tracking complete
- Menu builder worklist, course and section grouping, catalogue item browsing, custom dish configuration, real-time pricing and margin calculation, duplication, and archive/reactivate complete
- Costing Engine with component-based Recipe management, yields, portion costs, full itemized Cost Sheets (ingredients, labor, overheads, buffers), deterministic calculation engine, and quick interactive margin simulator complete
- Quotations & Revisions module with sequential numbering (`QT-YYYYMM-XXXX`), immutable revision history, Menu & Cost Sheet linkage, live itemized calculations, client presentation/print mode, send & acceptance flows, and CRM Enquiry conversion integration complete
