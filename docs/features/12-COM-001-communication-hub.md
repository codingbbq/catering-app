# COM-001 Communication Hub

## Feature ID and name

- Feature ID: `COM-001`
- Feature name: `Communication Hub`

## Purpose and business value

Centralize communication history related to enquiries, quotations, and bookings, and prepare clean extension points for email, SMS, and WhatsApp integrations.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager
- Platform roles should not access tenant communication logs without explicit platform support rules

## Functional requirements

- record outbound communication events and basic metadata
- associate messages with enquiries, quotations, or bookings
- support template-ready message composition later
- track delivery status where provider integrations exist
- provide chronological communication history in relevant screens

## User stories

- As a sales user, I want all customer communication visible beside the enquiry or quotation.
- As an operations user, I want delivery confirmations and reminders traceable.
- As a business owner, I want customer-facing communication history retained with the record.

## UI screens and interactions

- communication timeline within enquiry/quotation/booking details
- optional message composer modal or page
- delivery status badges and retry/error display when integrations exist

## Data model changes

- `CommunicationLog`
- optional `CommunicationTemplate` later if templating is added

## API endpoints or operations

- `GET /communications`
- `POST /communications`
- `GET /communications/:communicationId`
- `POST /communications/:communicationId/retry` if provider send is asynchronous

## Validation and business rules

- communication records must reference a supported business context
- provider-specific payloads should be normalized before persistence
- failed messages should remain visible with status and error summary

## Security considerations

- customer contact channels are sensitive data
- raw provider secrets and secure tokens must never be exposed in logs or UI
- template or message content may contain confidential pricing/event detail

## Error and edge cases

- outbound message recorded without successful provider delivery
- duplicate send caused by retry behavior
- inbound message threading unresolved in MVP

## Acceptance criteria

- communication history can be recorded and displayed against core sales/booking entities
- provider-ready architecture exists without forcing immediate external integration
- failure states are visible and traceable

## Automated testing requirements

- unit tests for context association and status transitions
- integration tests for tenant scoping and persistence
- end-to-end tests for viewing communication history and recording outbound events

## Dependencies on other features

- `CRM-002`
- `QTN-001`
- `BKG-001`

## Explicit out-of-scope items

- sophisticated inbox synchronization
- AI-generated reply suggestions

## Implementation Status

- **Status**: Completed
- **Delivered Capabilities**:
  - `CommunicationLog` and `CommunicationTemplate` models with tenant isolation and relations to `Customer`, `Enquiry`, `Quotation`, and `Booking`.
  - Provider abstraction interface (`CommunicationProvider`) with mock provider implementation simulating delivery and failure modes.
  - Multi-channel support (`email`, `sms`, `whatsapp`, `internal_note`) and lifecycle statuses (`draft`, `pending`, `sent`, `delivered`, `failed`).
  - Delivery failure tracking and retry mechanism (`POST /communications/:id/retry`).
  - Pre-seeded system message templates with dynamic variable interpolation (`{{customer_name}}`, `{{quotation_number}}`, `{{booking_number}}`, `{{amount}}`, `{{currency}}`, `{{event_date}}`, `{{venue}}`).
  - Dedicated Communication Hub dashboard at `/tenant/[tenantSlug]/communications` with KPI metric counters, channel tabs, multi-attribute filtering, and composer modal.
  - Detail modal with delivery tracking, provider reference IDs, and error diagnostics.
  - Embedded `EntityCommunicationsTimeline` integrated into Enquiry, Quotation, and Booking detail pages.
  - Automatic communication logging when quotations are sent or bookings are confirmed.
  - Strict Executive Monochrome design standard and dynamic tenant currency formatting.
