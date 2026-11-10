# Catering Enterprise UI Design System

## 1. Overview & Design Philosophy

The Catering Management SaaS platform utilizes an **Executive Monochrome / Minimal Enterprise** design language.

It is designed for daily operational usage by catering owners, kitchen managers, event coordinators, and dispatch operators. Rather than an aesthetic focused on marketing ornamentation, gradients, or vibrant decorative colors, the interface prioritizes:

- **Clarity & Information Density**: High data legibility with dense operational tables and clean data grids.
- **Reliability & Consistency**: Strict adherence to a central neutral palette and component specifications.
- **Restraint**: Zero colorful gradients, zero glassmorphism, flat surfaces with crisp borders (`1px solid #E5E5E5`), and subtle semantic status indications.
- **Operational Ergonomics**: Comfortable for 8–10 hours of continuous daily usage without visual fatigue.

---

## 2. Core Palette & Color Tokens

### 2.1 Neutral Foundation

| Token Name | Hex Code | Role | Tailwind / CSS Variable |
|---|---|---|---|
| **Primary** | `#171717` | Neutral 900 (Charcoal) | `--color-primary`, key actions, active markers |
| **Primary Hover** | `#262626` | Neutral 800 | Dark hover on primary buttons |
| **Main Text** | `#262626` | Neutral 800 | Primary copy, titles, table content |
| **Secondary Text** | `#737373` | Neutral 500 | Labels, subtitles, metadata, table headers |
| **Muted Text** | `#A3A3A3` | Neutral 400 | Placeholders, disabled text |
| **Page Canvas** | `#F5F5F4` | Stone 100 Neutral | Main application background (low-glare) |
| **Card / Surface** | `#FFFFFF` | Pure White | Cards, modal sheets, tables, popovers |
| **Secondary Surface** | `#FAFAFA` | Neutral 50 | Table headers, secondary panels, inputs |
| **Border Default** | `#E5E5E5` | Neutral 200 | Card borders, inputs, structural dividers |
| **Muted Border** | `#F0F0F0` | Neutral 100 | Subtle table row dividers, inner section splits |
| **Disabled Surface** | `#F5F5F5` | Neutral 100 | Disabled buttons, disabled field backgrounds |

### 2.2 Restrained Semantic Status Tokens

Semantic colors are strictly reserved for communicating real-time business and operational states (never for decoration):

| State | Foreground Text | Background Tint | Border Tint | Typical Catering Domain Usage |
|---|---|---|---|---|
| **Success** | `#15803d` (Green 700) | `#F0FDF4` (Green 50) | `#DCFCE7` (Green 100) | Active customer, confirmed booking, paid invoice, delivered meal |
| **Warning** | `#B45309` (Amber 700) | `#FFFBEB` (Amber 50) | `#FEF3C7` (Amber 100) | Pending quotation, expiring contract, low inventory, pending invite |
| **Error** | `#B91C1C` (Red 700) | `#FEF2F2` (Red 50) | `#FEE2E2` (Red 100) | Inactive customer, overdue payment, canceled order, form error |
| **Neutral / Info** | `#525252` (Neutral 600) | `#F5F5F5` (Neutral 100) | `#E5E5E5` (Neutral 200) | Draft quotation, onboarding tenant, archived record, general tag |

---

## 3. DaisyUI v5 & Tailwind CSS v4 Configuration

The design system is implemented using Tailwind CSS v4 (`@import "tailwindcss";`) and DaisyUI v5 (`@plugin "daisyui"`).

DaisyUI default vibrant colors (purple, pink, cyan) are permanently overridden in `apps/web/src/app/globals.css`:

```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default;
}

@theme inline {
  --color-page: #f5f5f4;
  --color-surface: #ffffff;
  --color-surface-subtle: #fafafa;
  --color-border-default: #e5e5e5;
  --color-border-muted: #f0f0f0;
  --color-text-main: #262626;
  --color-text-muted: #737373;
  --font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:root {
  color-scheme: light;

  /* Surfaces & Base */
  --color-base-100: #ffffff;
  --color-base-200: #fafafa;
  --color-base-300: #e5e5e5;
  --color-base-content: #262626;

  /* Primary Charcoal Action */
  --color-primary: #171717;
  --color-primary-content: #ffffff;

  /* Secondary Neutral Action */
  --color-secondary: #ffffff;
  --color-secondary-content: #262626;

  /* Neutral Surface */
  --color-neutral: #171717;
  --color-neutral-content: #ffffff;

  /* Semantic Tokens */
  --color-success: #15803d;
  --color-success-content: #ffffff;
  --color-warning: #b45309;
  --color-warning-content: #ffffff;
  --color-error: #b91c1c;
  --color-error-content: #ffffff;
  --color-info: #525252;
  --color-info-content: #ffffff;

  /* Controlled Geometry */
  --radius-selector: 0.375rem; /* 6px */
  --radius-field: 0.375rem;    /* 6px */
  --radius-box: 0.375rem;      /* 6px */
  --border: 1px;
  --depth: 0;
  --noise: 0;
}
```

---

## 4. Typography System

