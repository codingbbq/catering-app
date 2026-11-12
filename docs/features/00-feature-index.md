# Feature Index

| Feature ID | Feature name | Priority | Dependencies | Implementation status | Specification |
| --- | --- | --- | --- | --- | --- |
| FND-001 | Tenant Isolation Foundation | Critical | None | COMPLETED | [FND-001](./01-FND-001-tenant-isolation-foundation.md) |
| IAM-001 | Authentication and Session Management | Critical | FND-001 | COMPLETED | [IAM-001](./02-IAM-001-authentication-and-session-management.md) |
| PLT-001 | Super Admin Console | Critical | FND-001, IAM-001 | COMPLETED | [PLT-001](./03-PLT-001-super-admin-console.md) |
| TEN-001 | Tenant Administration and User Management | Critical | FND-001, IAM-001, PLT-001 | COMPLETED | [TEN-001](./04-TEN-001-tenant-lifecycle-and-admin.md) |
| CRM-001 | Customer Management | High | FND-001, IAM-001, TEN-001 | COMPLETED | [CRM-001](./05-CRM-001-customer-management.md) |
| CRM-002 | Enquiry Management | High | CRM-001 | COMPLETED | [CRM-002](./06-CRM-002-enquiry-management.md) |
| CAT-001 | Food Catalogue and Catalogue Import | High | TEN-001 | COMPLETED | [CAT-001](./07-CAT-001-food-catalogue-and-import.md) |
| MEN-001 | Menu Builder | High | CAT-001 | COMPLETED | [MEN-001](./08-MEN-001-menu-builder.md) |
| CST-001 | Costing Engine | Critical | CAT-001, MEN-001 | COMPLETED | [CST-001](./09-CST-001-costing-engine.md) |
| QTN-001 | Quotations and Revisions | Critical | CRM-002, MEN-001, CST-001 | COMPLETED | [QTN-001](./10-QTN-001-quotations-and-revisions.md) |
| BKG-001 | Booking Management | Critical | QTN-001 | COMPLETED | [BKG-001](./11-BKG-001-booking-management.md) |
| COM-001 | Communication Hub | High | CRM-002, QTN-001, BKG-001 | NOT_STARTED | [COM-001](./12-COM-001-communication-hub.md) |
| FIN-001 | Invoicing | Medium | BKG-001, DMO-001 | NOT_STARTED | [FIN-001](./13-FIN-001-invoicing.md) |
| FIN-002 | Payments | Medium | FIN-001 | NOT_STARTED | [FIN-002](./14-FIN-002-payments.md) |
| DMO-001 | Daily Meal Orders | Medium | CRM-001, MEN-001, CST-001 | NOT_STARTED | [DMO-001](./15-DMO-001-daily-meal-orders.md) |
| OPS-001 | Inventory Management | Medium | CST-001 | NOT_STARTED | [OPS-001](./16-OPS-001-inventory-management.md) |
| OPS-002 | Procurement and Suppliers | Low | OPS-001 | NOT_STARTED | [OPS-002](./17-OPS-002-procurement-and-suppliers.md) |
| OPS-003 | Kitchen Operations | Low | BKG-001, DMO-001, OPS-001 | NOT_STARTED | [OPS-003](./18-OPS-003-kitchen-operations.md) |
| RPT-001 | Reporting and Dashboards | Low | CRM-002, QTN-001, BKG-001, FIN-002 | NOT_STARTED | [RPT-001](./19-RPT-001-reporting-and-dashboards.md) |

## Notes

- `PLT-001` is a platform-level capability and must remain distinct from tenant administration.
- `FND-001` is the foundational tenant isolation feature and should be treated as a prerequisite for all business-domain delivery.
- The sales-first MVP centers on `CRM-001`, `CRM-002`, `CAT-001`, `MEN-001`, `CST-001`, `QTN-001`, `BKG-001`, and `COM-001`, with supporting identity and tenancy foundations.
