# FIN-002 Payments

## Feature ID and name

- Feature ID: `FIN-002`
- Feature name: `Payments`

## Purpose and business value

Track payments received against invoices so tenant businesses can manage balances and reconcile customer obligations inside the platform.

## User roles and permissions

- Tenant Owner / Admin
- Finance User
- Sales users with read-only visibility as needed

## Functional requirements

- record payment receipt
- allocate payments to invoices
- support partial and full payments
- show outstanding balances
- keep audit history for adjustments and reversals when introduced

## User stories

- As a finance user, I want to record customer payments so invoices reflect correct balances.
- As a business owner, I want visibility into overdue or partially paid invoices.
- As a sales user, I want to know whether a booking has been financially settled.

## UI screens and interactions

- payment list screen
- payment record form
- allocation UI on invoice detail or payment detail
- balance summary on invoices

## Data model changes

- `Payment`
- `PaymentAllocation`

## API endpoints or operations

- `GET /payments`
- `POST /payments`
- `GET /payments/:paymentId`
- `POST /payments/:paymentId/allocations`
- `PATCH /payments/:paymentId`

## Validation and business rules

- payment amount must be positive
- allocated total cannot exceed payment amount
- invoice outstanding amount cannot become negative
- reversal policy must be defined before destructive adjustments are allowed

## Security considerations

- payment data is sensitive finance data
- finance edits should be restricted and auditable

## Error and edge cases

- duplicate payment recording
- over-allocation to an invoice
- payment recorded before invoice issue due to business exception

## Acceptance criteria

- tenant finance users can record and allocate payments
- invoice balances update consistently
- payment history remains auditable

## Automated testing requirements

- unit tests for allocation arithmetic and status changes
- integration tests for invoice-payment relationships and scoping
- end-to-end tests for partial and full payment allocation flows

## Dependencies on other features

- `FIN-001`

## Explicit out-of-scope items

- online payment gateway capture in the first release
- bank feed reconciliation
