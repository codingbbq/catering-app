# Current Status

## Current development phase

- Phase 1: Commercial Sales Workflow MVP

## Current feature

- `OPS-002` Procurement and Suppliers (Completed)

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
- `DMO-001` Daily Meal Orders
- `OPS-001` Inventory Management
- `OPS-002` Procurement and Suppliers
- `OPS-003` Kitchen Operations
- `RPT-001` Reporting and Dashboards

## Features in progress

- None

## Blocked features

- None

## Next recommended feature

- Feature expansion or deployment preparation

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
- Daily Meal Orders & Plans module (`DMO-001`) with sequential numbering (`DMO-YYYYMM-XXXX` and `DMP-YYYYMM-XXXX`), customer standing plan subscription management, service slots (`breakfast`, `morning_tea`, `lunch`, `afternoon_tea`, `dinner`, `snack`), operational Kitchen & Dispatch Board with slot volume metrics and rapid status progression (`draft`, `confirmed`, `in_preparation`, `dispatched`, `delivered`, `cancelled`), order register table, recurring order batch generation engine, downstream invoice pre-fill linkage, and strict tenant database currency adoption (e.g. INR) complete
- Inventory Management module (`OPS-001`) with sequential movement numbering (`SM-YYYYMM-XXXX`), stock item catalog management, atomic stock movements (`purchase_received`, `kitchen_consumption`, `waste_spoilage`, `adjustment_in`, `adjustment_out`, `transfer`, `return_to_supplier`), insufficient stock safeguards, par level and reorder point alerts, full movements audit ledger, category valuation breakdown, and strict tenant database currency adoption (e.g. INR ₹, USD $, EUR €) across all unit costs, total stock valuations, and movement transaction values complete
- Procurement and Suppliers module (`OPS-002`) with sequential purchase order numbering (`PO-YYYYMM-XXXX`), vendor profile and credit terms management (`due_on_receipt`, `net_15`, `net_30`, `net_45`, `net_60`), itemized purchase ordering with catalogue stock auto-population, status progression (`draft` -> `ordered` -> `partially_received` -> `received` / `cancelled`), atomic receiving workflow generating verified `purchase_received` stock movements (`SM-YYYYMM-XXXX`) directly incrementing on-hand stock and updating unit costs in Inventory (`OPS-001`), Executive Monochrome tabbed management hub (`/procurement`), printable purchase order documentation, and strict tenant database currency consistency (INR, USD, EUR, etc.) complete
- Kitchen Operations module (`OPS-003`) with sequential production plan numbering (`KPP-YYYYMM-XXXX`), automated demand conversion from confirmed Bookings (`BKG-001`) and Daily Meal Orders (`DMO-001`) as well as standalone plans, station-based mise-en-place and prep task workflows (`prep`, `hot_kitchen`, `cold_kitchen`, `bakery_pastry`, `assembly_packing`, `beverages`, `other`), interactive Workload & Kitchen Board view with quick station and date filtering, rapid task status progression (`pending` -> `in_progress` -> `completed` -> `blocked`), high-contrast printable Kitchen Chit sheet layout for station clipboards, and integrated inventory consumption deduction (`OPS-001`) complete
- Reporting and Dashboards module (`RPT-001`) with unified tenant dashboard overview metrics, dedicated multi-domain executive reporting suite (`/reports`) featuring Sales & Pipeline, Bookings & Operations, Finance & Cashflow, and Daily Meals & Stock tabs, flexible period filtering (`7d`, `30d`, `90d`, `this_month`, `this_quarter`, `this_year`, `all_time`), client-side CSV exports and print-ready report layouts, urgent operational attention alert feeds, Super Admin platform oversight summaries (`GET /platform/reports/tenant-summary`), and strict database-driven tenant currency adoption (e.g. INR ₹, USD $, EUR €) complete
