# OPS-003 Kitchen Operations

## Feature ID and name

- Feature ID: `OPS-003`
- Feature name: `Kitchen Operations`

## Purpose and business value

Translate commercial demand into production-facing planning so kitchen teams can prepare food accurately for bookings and daily meal orders.

## User roles and permissions

- Tenant Owner / Admin
- Operations Manager
- Kitchen Manager
- Kitchen Staff with limited update permissions if introduced later

## Functional requirements

- create kitchen production plans from bookings and daily meal orders
- organize tasks or preparation steps
- surface required quantities and due windows
- track production status at a practical level

## User stories

- As a kitchen manager, I want production plans based on confirmed demand.
- As an operations manager, I want to see kitchen readiness for upcoming services.
- As a business owner, I want less ad hoc coordination between sales and kitchen teams.

## UI screens and interactions

- production plan list screen
- production plan detail screen
- task/status update interactions
- date-based kitchen workload view

## Data model changes

- `KitchenProductionPlan`
- `KitchenTask`
- linkage to `Booking`, `DailyMealOrder`, and optional inventory references

## API endpoints or operations

- `GET /kitchen-production-plans`
- `POST /kitchen-production-plans`
- `GET /kitchen-production-plans/:planId`
- `PATCH /kitchen-production-plans/:planId`
- `POST /kitchen-production-plans/:planId/tasks`

## Validation and business rules

- production plans should be generated from confirmed demand sources
- task status lifecycle should be consistent and simple initially
- historical source quantities should remain stable once planning is generated

## Security considerations

- kitchen access remains tenant-scoped
- edit permissions may need tighter operational role boundaries

## Error and edge cases

- booking/date changes after production plan creation
- one production plan covering multiple sources versus one source per plan remains a design decision
- inventory shortage handling not fully defined in first version

## Acceptance criteria

- tenant operations users can create and manage production plans
- plans are linked to confirmed bookings or daily meal orders
- simple production status tracking is available

## Automated testing requirements

- unit tests for source-to-plan eligibility rules
- integration tests for plan persistence and scoping
- end-to-end tests for generating and updating a production plan

## Dependencies on other features

- `BKG-001`
- `DMO-001`
- `OPS-001`

## Explicit out-of-scope items

- detailed HACCP/compliance tooling
- workforce scheduling and time tracking
