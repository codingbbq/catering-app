# CST-001 Costing Engine

## Feature ID and name

- Feature ID: `CST-001`
- Feature name: `Costing Engine`

## Purpose and business value

Provide pricing discipline by supporting both simple costing and recipe-based costing. This is central to margin control and accurate quotations.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager
- Finance users with read access as needed

## Functional requirements

- support simple direct costing for a menu or quotation line
- support recipe-based costing from component ingredients/items
- calculate total cost, selling price, markup, and margin outputs
- allow saved cost sheets or reusable recipes
- expose costing results to quotation workflows

## User stories

- As a sales user, I want to price a quotation with clear margin visibility.
- As an operations manager, I want recipe-based costing for more accurate food pricing.
- As a business owner, I want consistent costing logic across quotations.

## UI screens and interactions

- costing workspace attached to menu or quotation preparation
- recipe editor / recipe detail screen
- cost summary panel showing totals and margin outputs

## Data model changes

- `Recipe`
- `RecipeItem`
- `CostSheet`
- optional linkage from menus and quotation lines

## API endpoints or operations

- `GET /recipes`
- `POST /recipes`
- `PATCH /recipes/:recipeId`
- `POST /cost-sheets/calculate`
- `POST /cost-sheets`
- `GET /cost-sheets/:costSheetId`

## Validation and business rules

- cost inputs must be non-negative
- calculation rules must be deterministic and reproducible
- historical quotation values must not change if source cost data changes later
- recipe references must remain tenant-scoped

## Security considerations

- costing and margin data are commercially sensitive
- changes to pricing-related data should be auditable for important flows

## Error and edge cases

- missing component price inputs
- zero quantity or zero yield edge cases
- disputed formula expectations for margin versus markup
- unit conversion rules not yet finalized

## Acceptance criteria

- tenant users can calculate simple and recipe-based cost outputs
- quotation workflows can consume costing results without recalculating historical values unexpectedly
- calculation assumptions are documented and testable

## Automated testing requirements

- unit tests for pricing formulas and rounding rules
- integration tests for persistence and tenant scoping
- end-to-end tests for preparing a priced menu/quotation scenario

## Dependencies on other features

- `CAT-001`
- `MEN-001`

## Explicit out-of-scope items

- live supplier pricing feeds
- advanced waste/yield modeling unless selected for this phase
