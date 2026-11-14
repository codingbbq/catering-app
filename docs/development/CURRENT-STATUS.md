# Current Status

## Current development phase

- Phase 1: Commercial Sales Workflow MVP

## Current feature

- `FIN-002` Payments (Completed)

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
- `BKG-001` Booking Management
- `COM-001` Communication Hub
- `FIN-001` Invoicing
- `FIN-002` Payments

## Features in progress

- None

## Blocked features

- None

## Next recommended feature

- `DMO-001` Daily Meal Orders

## Current implementation baseline

- pnpm workspace monorepo configured
- Next.js 16 frontend with DaisyUI v5 executive monochrome theme
- NestJS backend with tenant-scoped controllers, services, guards, and audit logging
- Prisma/PostgreSQL schema with Tenant, User, Customer, Enquiry, CatalogueItem, CatalogueImportJob, Menu, MenuItem, Recipe, RecipeItem, CostSheet, CostSheetItem, Quotation, QuotationRevision, QuotationLineItem, Booking, BookingSchedule, CommunicationLog, CommunicationTemplate, Invoice, InvoiceLineItem, InvoicePayment, Payment, and PaymentAllocation models
- Shared contracts, Zod schemas, and deterministic calculation engines in `@catering/shared-types`
- Customer and Enquiry CRUD, timeline activities, status transitions, and qualification flows complete
- Food catalogue worklist, item creation/editing, archive/reactivate, gross margin calculator, and CSV bulk importer with validation and job tracking complete
- Menu builder worklist, course and section grouping, catalogue item browsing, custom dish configuration, real-time pricing and margin calculation, duplication, and archive/reactivate complete
- Costing Engine with component-based Recipe management, yields, portion costs, full itemized Cost Sheets (ingredients, labor, overheads, buffers), deterministic calculation engine, and quick interactive margin simulator complete
- Quotations & Revisions module with sequential numbering (`QT-YYYYMM-XXXX`), immutable revision history, Menu & Cost Sheet linkage, live itemized calculations, client presentation/print mode, send & acceptance flows, and CRM Enquiry conversion integration complete
- Booking Management module with sequential numbering (`BK-YYYYMM-XXXX`), quotation-to-booking conversion, execution status lifecycle (`draft`, `confirmed`, `in_progress`, `completed`, `cancelled`), service schedule timeline milestones, operations table & calendar views, and CRM timeline activity integration complete
- Communication Hub module with multi-channel support (`email`, `sms`, `whatsapp`, `internal_note`), provider abstraction interface, delivery state tracking (`draft`, `pending`, `sent`, `delivered`, `failed`), retry mechanism, template engine with dynamic placeholder interpolation, dedicated Communication Hub dashboard, and embedded communication timelines across Enquiry, Quotation, and Booking details complete
- Invoicing module with sequential numbering (`INV-YYYYMM-XXXX`), booking-to-invoice pre-fill & standalone drafting, full lifecycle management (`draft`, `issued`, `partially_paid`, `paid`, `void`), partial and full payment allocation tracking, automatic balance due & overdue status calculation, customer print/export invoice document view, void protection with audit logging, and strict tenant currency consistency (INR, USD, EUR, etc.) complete
- Payments module (`FIN-002`) with sequential numbering (`PAY-YYYYMM-XXXX`), customer receipt tracking, multi-invoice allocation and deallocation with atomic balance synchronization, unallocated customer credit management, status lifecycle (`unallocated`, `partially_allocated`, `allocated`, `void`), void protection with invoice balance reversal, executive monochrome payment dashboard with KPI metrics, and strict database tenant currency consistency complete
