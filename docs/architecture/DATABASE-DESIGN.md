# Database Design

## Design goals

- Preserve strict tenant isolation
- Support a sales-first MVP and later operational expansion
- Keep the schema understandable for a modular monolith
- Model workflow history explicitly where business traceability matters
- Support both event catering and daily meal workflows

## Data modeling principles

- Use a platform-level tenant table for business onboarding and lifecycle
- Use tenant-scoped tables for business operations
- Prefer explicit foreign keys over implicit JSON coupling for core workflows
- Use status fields plus timestamped history records for important state transitions
- Normalize core entities first; denormalize only for measured reporting needs later

## Core entity groups

### Platform and identity

- `Tenant`
- `TenantSettings`
- `PlatformUser`
- `PlatformRole`
- `TenantUser`
- `TenantRole`
- `UserInvitation`
- `Session` or session-related persistence if required by the chosen auth approach
- `AuditLog`

### CRM and sales

- `Customer`
- `CustomerContact`
- `Enquiry`
- `EnquiryActivity`
- `CatalogueItem`
- `CatalogueImportJob`
- `Menu`
- `MenuItem`
- `Recipe`
- `RecipeItem`
- `CostSheet`
- `Quotation`
- `QuotationRevision`
- `QuotationLineItem`
- `Booking`
- `BookingSchedule`
- `CommunicationLog`

### Finance and recurring meals

- `Invoice`
- `InvoiceLineItem`
- `Payment`
- `PaymentAllocation`
- `DailyMealPlan`
- `DailyMealOrder`
- `DailyMealOrderLine`

### Operations

- `InventoryItem`
- `StockMovement`
- `Supplier`
- `PurchaseOrder`
- `PurchaseOrderLine`
- `KitchenProductionPlan`
- `KitchenTask`

## Tenant boundary strategy

Recommended baseline:

- Every tenant-owned business table contains `tenantId`
- Unique constraints should be tenant-aware where relevant
- Repository and Prisma access layers must always include tenant scoping for tenant records
- Super Admin platform tables may be global, but their relationships into tenant business tables must be explicit and guarded

## Suggested core field patterns

For most business tables:

- `id`
- `tenantId` where tenant-scoped
- `status`
- `createdAt`
- `updatedAt`
- `createdByUserId` where auditability is important
- `archivedAt` or soft-delete strategy only where justified

## Commercial workflow relationships

- A `Customer` may have many `CustomerContact` records
- A `Customer` may have many `Enquiry` records
- An `Enquiry` may have many `CommunicationLog`, `Quotation`, and activity records
- A `Quotation` may have many revisions
- An accepted `Quotation` may produce a `Booking`
- A `Booking` may later produce invoices and operational records

## Costing model direction

Support two costing modes:

- simple costing: direct cost and markup/margin values on a line item or cost sheet
- recipe-based costing: a recipe composed of ingredients or component items with calculated totals

Open design questions:

- whether unit-of-measure normalization is required in the first costing release
- whether wastage, yield, and prep-loss factors are MVP or post-MVP concerns

## Daily meal model direction

The daily meal domain should support:

- recurring customer/account configuration
- service date and service slot
- meal plan or menu reference
- quantity and delivery/collection details
- invoice linkage

Open question:

- whether daily meals belong to the pilot release for selected tenants or only after finance basics are complete

## Audit and history

Critical workflow entities should preserve history:

- tenant lifecycle changes
- user role changes
- enquiry status changes
- quotation revisions and approval/send events
- booking confirmation changes
- invoice status changes
- payment allocations

## Prisma direction

Prisma models should mirror domain boundaries clearly. Avoid placing cross-domain business logic inside Prisma schema comments or migration-only conventions; keep workflow rules in application code.
