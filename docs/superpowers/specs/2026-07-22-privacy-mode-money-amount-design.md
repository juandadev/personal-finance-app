# Privacy Mode & Shared Money Amount Design

## Overview

Add a global privacy mode that masks every on-screen monetary value so the app can be used in public places, during
streams, demos, and screenshots without exposing balances. Privacy is toggled from a fixed top-right global menu (eye
toggle) and via `Mod+Shift+.`. The preference syncs across devices through an extensible `ui_preferences` JSONB column
on `profiles`.

At the same time, standardize amount display behind a shared `MoneyAmount` component that owns compact formatting (≥ $
100,000), hover/focus full reveal, and privacy masking. All product surfaces that show money must use this component (or
chart helpers that respect the same preference).

## Approved Decisions

| Topic              | Decision                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Masking scope      | All visual money (cards, lists, read-only fields, chart labels/tooltips). Active form inputs stay visible/editable.                            |
| Compact threshold  | Absolute value ≥ `$100,000` (keep current `PotMoneyReveal` rule).                                                                              |
| Privacy + reveal   | While privacy is on: static skeleton only; no hover/focus reveal; accessible name explains the value is hidden and privacy must be turned off. |
| Migration scope    | Full standardization in this work — migrate all displayed money call sites.                                                                    |
| Preference storage | Extensible `ui_preferences` JSONB on `profiles` (not a single boolean column, not localStorage).                                               |
| Control primitive  | shadcn `Toggle` + tooltip + `Kbd`.                                                                                                             |
| Keyboard           | `react-hotkeys-hook`; shortcut `Mod+Shift+.`; active even when form fields are focused.                                                        |
| Default            | `hideAmounts: false` until the user toggles; then persist the chosen value.                                                                    |

## Approved Scope

### In scope

- `profiles.ui_preferences` JSONB + Zod schema with `hideAmounts` (default `false`).
- Load/merge/update path through existing finance state + optimistic server action.
- Fixed `GlobalMenu` in the authenticated app shell (top-right); v1 = privacy `Toggle` only.
- Global hotkey `Mod+Shift+.` via `react-hotkeys-hook` with form/contentEditable enabled.
- Shared `MoneyAmount` component (generalize/replace `PotMoneyReveal`).
- Static (non-pulsing) skeleton mask sized to the amount text box.
- Chart axis/tooltip/legend money values respect privacy.
- Migrate all displayed amount call sites to `MoneyAmount` / shared privacy-aware helpers.
- Update `DESIGN.md` with money display, privacy mode, global menu, and shortcut rules.
- Lightweight unit/component tests for prefs parsing, `MoneyAmount`, and toggle state.

### Out of scope

- Additional global menu buttons / other UI preferences (schema is ready; features are not).
- Theme or layout prefs.
- Redacting amounts in exports, PDFs, emails, or API payloads.
- Per-tab or session-only privacy that does not sync.
- Changing currency formatting rules beyond compact threshold / shared component ownership.
- Auth/marketing pages outside the signed-in app shell.

## Preference Model & Data Flow

### Schema

Add `ui_preferences jsonb not null default '{}'::jsonb` on `profiles`.

App Zod schema (conceptual):

```ts
const uiPreferencesSchema = z.object({
  hideAmounts: z.boolean().default(false),
})
```

Missing keys always resolve to defaults so older rows and partial updates remain valid as new keys are added later.

### Flow

1. `loadFinanceState` reads `ui_preferences`, parses with Zod, exposes `hideAmounts` on finance/UI state.
2. Privacy toggle (click or hotkey) updates React state **optimistically**, then a server action **merges**
   `{ hideAmounts: next }` into the JSONB object (merge/patch — do not clobber unknown future keys).
3. On failure: roll back optimistic state and show a Sonner toast consistent with existing finance actions.
4. No `localStorage` for this preference. Database is the cross-device source of truth.

### Why JSONB

The global menu is expected to grow. A validated JSON document avoids a migration per toggle while keeping a single
synced prefs document per user.

## Global Menu & Privacy Toggle

### Placement

Mount a fixed `GlobalMenu` inside `FinanceAppShell` (not inside `PageHeading`):

- Position: `fixed`, top-right, with safe inset so it clears notches and mobile fixed headings.
- Z-index: above page content; below dialogs/sheets/modals.
- Layout: vertical stack prepared for future global controls; v1 contains only the privacy control.
- Module header actions remain in `PageHeading`.

### Control

- Use shadcn `Toggle` (`components/ui/toggle.tsx`).
- Pressed when `hideAmounts === true`.
- Icons (Phosphor, `weight="fill"`): `EyeIcon` when amounts are visible; `EyeSlashIcon` when hidden.
- `aria-label` is action-oriented: “Hide amounts” / “Show amounts”.
- Tooltip shows the same label plus a platform-aware `<Kbd>` hint (`⇧⌘.` on Mac, `Ctrl+⇧+.` elsewhere).

### Keyboard

- Library: **`react-hotkeys-hook`** (React lifecycle, scopes for future shortcuts, first-class form-tag options).
- Shortcut: **`Mod+Shift+.`** (`meta+shift+period` / `ctrl+shift+period`).
- Register once in the authenticated app shell alongside `GlobalMenu`.
- Options: `enableOnFormTags: true`, `enableOnContentEditable: true`, `preventDefault: true`.
- Click and hotkey invoke the same toggle handler.

