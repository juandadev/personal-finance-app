# Budget Over-Limit UI Design

## Overview

When assigned spending exceeds a budget limit, the app should give clear, consistent visual feedback in the current-month UI. The overview budgets card will show remaining money (including negative values when over). The budgets page will use destructive styling for over-limit percentages, progress bar tracks, and exceeded amounts. Monthly close snapshots will persist over-budget status and overage so future history UI can report accurately.

This work does not build a historical budgets UI. It prepares snapshot data and aligns live UI with the monthly close pipeline.

## Approved Scope

### In scope

- Shared budget balance helpers in `lib/finance/budget-balance.ts`.
- Overview `BudgetItem`: show remaining amount; destructive color when negative.
- Budgets page category cards: destructive progress track, percentage, and **Exceeded** block with positive overage.
- Budgets page spending summary: destructive spent amount and percentage when over limit.
- Leave overview and budgets page circular charts unchanged.
- Extend `budget_monthly_snapshots` with `status` and `over_cents`.
- Update `closeMonthlyBudgets()` snapshot INSERT to use shared helpers.
- Update `DESIGN.md` with budget over-limit state rules.
- Unit and component tests for helpers and affected UI.

### Out of scope

- Historical budgets UI or snapshot read queries.
- Aggregate over-budget status on `monthly_report_runs`.
- Changes to the `Budget` type or selector output shape.
- Backfilling accurate over-budget data for snapshots created before this migration.
- Notifications, toasts, or badges outside the listed surfaces.

## Approach

Use **shared finance helpers** (Approach A). UI components and monthly close both call the same pure functions. Do not enrich the `Budget` type in selectors.

## Shared Logic

Add `lib/finance/budget-balance.ts`:

| Function               | Signature                               | Behavior                                                   |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `getBudgetRemaining`   | `(maximum, spent) => number`            | Returns `maximum - spent`. Can be negative.                |
| `getBudgetOverage`     | `(maximum, spent) => number`            | Returns `Math.max(spent - maximum, 0)`.                    |
| `isBudgetOverLimit`    | `(maximum, spent) => boolean`           | Returns `spent > maximum`.                                 |
| `getBudgetCloseStatus` | `(maximum, spent) => BudgetCloseStatus` | Returns `"over_budget"` when over, else `"within_budget"`. |

Add type:

```ts
type BudgetCloseStatus = "within_budget" | "over_budget"
```

Add display helper in `lib/format.ts` (same pattern as `transactionAmountClassName`):

| Function                           | Behavior                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `budgetOverLimitClassName(isOver)` | Returns `"text-destructive"` when over, else `"text-foreground"`. |

Edge case: when `maximum <= 0`, treat as not over (`isBudgetOverLimit` false, `getBudgetOverage` 0). `getBudgetRemaining` returns 0.

All money values in helpers use the same dollar units as the UI `Budget` type (`maximum`, `spent`). Monthly close converts to cents at the SQL boundary.

## Current-Month UI

### Overview — `BudgetItem`

- Replace displayed limit with **remaining** via `getBudgetRemaining(budget.maximum, budget.spent)`.
- Format with `formatCurrency(..., { forceDecimals: true })`.
- Apply `budgetOverLimitClassName(isBudgetOverLimit(...))` to the amount.
- Over budget shows a negative remaining value (for example `-$45.00`) in destructive color.
- Category color swatch and circular chart in `BudgetsCard` / `BudgetsChart` stay unchanged.

### Budgets page — `BudgetCategoryCard`

**Progress bar (`BudgetProgressBar`):**

- Fill width stays capped at 100% with the budget category color.
- Track background: `bg-background` when within budget; `bg-destructive/15` when over.
- Percentage label below the bar uses `text-destructive` when over (for example `112.5% spent`).
- Update `role="progressbar"` accessibility: when over, `aria-valuenow` stays at `maximum`, `aria-valuetext` reflects actual percentage including over 100%.

**Amount blocks:**

| State         | Label    | Value                                                                          | Color              |
| ------------- | -------- | ------------------------------------------------------------------------------ | ------------------ |
| Within budget | Free     | Remaining (`getBudgetRemaining`, clamp display to ≥ 0 only for the Free value) | `text-foreground`  |
| Over budget   | Exceeded | Overage (`getBudgetOverage`)                                                   | `text-destructive` |

