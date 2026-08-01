# Phosphor Icon Migration — Implementation Plan

## Goal

Implement the approved design in
`docs/superpowers/specs/2026-07-13-phosphor-icon-migration-design.md`.

Single PR: remove direct `lucide-react` usage, adopt Phosphor filled icons via
a shared wrapper, migrate shadcn primitives with the CLI, and delete superseded
custom icon components.

## Constraints

- Default icon weight is `fill` everywhere except `CircleNotch` spinner.
- Keep 9 Figma custom icons: 5 nav, 3 payment brands, `MinimizeMenuIcon`.
- Use `Icon` / `createIcon` from `components/ui/icon.tsx` for all Phosphor usage.
- Update `DESIGN.md` before or alongside code changes.
- Run `bun run format`, `bun run lint`, and `bun run build` before finishing.

## Task 1: Infrastructure

1. Add `@phosphor-icons/react` to `package.json`.
2. Create `components/ui/icon.tsx`:
   - `ICON_SIZES`: `sm` 16, `md` 20, `lg` 24.
   - `Icon({ icon, size, weight = "fill", className, ...props })`.
   - `createIcon(PhosphorComponent)` returning a component with the same defaults.
3. Update `components.json`: `"iconLibrary": "phosphor"`.
4. Update `lib/types.ts`: remove `LucideIcon`; `NavIcon = ComponentType<IconProps>`.

## Task 2: shadcn Primitive Migration

1. Run `bunx shadcn migrate icons phosphor -y`.
2. Grep `components/ui` for Phosphor icon JSX; add `weight="fill"` to each usage.
3. Leave `CircleNotch` in `spinner.tsx` without forced fill weight.
4. Confirm migrated files (expected): `alert-dialog`, `breadcrumb`, `carousel`,
   `checkbox`, `command`, `context-menu`, `dialog`, `dropdown-menu`,
   `input-otp`, `menubar`, `pagination`, `radio-group`, `resizable`, `sheet`,
   `spinner`, `toast`.

## Task 3: Custom Icon Replacement and Deletion

Replace imports, then delete files.

| Delete                 | Replace with                  |
| ---------------------- | ----------------------------- |
| `CaretDownIcon.tsx`    | `createIcon(CaretDown)`       |
| `CaretLeftIcon.tsx`    | `createIcon(CaretLeft)`       |
| `CaretRightIcon.tsx`   | `createIcon(CaretRight)`      |
| `SearchIcon.tsx`       | `createIcon(MagnifyingGlass)` |
| `EllipsisIcon.tsx`     | `createIcon(DotsThree)`       |
| `CircleCheckIcon.tsx`  | `createIcon(CheckCircle)`     |
| `FilterMobileIcon.tsx` | `createIcon(Funnel)`          |
| `SortMobileIcon.tsx`   | `createIcon(ArrowsDownUp)`    |
| `PotIcon.tsx`          | `createIcon(PiggyBank)`       |

Delete without replacement:

- `RecurringBillsIcon.tsx`
- `CloseModalIcon.tsx`
- `CircleExclamationIcon.tsx`
- `ShowPasswordIcon.tsx`
- `HidePasswordIcon.tsx`

**Consumer files to update:**

- `components/ui/accordion.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/calendar.tsx`
- `components/ui/context-menu.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/menubar.tsx`
- `components/ui/navigation-menu.tsx`
- `components/ui/pagination.tsx`
- `components/ui/select.tsx`
- `components/transactions/search-input.tsx`
- `components/actions.tsx`
- `components/transactions/transactions-content.tsx`
- `components/overview/pots/pots-card.tsx`
- All overview cards importing `CaretRightIcon`

Prefer defining `createIcon` exports in `components/ui/icon.tsx` or a small
`lib/icons.ts` barrel for carets and other high-frequency icons to avoid
repeated `createIcon` calls across many files.

## Task 4: Product Code Lucide Replacement

Replace Lucide imports in:

| File                                                     | Icons                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/data.ts`                                            | `createIcon(CreditCard)`, `createIcon(ChartLineUp)`, `createIcon(ShieldCheck)` |
| `app/error.tsx`                                          | `Warning`                                                                      |
| `components/auth/auth-page-shell.tsx`                    | `Eye`, `EyeSlash`                                                              |
| `components/auth/sign-out-button.tsx`                    | `SignOut`                                                                      |
| `components/admin/monthly-budget-reset-card.tsx`         | `ArrowCounterClockwise`                                                        |
| `components/budgets/budgets-page-content.tsx`            | `ChartPie`                                                                     |
| `components/pots/pots-page-content.tsx`                  | `PiggyBank`                                                                    |
| `components/pots/pot-due-date-picker.tsx`                | `Calendar`                                                                     |
| `components/credit-cards/credit-card-badge.tsx`          | `CreditCard`                                                                   |
| `components/credit-cards/credit-cards-page-content.tsx`  | `CreditCard`                                                                   |
| `components/credit-cards/credit-card-detail-content.tsx` | `ArrowLeft`, `Lock`                                                            |
| `components/forecast/forecast-page-content.tsx`          | `Warning`, `Bank`, `Cards`                                                     |
| `components/forecast/forecast-summary-chart.tsx`         | `Warning`                                                                      |
| `components/forecast/forecast-activity-report.tsx`       | `CaretDown`, `CreditCard`                                                      |
| `components/overview/transactions/transactions-card.tsx` | `Receipt`                                                                      |
| `components/recurring-bills/bill-table-row.tsx`          | `WarningCircle`, `CheckCircle`, `CreditCard`, `MinusCircle`                    |
| `components/recurring-bills/bills-content.tsx`           | `ArrowsDownUp`, `CalendarDots`                                                 |
| `components/recurring-bills/total-bills-card.tsx`        | `Receipt`                                                                      |
| `components/transactions/transactions-content.tsx`       | `Receipt`                                                                      |

## Task 5: Cleanup and Documentation

1. Remove `lucide-react` from `package.json`; run `bun install`.
2. Grep entire repo for `lucide-react` — expect zero app-source hits.
3. Grep for imports from deleted `components/icons/*` paths.
4. Update `DESIGN.md` icon standards (Phosphor, fill default, wrapper usage,
   custom icon scope).
5. Run `bun run format`, `bun run lint`, `bun run build`.

## Suggested `lib/icons.ts` Barrel (optional but recommended)

Reduce repetition by exporting pre-bound icons:

```ts
import { createIcon } from "@/components/ui/icon"
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CreditCard,
  ChartLineUp,
  ShieldCheck,
  MagnifyingGlass,
  DotsThree,
  // ...
} from "@phosphor-icons/react"

export const CaretDownIcon = createIcon(CaretDown)
export const CaretRightIcon = createIcon(CaretRight)
export const NavCreditCardIcon = createIcon(CreditCard)
// ...
```

This keeps consumer import paths stable (`@/lib/icons`) while deleting the old
hand-written SVG files.

## Verification

Run the checklist from the design spec. Spot-check:

- Sidebar expanded/collapsed (MinimizeMenuIcon direction).
- Bottom nav on mobile (all nav icons including Credit Cards, Forecast, Admin).
- Dialog and sheet close buttons.
- Select dropdown check indicator.
- Password show/hide on auth pages.
