# Product Requirements Document

## Product overview

The product is a multi-tenant catering management SaaS for catering businesses that handle event catering, recurring meal services, or both. It combines customer and enquiry management, food catalogue management, menu composition, costing, quotation workflows, booking operations, communications, invoicing, payments, daily meal orders, and later-stage operational modules.

The platform also includes a Super Admin Console used by the SaaS operator to manage tenants, onboarding, subscription state, tenant health, and platform oversight. The Super Admin Console is distinct from tenant administration.

## Problem statement

Catering businesses often manage leads, menus, costing, quotations, bookings, and delivery coordination across spreadsheets, messaging apps, disconnected accounting tools, and ad hoc documents. This causes slow quote turnaround, inconsistent costing, poor visibility into booking status, and weak tenant-level governance.

## Product goals

- Reduce time from enquiry to approved quotation.
- Improve quotation consistency with reusable catalogue, menu, and costing data.
- Centralize customer, enquiry, booking, and communication history.
- Support both event catering and recurring daily meal workflows.
- Preserve strict tenant isolation across all business data and users.
- Give the SaaS operator platform-level oversight through a dedicated Super Admin Console.

## Non-goals for the initial scaffold stage

- No business modules are implemented yet.
- No external communication provider integration is implemented yet.
- No accounting sync or third-party marketplace sync is implemented yet.
- No advanced procurement, kitchen planning, or analytics is implemented yet.

## Primary user roles

### Platform-level roles

- Super Admin
- Platform Operations / Support

### Tenant-level roles

- Tenant Owner / Business Admin
- Sales Manager / Sales Executive
- Operations Manager
- Kitchen Manager
- Finance User
- Staff / Limited Operator

## Core product capabilities

### Sales-first MVP capabilities

- Authentication and role-based access
- Tenant onboarding and tenant lifecycle management
- Super Admin Console
- Customer management
- Enquiry management
- Food catalogue and catalogue import
- Menu builder
- Simple and recipe-based costing
- Quotations and quotation revisions
- Booking confirmation and booking management
- Communication logging and outbound delivery integration points

### Post-MVP business capabilities

- Invoicing and payment tracking
- Daily meal order workflows
- Inventory and procurement
- Kitchen operations
- Reporting and operational analytics

## Multi-tenant model

- Each catering business is a tenant.
- Each tenant has isolated business data, users, configuration, catalogue, customers, enquiries, quotations, bookings, and operational records.
- Super Admin users can view and manage platform-level tenant records but must be separated from tenant-facing business operations.
- Tenant administrators can only manage users and data inside their tenant.

## Functional scope

### 1. Platform administration

- Create and manage tenants
- Activate, suspend, archive, or flag tenants
- View platform-level health, usage, and support-relevant summaries
- Maintain separation between platform administration and tenant operations

### 2. Identity and access

- Sign in and sign out
- Role-based authorization
- Tenant-aware session context
- User invitation and deactivation flows for tenant users
- Auditability of key administrative changes

### 3. CRM and sales workflow

- Manage customers and contacts
- Capture enquiries from internal users or imported channels
- Track enquiry status and next actions
- Convert enquiries into quotations and bookings

### 4. Catalogue, menu, and costing

- Manage food catalogue items manually and via import
- Build menus from catalogue items
- Support simple fixed-cost and recipe-based costing
- Track selling price, margin, and revision history on quotations

### 5. Quotations and bookings

- Create quotations tied to an enquiry
- Support revisions and status progression
- Capture booking confirmation and event details
- Maintain document and communication history relevant to the booking lifecycle

### 6. Communications

- Record outbound and inbound communication metadata
- Support WhatsApp, email, and SMS provider abstractions later
- Track delivery status and message history against enquiries, quotations, and bookings

### 7. Finance and recurring meals

- Generate invoices from bookings and meal orders
- Track payments and balances
- Support recurring daily meal orders for subscribed or scheduled customer accounts

### 8. Operations and reporting

- Manage stock, procurement, and kitchen production planning
- Report on sales pipeline, quotation conversion, bookings, revenue, and fulfillment health

## MVP definition

The smallest useful MVP for pilot catering businesses includes:

- Tenant isolation foundation
- Authentication and tenant user administration
- Super Admin tenant onboarding and tenant lifecycle management
- Customer management
- Enquiry management
- Food catalogue management and import
- Menu builder
- Costing engine
- Quotations with revisions
- Booking confirmation and booking management
- Communication history with provider-ready abstractions

This MVP is sales-first. It allows a business to go from lead intake to confirmed booking with pricing discipline and traceable communication.

## Key workflows

### Enquiry to booking

1. Tenant user captures customer and enquiry.
2. Sales user prepares menu options from the catalogue.
3. System calculates simple or recipe-based cost.
4. Sales user prepares quotation and revisions.
5. Customer communication is logged.
6. Approved quotation is converted into a booking.

### Tenant onboarding

1. Super Admin creates tenant.
2. Tenant status is set to onboarding or active.
3. Initial tenant admin is invited.
4. Tenant admin configures business basics and users.

### Daily meals

1. Tenant configures recurring meal customer/account.
2. Orders are captured by day and service window.
3. Orders feed finance and later kitchen/inventory processes.

## Non-functional requirements

- Strict tenant isolation by design
- Auditable high-risk administrative actions
- Strong input validation using Zod-aligned contracts where practical
- Modular domain boundaries in the NestJS backend
- Feature-oriented frontend composition
- Safe defaults for local development without requiring external services during bootstrap
- Incremental delivery with independently shippable features

## Reporting expectations

- Sales pipeline visibility
- Quote turnaround and conversion visibility
- Booking calendar and operational summary visibility
- Revenue, invoice, and payment visibility
- Later inventory and production reporting

## Open questions and ambiguities

- Whether tenants may operate in multiple branches/locations in the MVP
- Exact approval workflow for quotations before sending to customers
- Required tax model, invoice numbering rules, and multi-currency support
- Whether daily meal orders are B2B account-based, consumer-facing, or both
- Which providers should be prioritized first for WhatsApp, email, and SMS
- Whether recipe costing must support yield loss, wastage, and unit conversions in the initial costing release
- Whether procurement requires approval workflows in the first operations phase

## Source alignment

This document is based on the existing repository intent and the agreed platform direction captured in `PROMPTS.txt`, `README.md`, and `AGENTS.md`, while preserving the requested multi-tenant SaaS model, Super Admin Console, sales-first MVP, event catering, daily meals, simple and recipe-based costing, catalogue import, quotations, bookings, and communication requirements.
