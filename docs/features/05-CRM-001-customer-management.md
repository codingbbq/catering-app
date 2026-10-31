# CRM-001 Customer Management

## Feature ID and name

- Feature ID: `CRM-001`
- Feature name: `Customer Management`

## Purpose and business value

Provide a tenant-scoped customer database that centralizes accounts, contacts, and relationship history needed for enquiries, quotations, bookings, and recurring meal business.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations and Finance users with read access as needed

## Functional requirements

- create and update customer accounts
- manage multiple contacts per customer
- search and filter customer list
- store customer notes and key relationship attributes
- mark customers as active or inactive

## User stories

- As a sales user, I want to create a customer record before logging an enquiry.
- As an operations user, I want to review the customer associated with a booking.
- As a finance user, I want to reference the same customer when invoicing.

## UI screens and interactions

- customer list screen
- customer detail screen
- customer create/edit form
- contact management within customer detail

## Data model changes

- `Customer`
- `CustomerContact`
- optional customer notes/activity support

## API endpoints or operations

- `GET /customers`
- `POST /customers`
- `GET /customers/:customerId`
- `PATCH /customers/:customerId`
- `POST /customers/:customerId/contacts`
- `PATCH /customers/:customerId/contacts/:contactId`

## Validation and business rules

- customer names and primary contact channels should meet minimum validity rules
- duplicate detection should be basic at first, at least by tenant and name/email/phone heuristics
- inactive customers should remain referenceable by existing records

## Security considerations

- customer PII must stay tenant-scoped
- list/search endpoints must not leak cross-tenant contact data

## Error and edge cases

- duplicate contact email or phone under same customer
- enquiry creation against inactive customer if business policy forbids it
- customer merge requirement identified but not implemented

## Acceptance criteria

- tenant users can manage customers and contacts
- customers can be selected by later enquiry and quotation workflows
- customer records remain tenant-isolated and searchable

## Automated testing requirements

- unit tests for duplicate and status rules
- integration tests for tenant scoping and CRUD flows
- end-to-end tests for creating and editing customers

## Dependencies on other features

- `FND-001`
- `IAM-001`
- `TEN-001`

## Explicit out-of-scope items

- customer portal
- automated lead capture from external forms unless added later
