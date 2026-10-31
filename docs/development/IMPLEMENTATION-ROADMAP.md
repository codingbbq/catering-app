# Implementation Roadmap

## Roadmap principles

- Deliver the product one feature at a time.
- Preserve tenant isolation as a foundational requirement.
- Keep Super Admin Console work separate from tenant administration.
- Prioritize the sales workflow before finance and operations.
- Keep the architecture as a modular monolith inside the current pnpm workspace.

## Smallest useful MVP

The smallest useful MVP that can be released to pilot catering businesses includes:

- `FND-001` Tenant Isolation Foundation
- `IAM-001` Authentication and Session Management
- `PLT-001` Super Admin Console
- `TEN-001` Tenant Administration and User Management
- `CRM-001` Customer Management
- `CRM-002` Enquiry Management
- `CAT-001` Food Catalogue and Catalogue Import
- `MEN-001` Menu Builder
- `CST-001` Costing Engine
- `QTN-001` Quotations and Revisions
- `BKG-001` Booking Management
- `COM-001` Communication Hub

This MVP supports tenant onboarding, core CRM, pricing, quotations, booking conversion, and communication history.

## Phase 0: Project foundation and engineering conventions

### Goals

- Finalize feature delivery conventions and modular boundaries
- Preserve tenant isolation and platform-versus-tenant separation from the start
- Establish implementation patterns for shared contracts, testing, and documentation

### Features included

- `FND-001` Tenant Isolation Foundation
- engineering standards captured in `DECISIONS.md`

### Dependencies

- none

### Completion criteria

- tenancy foundation rules are documented and adopted
- route segmentation between platform and tenant contexts is agreed
- shared contract strategy is agreed
- test strategy for API, UI, and end-to-end coverage is defined

### Testing requirements

- baseline unit and integration testing conventions documented
- tenancy isolation tests defined as a mandatory requirement for tenant-scoped features

## Phase 1: Authentication, tenant management and Super Admin Console

### Goals

- establish authenticated access
- enable platform-operated tenant lifecycle management
- enable tenant-level administration and user onboarding

### Features included

- `IAM-001`
- `PLT-001`
- `TEN-001`

### Dependencies

- `FND-001`

### Completion criteria

- users can sign in and sign out
- platform users can create and manage tenants
- tenant admins can manage tenant users and core business settings
- authorization boundaries between platform and tenant roles are tested

### Testing requirements

- auth flow end-to-end coverage
- platform route authorization tests
- tenant user invitation and deactivation tests

## Phase 2: Customers, enquiries and food catalogue

### Goals

- deliver the CRM intake layer
- make the catalogue reusable for later menu and quotation features

### Features included

- `CRM-001`
- `CRM-002`
- `CAT-001`

### Dependencies

- Phase 1 complete

### Completion criteria

- tenant users can manage customers and contacts
- tenant users can create and track enquiries
- tenant users can manage catalogue items and import catalogue data

### Testing requirements

- CRUD and tenant-scope integration tests
- enquiry lifecycle tests
- catalogue import validation tests

## Phase 3: Menu builder, costing and quotations

### Goals

- enable menu composition
- provide pricing logic and margin visibility
- support revisioned quotations ready for customer communication

### Features included

- `MEN-001`
- `CST-001`
- `QTN-001`

### Dependencies

- Phase 2 complete

### Completion criteria

- tenant users can build reusable menus
- simple and recipe-based costing works with deterministic outputs
- quotations can be created, revised, and accepted/rejected

### Testing requirements

- calculation unit tests with stable fixtures
- quotation lifecycle integration tests
- end-to-end enquiry-to-quotation flow tests

## Phase 4: Booking management and communication integrations

### Goals

- convert accepted quotations into operational bookings
- centralize communication history and prepare provider integrations

### Features included

- `BKG-001`
- `COM-001`

### Dependencies

- Phase 3 complete

### Completion criteria

- accepted quotations can become bookings
- booking details are operationally usable
- communication history is visible against enquiries, quotations, and bookings

### Testing requirements

- quotation-to-booking conversion tests
- communication context and status tests
- end-to-end booking confirmation workflow tests

## Phase 5: Invoicing, payments and daily meal orders

### Goals

- support initial finance workflows
- support recurring meal-service business outside event-only catering

### Features included

- `DMO-001`
- `FIN-001`
- `FIN-002`

### Dependencies

- Phase 4 complete for event finance flows
- `DMO-001` depends on menus and costing from Phase 3

### Completion criteria

- tenant users can manage daily meal orders
- invoices can be issued from supported source records
- payments can be allocated and balances tracked

### Testing requirements

- invoice total and status transition tests
- payment allocation tests
- daily-meal order lifecycle tests

## Phase 6: Inventory, procurement, kitchen operations and advanced reporting

### Goals

- expand the product into full operational management
- provide decision-support dashboards and operational visibility

### Features included

- `OPS-001`
- `OPS-002`
- `OPS-003`
- `RPT-001`

### Dependencies

- Phase 3 complete for costing references
- Phase 4 and Phase 5 complete for source operational demand and financial reporting

### Completion criteria

- inventory records and stock movement are tracked
- suppliers and purchase orders are manageable
- kitchen production plans can be created from confirmed demand
- dashboards expose stable metrics for implemented modules

### Testing requirements

- inventory arithmetic and procurement lifecycle tests
- kitchen plan generation tests
- dashboard scoping and metric-definition tests

## Recommended feature-by-feature implementation order

1. `FND-001`
2. `IAM-001`
3. `PLT-001`
4. `TEN-001`
5. `CRM-001`
6. `CRM-002`
7. `CAT-001`
8. `MEN-001`
9. `CST-001`
10. `QTN-001`
11. `BKG-001`
12. `COM-001`
13. `DMO-001`
14. `FIN-001`
15. `FIN-002`
16. `OPS-001`
17. `OPS-002`
18. `OPS-003`
19. `RPT-001`

## Notes on implementation sequencing

- `COM-001` can begin with internal logging/history before external provider sending.
- `FIN-001` depends on a decision about whether invoices can be raised before `DMO-001` is complete for non-event workflows; event-only invoicing could be delivered first if desired.
- `RPT-001` should consume existing source data rather than introduce a separate reporting subsystem initially.
