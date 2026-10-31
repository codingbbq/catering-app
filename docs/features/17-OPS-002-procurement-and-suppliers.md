# OPS-002 Procurement and Suppliers

## Feature ID and name

- Feature ID: `OPS-002`
- Feature name: `Procurement and Suppliers`

## Purpose and business value

Allow tenant businesses to manage suppliers and purchase orders to replenish inventory and support operational planning.

## User roles and permissions

- Tenant Owner / Admin
- Operations Manager
- Procurement User if introduced later
- Finance users with read access as needed

## Functional requirements

- manage supplier records
- create purchase orders
- track purchase order status
- link procurement flow to inventory where appropriate

## User stories

- As an operations user, I want to track suppliers and purchase orders.
- As a business owner, I want procurement records linked to operational stock needs.
- As a finance user, I want visibility into committed purchasing activity.

## UI screens and interactions

- supplier list and detail screens
- purchase order list and detail screens
- create/edit purchase order flow

## Data model changes

- `Supplier`
- `PurchaseOrder`
- `PurchaseOrderLine`

## API endpoints or operations

- `GET /suppliers`
- `POST /suppliers`
- `GET /purchase-orders`
- `POST /purchase-orders`
- `PATCH /purchase-orders/:purchaseOrderId`
- `POST /purchase-orders/:purchaseOrderId/submit`

## Validation and business rules

- suppliers should be tenant-scoped
- purchase orders require valid supplier linkage
- status transitions should be controlled
- receipt-to-inventory behavior can be phased separately if needed

## Security considerations

- supplier pricing and procurement activity are commercially sensitive
- procurement approvals may require future audit reinforcement

## Error and edge cases

- duplicate supplier records
- purchase order created for archived inventory item
- goods received workflow not fully defined in initial phase

## Acceptance criteria

- tenant users can manage suppliers and purchase orders
- procurement records can support later inventory and kitchen workflows
- purchase order lifecycle is tracked consistently

## Automated testing requirements

- unit tests for procurement status transitions and validation
- integration tests for supplier/order relationships and scoping
- end-to-end tests for supplier creation and purchase order flow

## Dependencies on other features

- `OPS-001`

## Explicit out-of-scope items

- automatic supplier price imports
- multi-step procurement approval chains unless requested later
