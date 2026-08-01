# Phosphor Icon Migration — Design

**Date:** 2026-07-13  
**Status:** Approved  
**Approach:** Big-bang (single PR)

## Summary

Remove `lucide-react` as a direct dependency and standardize on Phosphor filled
icons across the app. The project started from a Frontend Mentor template whose
Figma assets are Phosphor-based; Lucide was added later to fill gaps. This
migration aligns runtime icons with the original design language.

Custom Figma SVG components remain only for navigation icons, payment brand
logos, and the sidebar collapse control. All other icons use
`@phosphor-icons/react` through a shared wrapper that enforces `weight="fill"`
by default.

## Goals

- Zero direct `lucide-react` imports in application code.
- One icon standard: Phosphor filled icons via `Icon` / `createIcon` wrapper.
- shadcn CLI configured for Phosphor so future component installs stay consistent.
- Preserve bespoke Figma nav and brand icons unchanged.
- Update `DESIGN.md` as the ongoing source of truth for icon usage.

## Non-Goals

- Replacing kept Figma nav icons with Phosphor package equivalents.
- Migrating transitive Lucide usage inside `@neondatabase/auth-ui`.
- Introducing duotone, regular, or thin Phosphor weights.
- Changing icon semantics or layout beyond what the library swap requires.

## Decisions

| Decision              | Choice                                                    |
| --------------------- | --------------------------------------------------------- |
| Migration strategy    | Big-bang single PR                                        |
| Icon library          | `@phosphor-icons/react`                                   |
| Default weight        | `fill`                                                    |
| Custom icon retention | Nav icons (5), payment brands (3), `MinimizeMenuIcon` (1) |
| Import pattern        | `components/ui/icon.tsx` wrapper (`Icon` + `createIcon`)  |
| shadcn config         | `"iconLibrary": "phosphor"` in `components.json`          |

## Icon System Architecture

### Dependencies

- **Add:** `@phosphor-icons/react`
- **Remove:** `lucide-react` from `package.json` direct dependencies

`lucide-react` may remain in `node_modules` as a transitive dependency of
`@neondatabase/auth-ui`. That is acceptable.

### Wrapper (`components/ui/icon.tsx`)

Two exports:

1. **`Icon`** — render helper for inline product usage:

   ```tsx
   <Icon icon={Receipt} size="sm" />
   ```

2. **`createIcon`** — factory for component-style usage (nav items, patterns
   that render `<IconComponent className="size-6" />`):

   ```tsx
   export const ReceiptIcon = createIcon(Receipt)
   <ReceiptIcon className="size-5" aria-hidden />
   ```

**Defaults:**

| Prop                 | Default                                                |
| -------------------- | ------------------------------------------------------ |
| `weight`             | `"fill"`                                               |
| `size` (when passed) | Semantic tokens: `sm` = 16px, `md` = 20px, `lg` = 24px |

When `size` is omitted, Tailwind size utilities (`size-4`, `size-5`, `size-6`)
control dimensions. This preserves existing nav rendering where
`<Icon className="size-6" />` is used without an explicit `size` prop.

Both exports apply `shrink-0` by default and forward remaining Phosphor
`IconProps`.

### Type Updates (`lib/types.ts`)

```ts
// Before
import type { LucideIcon } from "lucide-react"
export type NavIcon = LucideIcon | ComponentType<IconProps>

// After
export type NavIcon = ComponentType<IconProps>
```

`NavIcon` covers kept custom Figma icons and `createIcon()` outputs. The
`LucideIcon` import is removed.

## Icon Inventory

### Keep (9 files, unchanged)

| File                    | Purpose              |
| ----------------------- | -------------------- |
| `NavOverviewIcon`       | Sidebar / bottom nav |
| `NavTransactionsIcon`   | Sidebar / bottom nav |
| `NavBudgetsIcon`        | Sidebar / bottom nav |
| `NavPotsIcon`           | Sidebar / bottom nav |
| `NavRecurringBillsIcon` | Sidebar / bottom nav |
| `VisaIcon`              | Credit card dialog   |
| `MasterCardIcon`        | Credit card dialog   |
| `AmericanExpressIcon`   | Credit card dialog   |
| `MinimizeMenuIcon`      | Sidebar collapse     |

### Replace with Phosphor, then delete (9 active custom files)

| Custom file        | Phosphor          | Consumers                                                           |
| ------------------ | ----------------- | ------------------------------------------------------------------- |
| `CaretDownIcon`    | `CaretDown`       | accordion, calendar, navigation-menu, select                        |
| `CaretLeftIcon`    | `CaretLeft`       | calendar, pagination                                                |
| `CaretRightIcon`   | `CaretRight`      | breadcrumb, cards, context-menu, dropdown-menu, menubar, pagination |
| `SearchIcon`       | `MagnifyingGlass` | `search-input.tsx`                                                  |
| `EllipsisIcon`     | `DotsThree`       | `actions.tsx`                                                       |
| `CircleCheckIcon`  | `CheckCircle`     | `select.tsx`                                                        |
| `FilterMobileIcon` | `Funnel`          | `transactions-content.tsx`                                          |
| `SortMobileIcon`   | `ArrowsDownUp`    | `transactions-content.tsx`                                          |
| `PotIcon`          | `PiggyBank`       | `pots-card.tsx`                                                     |

Use `createIcon()` for component-style consumers; use `Icon` where JSX passes
the icon inline.

### Delete without replacement (5 dead-code files)

Never imported outside their own module:

- `RecurringBillsIcon`
- `CloseModalIcon`
- `CircleExclamationIcon`
- `ShowPasswordIcon`
- `HidePasswordIcon`

