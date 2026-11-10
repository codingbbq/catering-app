---
trigger: always_on
description: Mandatory Executive Monochrome UI and DaisyUI design rules for all web interface work
---

# Enterprise UI Design Rules

All UI changes must strictly follow:
`docs/design-system/UI-GUIDELINES.md`

## Mandatory Visual Standards

- **Design System**: Executive Monochrome / Minimal Enterprise
- **Primary Action**: `#171717` (Charcoal / Neutral 900)
- **Primary Hover**: `#262626` (Neutral 800)
- **Page Background**: `#F5F5F4` (Low-glare Stone 100 neutral canvas)
- **Card / Surface**: `#FFFFFF` (Pure white)
- **Secondary Surface**: `#FAFAFA` (Neutral 50)
- **Border**: `#E5E5E5` (Neutral 200)
- **Row Divider**: `#F0F0F0` (Neutral 100)
- **Main Text**: `#262626`
- **Secondary Text**: `#737373`
- **Font Stack**: Inter via `next/font/google`

## Prohibited Patterns

- Pink, purple, or bright blue primary interface colors
- Linear or radial gradients on backgrounds, buttons, or cards
- Glassmorphism, translucent blurs, or heavy drop shadows (`shadow-xl`)
- Randomly colored icons or badge tags
- Inconsistent border radii (use standardized `rounded-lg` / 6px)
- Unnecessary animations or decorative illustrations

## Component & Layout Standards

- Use DaisyUI semantic theme tokens defined in `apps/web/src/app/globals.css`.
- Reuse shared enterprise components from `apps/web/src/components/ui/`:
  - `StatusBadge` for all entity states
  - `Card` system (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`)
  - `PageHeader` for consistent page headings and actions
  - `EmptyState` for clean, icon-based empty states
- Tenant views must reside within the responsive sidebar layout.
- Use monochrome SVG stroke icons exclusively.
- All monetary, date, and ID values must be formatted consistently with monospaced tabular numbers.

Never introduce a new visual design language or arbitrary color palette without explicit approval.
