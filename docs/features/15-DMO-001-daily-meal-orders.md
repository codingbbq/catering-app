# DMO-001 Daily Meal Orders

## Feature ID and name

- Feature ID: `DMO-001`
- Feature name: `Daily Meal Orders`

## Purpose and business value

Support recurring or scheduled meal-service orders outside the event-booking workflow. This addresses tenants that operate daily meal delivery or regular institutional catering.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager
- Finance User

## Functional requirements

- create recurring meal customers/accounts if distinct from event customers
- capture daily meal orders by date and service slot
- manage order quantities and menu/plan references
- track order status
- prepare downstream invoice linkage and operational visibility

## User stories

- As a tenant user, I want to capture daily meal orders separately from one-time events.
- As an operations user, I want to view daily order volume by date and slot.
- As a finance user, I want meal orders to support invoicing.

## UI screens and interactions

- daily meal order list and calendar/date views
- create/edit order form
- order detail screen with customer, service date, quantity, and menu references

## Data model changes

- `DailyMealPlan`
- `DailyMealOrder`
- `DailyMealOrderLine`
- linkage to `Customer`, `Menu`, and `Invoice`

## API endpoints or operations

- `GET /daily-meal-orders`
- `POST /daily-meal-orders`
- `GET /daily-meal-orders/:orderId`
- `PATCH /daily-meal-orders/:orderId`
- `POST /daily-meal-orders/:orderId/confirm`

## Validation and business rules

- service date and slot are required
- order totals and quantities must be non-negative
- recurring templates and actual orders should be distinguishable if both are implemented
- invoice linkage should preserve historical pricing assumptions

## Security considerations

- customer delivery details and commercial terms are tenant-sensitive
- order volume data should remain tenant-isolated

## Error and edge cases

- duplicate orders for same customer/date/slot
- order changed after invoicing
- ambiguity between standing meal plans and actual confirmed orders

## Acceptance criteria

- tenant users can manage daily meal orders distinct from event bookings
- daily meal orders integrate cleanly with menus and later invoicing
- date-based operational views are available

## Automated testing requirements

- unit tests for recurring/order status rules
- integration tests for persistence, scoping, and invoice linkage
- end-to-end tests for creating and updating daily meal orders

## Dependencies on other features

- `CRM-001`
- `MEN-001`
- `CST-001`

## Explicit out-of-scope items

- consumer self-service ordering portal
- route optimization and fleet management