### Replace Lucide in product code (~15 files)

| Lucide                            | Phosphor                   |
| --------------------------------- | -------------------------- |
| `AlertTriangle` / `TriangleAlert` | `Warning`                  |
| `Landmark`                        | `Bank`                     |
| `WalletCards`                     | `Cards`                    |
| `ChevronDown`                     | `CaretDown`                |
| `CreditCard` / `CreditCardIcon`   | `CreditCard`               |
| `ChartNoAxesCombined`             | `ChartLineUp`              |
| `ShieldCheck`                     | `ShieldCheck`              |
| `ChartPie`                        | `ChartPie`                 |
| `ReceiptText`                     | `Receipt`                  |
| `PiggyBank`                       | `PiggyBank`                |
| `CircleAlert`                     | `WarningCircle`            |
| `CircleCheck`                     | `CheckCircle`              |
| `MinusCircle`                     | `MinusCircle`              |
| `ArrowUpDown`                     | `ArrowsDownUp`             |
| `CalendarClock`                   | `CalendarDots`             |
| `ArrowLeft` / `ArrowRight`        | `ArrowLeft` / `ArrowRight` |
| `LockKeyhole`                     | `Lock`                     |
| `RotateCcw`                       | `ArrowCounterClockwise`    |
| `Eye` / `EyeOff`                  | `Eye` / `EyeSlash`         |
| `DoorOpenIcon`                    | `SignOut`                  |
| `CalendarIcon`                    | `Calendar`                 |

Nav entries in `lib/data.ts` that currently import Lucide directly
(Credit Cards, Forecast, Admin) switch to `createIcon(CreditCard)`,
`createIcon(ChartLineUp)`, and `createIcon(ShieldCheck)`.

### Replace Lucide in shadcn primitives (~18 files in `components/ui/*`)

Run `bunx shadcn migrate icons phosphor -y`, then audit every Phosphor icon in
`components/ui/*` to add `weight="fill"`.

**Exception:** `CircleNotch` in `spinner.tsx` keeps its default weight so the
notch animation remains legible.

Expected shadcn mappings (CLI handles import renames):

| Lucide                                  | Phosphor                   |
| --------------------------------------- | -------------------------- |
| `CheckIcon`                             | `Check`                    |
| `CircleIcon`                            | `Circle`                   |
| `X` / `XIcon`                           | `X`                        |
| `SearchIcon`                            | `MagnifyingGlass`          |
| `Loader2Icon`                           | `CircleNotch`              |
| `MinusIcon`                             | `Minus`                    |
| `MoreHorizontal` / `MoreHorizontalIcon` | `DotsThree`                |
| `ArrowLeft` / `ArrowRight`              | `ArrowLeft` / `ArrowRight` |
| `GripVerticalIcon`                      | `DotsSixVertical`          |

## shadcn Configuration

Update `components.json`:

```json
"iconLibrary": "phosphor"
```

This ensures future `shadcn add` commands install Phosphor-based icon imports.

## DESIGN.md Updates

Replace Lucide references with Phosphor standards:

- Component standards: "Lucide icons" → "Phosphor icons via `Icon` /
  `createIcon`, default `weight=\"fill\"`".
- Menu/icon sizing: "Lucide icons at `size-4` or `size-5`" → "Phosphor icons at
  `size=\"sm\"` (16px) or `size=\"md\"` (20px), or Tailwind `size-4` /
  `size-5` on `createIcon` outputs".
- Add rule: custom Figma SVG icons are reserved for navigation, payment brand
  logos, and sidebar collapse only.

## Execution Sequence (Single PR)

1. Install `@phosphor-icons/react`.
2. Create `components/ui/icon.tsx` with `Icon` and `createIcon`.
3. Update `components.json` → `"iconLibrary": "phosphor"`.
4. Run `bunx shadcn migrate icons phosphor -y`.
5. Audit `components/ui/*` — add `weight="fill"` to all Phosphor icons except
   `CircleNotch`.
6. Replace Lucide imports in product components (~15 files).
7. Replace active custom icon imports with Phosphor via wrapper; delete 14
   custom icon files.
8. Update `lib/data.ts` nav icons and `lib/types.ts`.
9. Update `DESIGN.md`.
10. Remove `lucide-react` from `package.json`; run `bun install`.
11. Run `bun run format`, `bun run lint`, `bun run build`.

## Verification Checklist

- [ ] No `from "lucide-react"` imports in app source (excluding lockfile /
      node_modules).
- [ ] No imports from deleted `components/icons/*` paths.
- [ ] Sidebar and bottom nav render all items correctly.
- [ ] shadcn primitives: checkbox, dialog/sheet close, dropdown/context menu
      indicators, command search, pagination, spinner.
- [ ] Auth password toggle (`Eye` / `EyeSlash`).
- [ ] Error page (`Warning`).
- [ ] Bill status icons (`WarningCircle`, `CheckCircle`, `MinusCircle`).
- [ ] Credit card brand logos still render in dialog.
- [ ] `bun run build` passes.

## Risks and Mitigations

| Risk                                                         | Mitigation                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| shadcn migrate misses edge-case icons                        | Manual grep for `lucide-react` after migrate                |
| Fill weight looks heavy on small indicators                  | Verify checkbox/radio at 16px; adjust size tokens if needed |
| Custom nav icons differ visually from new Phosphor nav items | Acceptable — Figma nav icons are intentionally kept         |
| Spinner readability with fill weight                         | Keep `CircleNotch` at default weight                        |
