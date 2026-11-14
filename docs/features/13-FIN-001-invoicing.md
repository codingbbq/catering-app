# FIN-001 Invoicing

## Feature ID and name

- Feature ID: `FIN-001`
- Feature name: `Invoicing`

## Purpose and business value

Generate invoices from commercial commitments such as bookings and daily meal orders so tenant businesses can bill customers consistently and track receivables.

## User roles and permissions

- Tenant Owner / Admin
- Finance User
- Sales and operations users with limited read access as required

## Functional requirements

- create invoice from booking and later daily meal order workflows
- support draft, issued, void, and paid/partially paid related statuses
- store invoice line items and totals
- produce customer-ready invoice view/export representation
- maintain invoice history and linkage to source business records

## User stories

- As a finance user, I want to create an invoice from a confirmed booking.
- As a business owner, I want invoice status visibility for outstanding revenue.
- As a sales user, I want to see whether a booking has been invoiced.

## UI screens and interactions

- invoice list screen
- invoice detail screen
- create invoice flow from booking or order context
- status update and void actions according to policy

## Data model changes

- `Invoice`
- `InvoiceLineItem`
- linkage to `Booking` and later `DailyMealOrder`

## API endpoints or operations

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:invoiceId`
- `PATCH /invoices/:invoiceId`
- `POST /invoices/:invoiceId/issue`
- `POST /invoices/:invoiceId/void`

## Validation and business rules

- invoice numbering strategy must be consistent once chosen
- issued invoices should not be freely mutable
- monetary totals and taxes must be stored explicitly
- source booking/order linkage must be preserved

## Security considerations

- invoices contain customer, pricing, and financial data
- edit and void actions require restricted permissions and audit logging

## Error and edge cases

- duplicate invoice for same booking or billing milestone
- voiding invoice with recorded payment allocations
- missing tax and numbering decisions for initial rollout

## Acceptance criteria

- tenant finance users can create and manage invoice records
- invoices remain linked to originating business records
- lifecycle transitions are controlled and auditable

## Automated testing requirements

- unit tests for invoice total and status rules
- integration tests for source linkage and scoping
- end-to-end tests for draft-to-issued invoice flow

## Dependencies on other features

- `BKG-001`
- `DMO-001` for meal-order invoice scenarios

## Explicit out-of-scope items

- full accounting ledger
- external accounting package synchronization


## Implementation Status

- Status: Completed
- Models: `Invoice`, `InvoiceLineItem`, `InvoicePayment` in Prisma schema with cascade delete & relations.
- Numbering: `INV-YYYYMM-XXXX` auto-incrementing per tenant.
- Currency Consistency: Fully adheres to tenant's configured currency (`tenantSettings.currencyCode`, e.g. INR ₹, USD $, EUR €) across storage, calculations, API responses, and frontend views (`useTenantCurrency()`).
- Lifecycle: `draft` -> `issued` -> `partially_paid` -> `paid` / `void`. Automatic overdue detection when `dueDate < today` and `balanceDue > 0`.
- Payments: Multi-method payment recording (`bank_transfer`, `cash`, `credit_card`, `cheque`, `online`, `other`) with automatic balance calculation and status transition.
- Void Policy: Prohibits voiding invoices with recorded payments without adjustment; requires void reason and writes audit logs.
- Source Linkage: Direct linkage to `Booking`, pre-filling items from accepted Quotations, and creating activity timeline records.
- UI: Worklist dashboard with financial KPI cards, status tabs, search, creation form, customer-ready printable invoice view, payment modal, and void modal.
