# CAT-001 Food Catalogue and Catalogue Import

## Feature ID and name

- Feature ID: `CAT-001`
- Feature name: `Food Catalogue and Catalogue Import`

## Purpose and business value

Create a reusable tenant-specific food catalogue that reduces repetitive data entry and speeds up menu building and quotation preparation. Import support is included because many catering businesses already maintain catalogue data in spreadsheets.

## User roles and permissions

- Tenant Owner / Admin
- Sales Manager / Sales Executive
- Operations Manager
- Limited edit access for catalogue maintainers if introduced later

## Functional requirements

- create, edit, archive, and search catalogue items
- categorize items and store relevant commercial attributes
- support multiple photo uploads for each dish with primary cover selection and deletion
- support bulk import from a defined tabular format
- validate import rows and provide import result feedback
- allow catalogue items to be referenced by menus, recipes, and quotations

## User stories

- As a sales user, I want to reuse saved food items when preparing menus.
- As a sales user, I want to view multiple high-quality photos of each dish so I can present appetizing menu options to clients.
- As a business admin, I want to import my existing catalogue from a spreadsheet.
- As an operations user, I want consistent item naming across menus and costing.

## UI screens and interactions

- catalogue list screen with image thumbnails
- catalogue item detail/create/edit form with multi-photo upload gallery
- import upload and validation results screen
- archive/reactivate actions

## Data model changes

- `CatalogueItem`
- `CatalogueItemImage` (multiple images per item, url, caption, isPrimary, order)
- `CatalogueImportJob`
- optional import row/result detail table if required

## API endpoints or operations

- `GET /catalogue-items`
- `POST /catalogue-items`
- `GET /catalogue-items/:itemId`
- `PATCH /catalogue-items/:itemId`
- `POST /catalogue-items/:itemId/images`
- `POST /catalogue-items/:itemId/images/upload`
- `DELETE /catalogue-items/:itemId/images/:imageId`
- `PATCH /catalogue-items/:itemId/images/:imageId/primary`
- `POST /catalogue-imports`
- `GET /catalogue-imports/:importJobId`

## Validation and business rules

- imported rows must be validated before persistence
- archived catalogue items should not disappear from historical documents
- duplicate detection should at least warn by tenant and item name/category heuristics

## Security considerations

- import files may contain commercially sensitive pricing data
- import endpoints must be tenant-scoped and auditable

## Error and edge cases

- invalid file structure
- partial import success with row-level validation failures
- archived item referenced by active menu or quotation

## Acceptance criteria

- tenant users can manage a reusable catalogue
- import workflow supports validation feedback and safe persistence
- catalogue items become available to downstream menu and costing features

## Automated testing requirements

- unit tests for import parsing and duplicate rules
- integration tests for tenant-scoped item CRUD and import persistence
- end-to-end tests for manual item creation and import success/failure flows

## Dependencies on other features

- `TEN-001`

## Explicit out-of-scope items

- supplier pricing synchronization
- nutritional labeling unless required later
