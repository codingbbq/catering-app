# MEN-001 Menu Builder

## Feature ID and name

- Feature ID: `MEN-001`
- Feature name: `Menu Builder`

## Purpose and business value

Allow tenant users to assemble menus from catalogue items and reusable structures. This speeds up quotation preparation and creates consistency across similar events and meal offerings.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager

## Functional requirements

- create reusable menus
- add, remove, and reorder items within a menu
- support menu descriptions and service context
- allow menus to be referenced in quotations
- optionally duplicate an existing menu as a starting point

## User stories

- As a sales user, I want to build a menu from catalogue items so I can prepare a quotation quickly.
- As an operations user, I want reusable menus so common offerings stay consistent.
- As a tenant admin, I want old menus preserved for historical reference.

## UI screens and interactions

- menu list screen
- menu builder screen with item selection and ordering
- menu detail view
- duplicate menu action

## Data model changes

- `Menu`
- `MenuItem`
- linkage to `CatalogueItem`

## API endpoints or operations

- `GET /menus`
- `POST /menus`
- `GET /menus/:menuId`
- `PATCH /menus/:menuId`
- `POST /menus/:menuId/items`
- `PATCH /menus/:menuId/items/:menuItemId`

## Validation and business rules

- menu items must reference valid tenant catalogue items
- archived catalogue items should not be added to new menus unless policy explicitly allows it
- menus referenced by quotations should retain historical integrity even if later edited

## Security considerations

- menu visibility must remain tenant-scoped
- edit permissions may differ from view permissions in future role models

## Error and edge cases

- duplicate items allowed or disallowed per tenant policy remains an open decision
- catalogue item removed after being used in a menu
- quotation references outdated menu version

## Acceptance criteria

- tenant users can create and maintain reusable menus
- menus can be reused in quotation workflows
- historical references remain stable

## Automated testing requirements

- unit tests for menu item validation and duplication behavior
- integration tests for menu persistence and tenant scoping
- end-to-end tests for building and editing a menu

## Dependencies on other features

- `CAT-001`

## Explicit out-of-scope items

- drag-and-drop interaction is optional and not required for first release
- customer-facing public menu publishing