Rationale for the chord: avoids common browser shortcuts such as `Mod+Shift+H` (Home), `Mod+Shift+P` / `Ctrl+Shift+P` (
private window), `Ctrl+H` (history), and `Mod+P` (print). Modifier chord remains safe with `enableOnFormTags` because it
will not fire from ordinary typing.

## Shared `MoneyAmount` Component

### Role

`MoneyAmount` is the **only** supported way to render on-screen monetary amounts in product UI. Formatting primitives
stay in `lib/format.ts`; presentation/interaction live in the component.

### Behavior

1. Format via existing helpers (`formatCurrency`, `formatSignedAmount`, `formatCompactCurrency` as needed).
2. When privacy is **off** and `Math.abs(amount) >= 100_000`: show compact text at rest; hover/focus crossfades to the
   full amount (current `PotMoneyReveal` motion pattern, including reduced-motion support).
3. When privacy is **on**:
   - Render a **static** skeleton mask with the same width and height as the resting visible amount text (compact or
     full, whichever would show at rest) so toggling does not shift layout.
   - No pulse animation.
   - No hover/focus numeric reveal.
   - Accessible name: value is hidden; user should turn off privacy mode to reveal it. Do not put the numeric amount in
     `aria-label` while privacy is on. Visible mask is `aria-hidden`.

### Skeleton

Extend `components/ui/skeleton.tsx` with an animation toggle (e.g. `animate?: boolean`, default `true`) so loading
skeletons keep `animate-pulse` and privacy masks can disable it without forking styles. A thin wrapper used only by
`MoneyAmount` is acceptable if it still reuses skeleton tokens/classes.

### Active inputs

`CurrencyInput` and other editable money fields are **out** of `MoneyAmount` and remain visible while privacy mode is on
so users can still enter amounts.

### Migration

- Generalize or replace `PotMoneyReveal` with `MoneyAmount` (thin re-export allowed during transition).
- Migrate all displayed money call sites across modules (overview, pots, budgets, bills, credit cards, transactions,
  forecast, etc.).
- Chart money labels/tooltips use the same privacy flag (via context) even when they cannot mount the full React amount
  component.

## Charts & Non-Text Money Surfaces

| Surface                                    | Privacy on                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Axis ticks / legend values that show money | Static skeleton mask sized to the tick/label box; no raw numbers in the DOM for those nodes. |
| Chart tooltips / hover cards               | Keep series/category labels; replace amount text with the same static skeleton mask.         |
| Progress / utilization bars                | Geometry may stay; adjacent numeric labels use `MoneyAmount`.                                |
| Read-only amounts in dialogs/sheets        | `MoneyAmount`.                                                                               |
| Active inputs                              | Unmasked.                                                                                    |

Charts and `MoneyAmount` both read `hideAmounts` from the same hydrated prefs/finance state so one toggle updates the
whole signed-in UI.

## Errors, Accessibility, Testing

### Errors

- Optimistic toggle with rollback + toast on server failure.
- Invalid/missing `ui_preferences` never breaks boot; Zod defaults apply.

### Accessibility

- Icon-only toggle has descriptive `aria-label` and tooltip (label + `Kbd`).
- Hidden amounts expose privacy guidance to assistive tech, not the number.
- Hotkey available anytime inside the signed-in shell, including while focused in forms.

### Testing

- Zod defaults and JSON merge behavior for `ui_preferences`.
- `MoneyAmount`: compact threshold; privacy mask; accessible name does not include the number when hidden; layout sizing
  contract.
- Toggle pressed state reflects `hideAmounts`.
- Hotkey options documented; add a focused test where practical.

## Design System Updates (`DESIGN.md`)

Document as standards:

- Always use `MoneyAmount` for on-screen amounts; keep formatting in `lib/format`.
- Compact at absolute value ≥ `$100,000` with hover/focus full reveal when privacy is off.
- Privacy mode: synced global preference; static skeleton mask; no numeric reveal via hover or accessibility tree while
  on.
- Global menu: fixed top-right container for app-wide controls; privacy uses shadcn `Toggle` + tooltip + `Kbd`.
- Shortcut: `Mod+Shift+.` toggles privacy in the signed-in app.

## Architecture Sketch

```
FinanceAppShell
├── FinanceProvider (hideAmounts from ui_preferences)
├── GlobalMenu (fixed top-right)
│   └── Privacy Toggle + Tooltip + Kbd
├── useHotkeys("mod+shift+.") → same toggle handler
└── pages / modules
    └── MoneyAmount / chart helpers → read hideAmounts
```

Persistence:

```
Toggle/Hotkey → optimistic state → server action → UPDATE profiles.ui_preferences (jsonb merge)
```

## Open Implementation Notes (non-blocking)

- Exact z-index token/class should match existing dialog stacking in the app shell.
- Platform detection for `Kbd` label should follow common Mod conventions (Mac meta vs non-Mac ctrl) without adding a
  heavy dependency if a small helper already exists or can live next to the menu.
- Chart library integration may need small privacy-aware formatters rather than mounting full `MoneyAmount` inside
  Recharts primitives; behavior must still match this spec.

```

```
