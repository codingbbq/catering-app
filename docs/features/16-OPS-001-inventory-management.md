# OPS-001 Inventory Management

## Feature ID and name

- Feature ID: `OPS-001`
- Feature name: `Inventory Management`

## Purpose and business value

Track stock items and stock movements so catering businesses can manage operational readiness and support later procurement and kitchen planning.

## User roles and permissions

- Tenant Owner / Admin
- Operations Manager
- Kitchen Manager
- Finance users with read access if required

## Functional requirements

- create and maintain inventory items
- record stock movements
- view stock on hand
- support reference usage by procurement and kitchen modules later

## User stories

- As an operations manager, I want visibility into stock levels.
- As a kitchen manager, I want stock movement history for planning.
- As a business owner, I want inventory records to support cost control.

## UI screens and interactions

- inventory item list screen
- inventory item detail/create/edit form
- stock movement record screen
- stock summary view

## Data model changes

- `InventoryItem`
- `StockMovement`

## API endpoints or operations

- `GET /inventory-items`
- `POST /inventory-items`
- `GET /inventory-items/:inventoryItemId`
- `PATCH /inventory-items/:inventoryItemId`
- `POST /stock-movements`

## Validation and business rules

- stock movement quantities must be signed or typed consistently
- stock on hand calculations must be reproducible from movement history
- archival rules must preserve history

## Security considerations

- inventory data is tenant-sensitive operational information
- movement adjustments should be auditable

## Error and edge cases

- negative stock policies not yet finalized
- unit-of-measure normalization unresolved
- backdated stock adjustments impacting derived availability

## Acceptance criteria

- tenant operations users can manage inventory items and movements
- stock summary can be derived reliably from movement history
- data model supports later procurement and kitchen dependencies

## Automated testing requirements

- unit tests for movement arithmetic and validation rules
- integration tests for persistence and scoping
- end-to-end tests for recording stock changes

## Dependencies on other features

- `CST-001`

## Explicit out-of-scope items

- barcode scanning
- warehouse optimization logic
