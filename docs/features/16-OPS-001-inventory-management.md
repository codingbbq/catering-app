# OPS-001 Inventory Management

## Feature ID and name

- Feature ID: `OPS-001`
- Feature name: `Inventory Management`
- Status: `Completed`

## Purpose and business value

Track raw stock items, par levels, stock movements, and live valuation so catering companies can maintain operational readiness, prevent stockouts, eliminate wasteful spoilage, and lay the foundation for procurement (`OPS-002`) and kitchen operations (`OPS-003`).

## User roles and permissions

- Tenant Owner / Admin: Full CRUD, stock movement recording, archival, valuation review
- Operations Manager: Full CRUD, movement posting, par configuration
- Kitchen Manager: Stock movement recording (intake, kitchen usage, waste), stock visibility
- Finance users: Read-only access to stock valuation, movements audit trail, and category breakdown

## Functional requirements

- Create and maintain inventory items with SKU, name, category, unit of measure, unit cost, par level (minStockLevel), max capacity, reorder quantity, and storage location.
- Record stock movements across multiple movement types (`purchase_received`, `kitchen_consumption`, `waste_spoilage`, `adjustment_in`, `adjustment_out`, `transfer`, `return_to_supplier`).
- Maintain real-time on-hand stock and prevent negative stock on kitchen consumption or waste deductions.
- Generate sequential, auditable movement numbers (`SM-YYYYMM-XXXX`).
- Automatic calculation of item valuation (`currentStock * unitCost`) and overall inventory valuation.
- Filter by category, stock status (`in_stock`, `low_stock`, `out_of_stock`), search by SKU and name.
- View category valuation breakdown and procurement par alert queue.
- Strict tenant database currency adoption (`TenantSettings.currencyCode`, e.g. INR ₹, USD $, EUR €) across all unit costs, item valuations, movement transaction values, and summary KPI cards.

## UI screens and interactions

- **Inventory Dashboard & Catalog** (`/tenant/[tenantSlug]/inventory`):
  - KPI Cards: Active Catalog SKUs, Total Stock Valuation (currency formatted), Low Stock Par Alerts, Out of Stock Items.
  - Tab 1: **Stock Items Catalog** with SKU, name, storage location, category badge, on-hand count, par level, unit cost, valuation, stock status badge, and actions (Move, Edit, Archive/Restore).
  - Tab 2: **Stock Movements Ledger** showing movement number (`SM-YYYYMM-XXXX`), date/time, item, movement type badge, signed delta quantity, before $\rightarrow$ after stock, cost value, reference/reason, recorded by.
  - Tab 3: **Category Valuation & Par Alerts** displaying category monetary distribution and active items requiring reordering.
- **Inventory Item Dialog** (`InventoryItemDialog`): Create and edit inventory items with category selector, unit presets (`kg`, `g`, `ltr`, `ml`, `piece`, `box`, `pack`), unit cost with active currency symbol, opening stock balance, and par thresholds.
- **Record Movement Dialog** (`RecordMovementDialog`): Fast modal with live stock projection (Current $\rightarrow$ Delta $\rightarrow$ Projected), unit cost override, and validation against stock deficits.

## Data model

- `InventoryCategory`: `produce`, `meat_poultry`, `dairy`, `dry_goods`, `beverages`, `packaging`, `cleaning`, `other`
- `StockMovementType`: `purchase_received`, `kitchen_consumption`, `waste_spoilage`, `adjustment_in`, `adjustment_out`, `transfer`, `return_to_supplier`
- `InventoryItem`: Tenant-scoped catalog item with SKU (unique per tenant), unit, currentStock, minStockLevel, maxStockLevel, reorderQuantity, unitCost, storageLocation, isArchived, notes, catalogueItemId.
- `StockMovement`: Auditable stock movement with sequential `SM-YYYYMM-XXXX`, signedQuantity, quantityBefore, quantityAfter, unitCost, totalCost, referenceType, referenceId, reason, recordedBy.

## API endpoints

- `GET /inventory/summary`: Total active SKUs, total valuation, low stock count, out of stock count, tenant currency, category valuation breakdown.
- `GET /inventory/items`: Paginated and filtered inventory items list (search, category, status, includeArchived).
- `GET /inventory/items/:id`: Item details with recent 10 stock movements.
- `POST /inventory/items`: Create inventory item with optional opening stock balance.
- `PATCH /inventory/items/:id`: Update item specifications, par levels, or unit cost.
- `POST /inventory/items/:id/archive`: Soft-archive inventory item.
- `POST /inventory/items/:id/restore`: Restore archived item.
- `GET /inventory/movements`: Filtered stock movements ledger (by item, movement type, date).
- `POST /inventory/movements`: Atomic stock movement recording with validation and sequential numbering.

## Validation and business rules

- **SKU Uniqueness**: SKUs are uppercase and unique per tenant.
- **Signed Movement Arithmetic**: Movements adding stock have positive signed quantities; consumption, waste, and returns have negative signed quantities.
- **Insufficient Stock Guard**: Consumption and waste movements throw `BadRequestException` if requested deduction exceeds current on-hand stock.
- **Immutable Movements Ledger**: Historical stock movements cannot be mutated; corrections require adjustment movements.
- **Archival Protection**: Movements cannot be posted against archived inventory items.
- **Currency Consistency**: All monetary amounts are tied to the tenant's saved `TenantSettings.currencyCode` in the database.

## Automated testing

- Unit tests in `apps/api/src/inventory/inventory.service.spec.ts` covering:
  - Tenant currency resolution and fallback
  - SKU uniqueness and opening balance creation
  - Stock increment on `purchase_received` with unit cost update
  - Stock decrement on `kitchen_consumption`
  - Rejection of consumption exceeding on-hand stock
  - Rejection of movements on archived items
  - Accurate summary valuation and stock status threshold calculations
