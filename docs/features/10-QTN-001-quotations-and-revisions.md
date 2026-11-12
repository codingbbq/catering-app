# QTN-001 Quotations and Revisions

## Feature ID and name

- Feature ID: `QTN-001`
- Feature name: `Quotations and Revisions`

## Purpose and business value

Enable tenant sales teams to generate quotations from enquiries, revise them, and preserve commercial history until acceptance or rejection.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Finance and operations users with read access as required

## Functional requirements

- create quotation from an enquiry
- associate menu and costing data
- support multiple revisions
- track quotation status lifecycle
- generate a shareable customer-ready representation
- mark quotation as accepted, rejected, expired, or superseded

## User stories

- As a sales user, I want to prepare and revise quotations quickly after an enquiry.
- As a business owner, I want historical revisions preserved for accountability.
- As an operations user, I want accepted quotations to flow into bookings.

## UI screens and interactions

- quotation list screen
- quotation detail screen
- quotation editor with revision creation
- send/share action
- status history and comparison view between revisions

## Data model changes

- `Quotation`
- `QuotationRevision`
- `QuotationLineItem`
- linkage to `Enquiry`, `Menu`, and `CostSheet`

## API endpoints or operations

- `GET /quotations`
- `POST /quotations`
- `GET /quotations/:quotationId`
- `POST /quotations/:quotationId/revisions`
- `POST /quotations/:quotationId/send`
- `POST /quotations/:quotationId/accept`
- `POST /quotations/:quotationId/reject`

## Validation and business rules

- quotation must reference a valid enquiry
- revisions must preserve immutable history
- accepted quotation rules must prevent conflicting later edits unless explicit supersede flow exists
- monetary totals must be stored, not only recalculated from mutable source data

## Security considerations

- quotation data includes customer and pricing details
- share/send operations must be authorized and auditable

## Error and edge cases

- revision created from an already accepted quotation
- quotation sent without mandatory customer contact details
- conflicting acceptance and rejection updates

## Acceptance criteria

- users can create quotations, revise them, and track status
- accepted quotation can become a booking candidate
- historical revisions remain preserved and reviewable

## Automated testing requirements

- unit tests for status transitions and revision rules
- integration tests for enquiry linkage, persistence, and tenant scoping
- end-to-end tests for create, revise, send, and accept flows

## Dependencies on other features

- `CRM-002`
- `MEN-001`
- `CST-001`

## Explicit out-of-scope items

- digital signature workflow unless selected later
- customer self-service acceptance portal in the initial release

## Implementation and Verification Status

- Status: `COMPLETED`
- Database: `Quotation`, `QuotationRevision`, `QuotationLineItem` models, indexes, and relations in Prisma schema.
- Shared Types: Zod schemas, TypeScript types, and deterministic `calculateQuotationTotals` calculation engine in `@catering/shared-types`.
- Backend Service: `QuotationsService` and `QuotationsController` with tenant isolation, auto-generated quotation numbering (`QT-YYYYMM-XXXX`), sequential revision numbering, immutable historical snapshots, draft editing protection, send/accept/reject transitions, enquiry synchronization, and audit logging.
- Tests: 7 unit test suites in `quotations.service.spec.ts` (tenant isolation, revision creation, immutability, deterministic calculations, status transitions) passing cleanly with 53 total unit tests passing in the API suite.
- Frontend: Responsive worklist with pipeline metrics cards, status and search filtering, quotation creation page linked to enquiries, full revision editor with line-item management and live margin previews, customer-ready printable proposal view, and integrated sidebar navigation.