When over budget, hide the Free block semantics entirely: show **Exceeded** with a positive overage amount (for example `$45.00`), not a negative remaining.

### Budgets page — `SpendingSummaryItem`

When `isBudgetOverLimit`:

- Spent amount: `text-destructive`.
- Percentage in the “X% spent” line: `text-destructive` on the percentage (via `<strong>`).
- Keep `of $X limit` in `text-muted-foreground` for context.

When within budget, styling stays as today.

## Snapshot Schema (History Prep)

Add migration `017_budget_snapshot_over_limit.sql`.

Extend `budget_monthly_snapshots`:

| Column       | Type                         | Constraints                               |
| ------------ | ---------------------------- | ----------------------------------------- |
| `status`     | `text NOT NULL`              | CHECK in (`within_budget`, `over_budget`) |
| `over_cents` | `integer NOT NULL DEFAULT 0` | CHECK `over_cents >= 0`                   |

Migration steps:

1. Add `over_cents integer NOT NULL DEFAULT 0` with CHECK `over_cents >= 0`.
2. Add nullable `status text`, backfill existing rows to `within_budget`, then set `NOT NULL` and add CHECK `status IN ('within_budget', 'over_budget')`.
3. Add a consistency CHECK: when `status = 'within_budget'` then `over_cents = 0`; when `status = 'over_budget'` then `over_cents > 0`.

Close-time values (per snapshot row):

| State         | `free_cents`                | `over_cents`                | `status`        |
| ------------- | --------------------------- | --------------------------- | --------------- |
| Within budget | `limit_cents - spent_cents` | `0`                         | `within_budget` |
| Over budget   | `0`                         | `spent_cents - limit_cents` | `over_budget`   |

Update `lib/finance/monthly-close.ts` snapshot INSERT to compute these from assignment totals using the same rules as `budget-balance.ts` (in cents). Keep `ON CONFLICT DO NOTHING` idempotency.

Update `BudgetMonthlySnapshotRecord` in `lib/finance/types.ts` with `status: BudgetCloseStatus` and `over_cents: number`.

**Backfill limitation:** Snapshots created before this migration cannot recover true over-budget state because prior close logic clamped `free_cents` to zero. Those rows remain `within_budget` with `over_cents = 0`.

## DESIGN.md Updates

Add a **Budget over-limit states** subsection under finance UI patterns:

- Within budget: remaining/free amounts use `text-foreground`; progress track uses `bg-background`.
- Over budget: exceeded amounts and over-limit percentages use `text-destructive`; progress track uses `bg-destructive/15`.
- Overview budget list shows **remaining** (negative allowed).
- Budget category cards switch the second amount label from **Free** to **Exceeded** and show positive overage.
- Do not rely on color alone; label and numeric sign communicate state.

## Testing

### Unit — `lib/finance/budget-balance.test.ts`

- Within budget, exactly at limit, and over limit for remaining, overage, status.
- `maximum <= 0` edge case.

### Component

- `BudgetItem`: remaining display; destructive class when over.
- `BudgetCategoryCard`: Exceeded label and overage when over; Free when within.
- `SpendingSummaryItem`: destructive spent and percentage when over.
- `BudgetProgressBar`: destructive track class when over.

### Monthly close

- Test or fixture asserting snapshot rows get correct `status` and `over_cents` when close runs against an over-budget budget.

## Files to Change

| Area         | Files                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Helpers      | `lib/finance/budget-balance.ts`, `lib/finance/budget-balance.test.ts`, `lib/format.ts`                     |
| Overview     | `components/overview/budgets/budget-item.tsx`                                                              |
| Budgets page | `components/budgets/budget-category-card.tsx`, `budget-progress-bar.tsx`, `spending-summary-item.tsx`      |
| Snapshots    | `db/migrations/017_budget_snapshot_over_limit.sql`, `lib/finance/monthly-close.ts`, `lib/finance/types.ts` |
| Design       | `DESIGN.md`                                                                                                |

## Success Criteria

- User can see at a glance which budgets are over limit on Overview and Budgets pages without opening transactions.
- Over-limit UI uses destructive tokens consistently and accessible labels (Exceeded, negative remaining on overview).
- New monthly close snapshots record `status` and `over_cents` for future history UI.
- Shared helpers keep UI and close logic aligned.
