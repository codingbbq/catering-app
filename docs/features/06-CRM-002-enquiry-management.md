# CRM-002 Enquiry Management

## Feature ID and name

- Feature ID: `CRM-002`
- Feature name: `Enquiry Management`

## Purpose and business value

Track incoming sales opportunities from initial contact through qualification and quotation preparation. This is the entry point for the sales-first MVP workflow.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations users with read access as needed

## Functional requirements

- create enquiries linked to customers
- capture event or meal-service context
- track enquiry status and next action
- assign ownership
- record notes and timeline activity
- convert qualified enquiries into quotation preparation

## User stories

- As a sales user, I want to log an enquiry quickly so no lead is lost.
- As a sales manager, I want to see enquiry status and ownership.
- As an operations user, I want visibility into confirmed enquiries that become bookings later.

## UI screens and interactions

- enquiry list / pipeline view
- enquiry detail view
- enquiry create/edit form
- timeline or activity panel
- action to begin quotation creation

## Data model changes

- `Enquiry`
- `EnquiryActivity`
- linkage to `Customer`

## API endpoints or operations

- `GET /enquiries`
- `POST /enquiries`
- `GET /enquiries/:enquiryId`
- `PATCH /enquiries/:enquiryId`
- `POST /enquiries/:enquiryId/activities`
- `POST /enquiries/:enquiryId/qualify`

## Validation and business rules

- enquiry must belong to a customer
- status transitions should follow a defined lifecycle
- required event fields may vary for event catering versus daily meals
- closed or lost enquiries should remain historically visible

## Security considerations

- notes and activities may contain sensitive commercial detail
- authorization should allow only tenant users with relevant roles

## Error and edge cases

- incomplete enquiry information at intake time
- duplicate enquiry for same event/customer/date
- quotation requested from a lost enquiry

## Acceptance criteria

- tenant sales users can capture, update, and review enquiries
- enquiry lifecycle supports later quotation creation
- timeline history is preserved

## Automated testing requirements

- unit tests for status transitions and required fields
- integration tests for customer linkage and tenant scoping
- end-to-end tests for intake and update flows

## Dependencies on other features

- `CRM-001`

## Explicit out-of-scope items

- automated inbound email/WhatsApp parsing
- advanced lead scoring