The application uses **Inter** loaded via `next/font/google` (`--font-inter`).

### Typographical Hierarchy
- **Page Titles**: `text-xl font-semibold tracking-tight text-[#171717]`
- **Section Headings**: `text-xs font-semibold uppercase tracking-wider text-[#737373]`
- **Card Titles**: `text-base font-semibold text-[#171717]`
- **Body Text**: `text-sm text-[#262626] leading-normal`
- **Secondary / Meta Info**: `text-xs text-[#737373]`
- **Monospace (IDs, currency, numbers, dates, slugs)**: `font-mono text-xs tabular-nums text-[#262626]`

---

## 5. Layout & Navigation

### 5.1 Enterprise Admin Dashboard Layout
The tenant workspace layout is structured around a **responsive, fixed/sticky sidebar**:
- **Sidebar Width**: `w-60` (desktop fixed/sticky, mobile collapsible drawer)
- **Background**: `#FFFFFF` with right border `1px solid #E5E5E5`
- **Monochrome Icons**: Crisp 16x16px or 18x18px stroke icons; no multi-colored icons
- **Active Navigation Item**: Background `#E5E5E5/70`, text `#171717`, font weight `500`
- **Inactive Navigation Item**: Text `#737373`, hover background `#FAFAFA`, hover text `#171717`

### 5.2 Navigation Groupings (Catering Operations)
1. **Overview**: Dashboard
2. **Sales & CRM**: Customers, Enquiries, Quotations, Bookings
3. **Kitchen & Operations**: Food Catalogue, Menus, Costing & Recipes, Daily Meal Orders
4. **Finance & Stock**: Invoices, Payments, Inventory
5. **Administration**: Reports, Team & Users, Settings

### 5.3 Top Header
- Fixed `h-14` header on desktop and mobile
- Breadcrumb trail (`Workspace / tenant-slug / Section`)
- Tenant/workspace scope badge (`AccessContextBadge`)
- Profile initials circle with minimal sign-out action (`UserNav`)

---

## 6. Shared Component Specifications

### 6.1 Buttons
- **Primary**: Solid charcoal background `#171717`, text `#FFFFFF`, hover `#262626`.
- **Secondary**: Pure white background `#FFFFFF`, border `1px solid #E5E5E5`, text `#262626`, hover `#F5F5F5`.
- **Ghost**: Transparent background, text `#737373`, hover text `#171717`, hover `#FAFAFA`.
- **Destructive**: Minimal outline or text-only state with explicit confirmation step.

### 6.2 Cards (`Card`, `CardHeader`, `CardContent`, `CardFooter`)
- Background `#FFFFFF`
- Border: `1px solid #E5E5E5`
- Radius: `rounded-lg` (6px)
- Shadows: None (flat enterprise surface)
- Section Dividers: Inner horizontal divider `border-b border-[#F0F0F0]`

### 6.3 Status Badges (`StatusBadge`)
- Replaces legacy multi-colored badges
- Compact pill with soft background, matching light border, and optional 6px indicator dot:
  - `variant="success"`: Green tint dot + badge
  - `variant="warning"`: Amber tint dot + badge
  - `variant="error"`: Red tint dot + badge
  - `variant="neutral"`: Neutral grey dot + badge
  - `variant="info"`: Stone tint dot + badge

### 6.4 Enterprise Data Tables
- Header row with subtle uppercase tracking: `text-[11px] font-semibold uppercase tracking-wider text-[#737373] bg-[#FAFAFA]`
- Subtle row divider: `divide-y divide-[#F0F0F0]`
- Row hover: `hover:bg-[#FAFAFA]`
- Numbers, currencies, dates right-aligned or monospaced
- Minimal pagination bar at bottom with record count and disabled button states

### 6.5 Form Controls
- Inputs, selects, and textareas: border `#E5E5E5`, background `#FFFFFF`, radius `rounded` (6px)
- Focus ring: `focus:border-[#171717] focus:ring-1 focus:ring-[#171717]` (no colorful blue or pink outlines)
- Field labels: `text-xs font-semibold uppercase tracking-wider text-[#737373]`
- Field error text: `text-[11px] text-rose-600`

---

## 7. Rules for Future Feature Implementation

All future features (Quotations, Menus, Costing, Bookings, Invoices, Payments, Meal Orders, Inventory, Reports) MUST adhere to these rules:

1. **No Gradients**: Never use CSS linear/radial gradients on cards, backgrounds, or buttons.
2. **No Vibrant Brand Colors**: Do not introduce purples, pinks, cyan, or bright blues.
3. **No Unbounded Shadows**: Avoid `shadow-xl`, `shadow-2xl`, or heavy ambient blurs. Rely on `1px solid #E5E5E5` borders.
4. **Use Shared Components**: Use `Card`, `PageHeader`, `StatusBadge`, and `EmptyState` from `@/components/ui/`.
5. **Preserve Tenant Scoping**: Keep all tenant operational pages nested within the sidebar layout at `/tenant/[tenantSlug]/...`.
6. **Information Density**: Prioritize structured tables, clear key-value summaries, and clean forms over empty decorative whitespace.
