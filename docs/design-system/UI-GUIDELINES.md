# Catering Management SaaS — UI Design Guidelines

## 1. Design Direction & Philosophy

The application employs an **Executive Monochrome / Minimal Enterprise** design language.

It is purpose-built as business software for catering companies managing high-volume operations: customer accounts, event enquiries, menu engineering, recipe costing, quotations, bookings, daily meal orders, invoices, and kitchen operations.

The interface prioritizes:
- **Operational Density**: Structured data grids, compact row heights, clear tabular typography.
- **Visual Calm**: Neutral palette with `#F5F5F4` low-glare canvas designed for full workday use.
- **Consistency**: Flat `#FFFFFF` cards, crisp `1px solid #E5E5E5` borders, and unified radii.
- **Restraint**: Zero colorful gradients, zero glassmorphism, and subtle status-only tints.

---

## 2. Colour Palette

### Core Neutral Tokens
| Token | Hex | Role | Usage |
|---|---|---|---|
| **Primary** | `#171717` | Neutral 900 | Primary buttons, active markers, key dark elements |
| **Primary Hover** | `#262626` | Neutral 800 | Hover state for primary buttons |
| **Main Text** | `#262626` | Neutral 800 | Primary copy, titles, table content |
| **Secondary Text** | `#737373` | Neutral 500 | Labels, subtitles, metadata, table headers |
| **Muted Text** | `#A3A3A3` | Neutral 400 | Placeholders, disabled text |
| **Page Canvas** | `#F5F5F4` | Stone 100 | Main application background (low-glare) |
| **Surface / Card** | `#FFFFFF` | Pure White | Cards, modal sheets, tables |
| **Secondary Surface** | `#FAFAFA` | Neutral 50 | Table headers, secondary panels |
| **Border Default** | `#E5E5E5` | Neutral 200 | Card borders, input borders |
| **Muted Border** | `#F0F0F0` | Neutral 100 | Subtle table row dividers |
| **Disabled Surface** | `#F5F5F5` | Neutral 100 | Disabled inputs and buttons |

### Restrained Semantic Status Tokens
Used exclusively for operational status (never for decoration):
- **Success**: Text `#15803D`, soft background `#F0FDF4`, border `#DCFCE7` (Active accounts, confirmed bookings, paid invoices, completed meal orders)
- **Warning**: Text `#B45309`, soft background `#FFFBEB`, border `#FEF3C7` (Pending quotes, expiring tokens, low inventory thresholds)
- **Error**: Text `#B91C1C`, soft background `#FEF2F2`, border `#FEE2E2` (Inactive accounts, overdue invoices, canceled events, validation errors)
- **Neutral / Info**: Text `#525252`, soft background `#F5F5F5`, border `#E5E5E5` (Draft quotes, archived records, onboarding states)

---

## 3. DaisyUI & Tailwind CSS Configuration

Configured in `apps/web/src/app/globals.css`:
- DaisyUI v5 plugin with overridden semantic tokens.
- Tailwind CSS v4 `@theme inline` definitions.
- Custom button and input resets for an enterprise finish.

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

  /* Geometry & Radii */
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
- **Section Headers**: `text-xs font-semibold uppercase tracking-wider text-[#737373]`
- **Card Titles**: `text-base font-semibold text-[#171717]`
- **Body Text**: `text-sm text-[#262626] leading-normal`
- **Secondary / Meta Info**: `text-xs text-[#737373]`
- **Monospace (IDs, currency, numbers, dates, slugs)**: `font-mono text-xs tabular-nums text-[#262626]`

---

## 5. Layout & Navigation Architecture

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

### 6.2 Cards (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
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
