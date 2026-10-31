# BKG-001 Booking Management

## Feature ID and name

- Feature ID: `BKG-001`
- Feature name: `Booking Management`

## Purpose and business value

Convert accepted quotations into trackable bookings and maintain core fulfillment-facing details for event execution.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager
- Read access for kitchen and finance users as needed

## Functional requirements

- create booking from accepted quotation
- capture event/service schedule, venue, delivery, and contact details
- track booking status lifecycle
- provide calendar/list views for upcoming bookings
- preserve commercial and communication linkage

## User stories

- As a sales user, I want to confirm a booking after quotation acceptance.
- As an operations manager, I want a clear list of upcoming bookings and service details.
- As a finance user, I want invoices to be tied to confirmed bookings later.

## UI screens and interactions

- booking list/calendar screen
- booking detail screen
- booking confirmation flow from quotation
- status update controls

## Data model changes

- `Booking`
- `BookingSchedule`
- linkage to `Quotation` and `Customer`

## API endpoints or operations

- `GET /bookings`
- `POST /bookings`
- `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId`
- `POST /bookings/:bookingId/confirm`
- `POST /bookings/:bookingId/cancel`

## Validation and business rules

- bookings should normally originate from accepted quotations
- booking status transitions must be constrained
- critical event date/time changes should be traceable

## Security considerations

- event venue and contact data are sensitive customer information
- only authorized tenant users should modify booking details

## Error and edge cases

- double-booking risk is noted but conflict detection depth remains a future enhancement
- quotation accepted after booking already created
- cancelled booking with existing downstream invoice or kitchen dependencies

## Acceptance criteria

- accepted quotations can be converted to bookings
- operations users can view and maintain booking details
- booking history remains linked to the sales record

## Automated testing requirements

- unit tests for quotation-to-booking transition rules
- integration tests for booking CRUD and scoping
- end-to-end tests for conversion from accepted quotation to booking

## Dependencies on other features

- `QTN-001`

## Explicit out-of-scope items

- advanced resource scheduling and staff rostering
- conflict optimization engines
