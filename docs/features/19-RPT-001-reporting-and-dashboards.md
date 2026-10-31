# RPT-001 Reporting and Dashboards

## Feature ID and name

- Feature ID: `RPT-001`
- Feature name: `Reporting and Dashboards`

## Purpose and business value

Provide visibility into pipeline, quoting, bookings, finance, and operations so tenant businesses and platform operators can make better decisions.

## User roles and permissions

- Super Admin for platform-level tenant summaries
- Tenant Owner / Admin
- Sales Manager
- Operations Manager
- Finance User

## Functional requirements

- tenant dashboard summaries for key workflow metrics
- platform dashboard summaries for tenant oversight
- report filters by date/status where relevant
- export-friendly reporting outputs later if needed

## User stories

- As a tenant owner, I want to see sales and booking performance at a glance.
- As a finance user, I want invoice and payment visibility.
- As a Super Admin, I want high-level tenant activity insights without replacing tenant analytics.

## UI screens and interactions

- platform summary dashboard
- tenant summary dashboard
- report detail/list screens by domain
- date and status filtering controls

## Data model changes

- reporting may use derived queries first
- dedicated reporting tables or snapshots are optional later optimization, not a first requirement

## API endpoints or operations

- `GET /reports/sales-summary`
- `GET /reports/booking-summary`
- `GET /reports/finance-summary`
- `GET /platform/reports/tenant-summary`

## Validation and business rules

- all tenant reports must stay tenant-scoped
- platform reports must avoid exposing tenant business detail beyond approved scope
- metric definitions must be documented and stable

## Security considerations

- dashboards aggregate sensitive business data
- platform reporting must not become a backdoor to operational tenant detail

## Error and edge cases

- missing historical data for newly introduced modules
- inconsistent metric definitions across phases if not standardized early
- heavy report queries requiring optimization later

## Acceptance criteria

- tenant users can view summary metrics for implemented domains
- platform users can view limited tenant-level oversight metrics
- metric definitions are documented and testable

## Automated testing requirements

- unit tests for metric calculations where encapsulated
- integration tests for tenant/platform scoping
- end-to-end tests for dashboard access and filters

## Dependencies on other features

- depends on implemented source domains; minimum useful dependency set is `CRM-002`, `QTN-001`, `BKG-001`, and `FIN-002`

## Explicit out-of-scope items

- data warehouse or BI pipeline
- predictive analytics and forecasting
