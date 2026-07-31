# Forecast Month Exclusions — Design

**Date:** 2026-07-28  
**Status:** Approved  
**Amends:** [Cash Forecast — Design](./2026-07-11-cash-forecast-design.md),
[Forecast Budget Projections — Design](./2026-07-20-forecast-budget-projections-design.md)

## Summary

Let users exclude specific Cash Forecast activity rows from projection totals
for a single month, without deleting the underlying bill, income setting,
budget opt-in, or custom forecast adjustment. Excluded rows stay visible in
that month’s activity list (muted and struck through) so they can be
re-included. Persistence uses a dedicated exclusions table. Global
budget-category opt-in is unchanged.

## Goals

- Exclude `budget_projection`, `default_income`, `recurring_bill`,
  `additional_income`, and `planned_outflow` rows for one `YYYY-MM` at a time.
- Keep excluded rows visible with a clear Include action.
- Update month totals, ending-balance chain, and chart series so excluded
  amounts do not contribute.
- Persist exclusions across sessions, scoped to the signed-in user.
- Visually distinguish generated (projected) rows from user-created
  adjustments; both kinds can be month-excluded.
- Keep the existing global Budget projections checkboxes as the only way to
  opt budgets into Forecast for the whole horizon.

## Non-Goals

- Excluding credit card statements, statement children, or current-month cash
  transactions.
- Per-month _inclusion_ of a budget category that is globally opted out.
- Replacing or removing the global Budget projections panel.
- Bulk “reset exclusions for this month.”
- Auto-detecting overlaps between planned outflows and generated rows.
- Persisting generated forecast activity rows themselves.
- Eager cleanup of orphan exclusion rows (deleted bills or adjustments, etc.).

## Core Decisions

- **Approach:** Dedicated `cash_forecast_exclusions` table; engine still
  generates activities, then marks matches and omits their amounts from
  totals.
- **Visibility:** Excluded rows remain in `activities` with
  `excludedFromProjection: true`; UI mutes and strikes through; amounts show
  the would-be value.
- **Budget interaction:** Month exclusion applies only when the category is
  already in `included_budget_category_ids`. Global opt-out removes projections
  entirely (no row to exclude).
- **Custom adjustments:** One-time and monthly adjustments both support
  month exclusion. Excluding a monthly item in August does not remove it from
  September. Edit/Delete remain available; exclusion does not delete the
  adjustment record.
- **Identity:** Key by stable domain ids, not ephemeral activity keys:
  - `budget_projection` → category id
  - `recurring_bill` → bill id
  - `default_income` → literal `default_income`
  - `additional_income` / `planned_outflow` → adjustment id
    plus `period` (`YYYY-MM`).
- **Budget key choice:** Category id (not budget row id) so exclusions survive
  monthly budget copy, consistent with global opt-in.
- **Saves:** Immediate toggle (optimistic), same interaction model as budget
  projection checkboxes; no separate Save.

## Terminology

- **Generated / projected row:** Activity with `sourceType` of
  `budget_projection`, `default_income`, or `recurring_bill`.
- **Custom forecast item:** Activity backed by a
  `CashForecastAdjustmentRecord` (`additional_income` or `planned_outflow`).
- **Month exclusion:** A persisted record that zeros that row’s contribution
  for one period while keeping the row visible.
- **Global budget opt-in:** Existing `included_budget_category_ids` on
  `cash_forecast_settings`.

## Persistence

### `cash_forecast_exclusions`

| Column        | Type        | Rules                                                                                                            |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`          | uuid        | PK, default random                                                                                               |
| `user_id`     | text        | NOT NULL, FK to `profiles(user_id)`, part of ownership                                                           |
| `source_type` | text        | NOT NULL; one of `budget_projection`, `default_income`, `recurring_bill`, `additional_income`, `planned_outflow` |
| `source_key`  | text        | NOT NULL; category uuid, bill uuid, adjustment uuid, or `default_income`                                         |
| `period`      | text        | NOT NULL; `YYYY-MM`                                                                                              |
| `created_at`  | timestamptz | NOT NULL, default now                                                                                            |

Unique constraint: `(user_id, source_type, source_key, period)`.

RLS / queries: user can only read and write their own rows.

**Follow-up migration (custom items):** Widen `source_type` CHECK to include
`additional_income` and `planned_outflow` (table already shipped in `019`).

### Finance state

`cashForecastExclusions: CashForecastExclusionRecord[]` loaded with other
forecast data and updated via the finance reducer after successful toggles.

## Engine

In `buildCashForecast`:

1. Build months and activities as today (budget participants still gated by
   global opt-in).
2. Index exclusions by `(source_type, source_key, period)`.
3. For each candidate activity, resolve its exclusion identity:
   - `default_income` → (`default_income`, `default_income`, period)
   - `recurring_bill` → (`recurring_bill`, bill id, period)
   - `budget_projection` → (`budget_projection`, **category id** of the
     budget participant, period). Activity `sourceId` may remain budget id for
     display/color; matching uses category id.
   - `additional_income` / `planned_outflow` → (kind, adjustment id, period)
4. On match: set `excludedFromProjection: true` on the activity.
5. Month totals must not rely on activity flags alone. After marking exclusions,
   also subtract excluded amounts from the month’s component fields that feed
   `totalIncomeCents` / `totalOutflowsCents` (e.g. zero `defaultIncomeCents`
   for that month when the default-income row is excluded; omit excluded bill,
   budget projection, additional income, and planned outflow amounts from their
   components). Bridge pending totals follow the same rules. Ending balance
   chain and chart series use those adjusted totals.
6. Leave the activity in the month’s `activities` array with its original
   `amountCents` for display.

Orphan exclusions (no matching activity) are ignored. No v1 cleanup job.

If a category is removed from global opt-in, budget projection rows disappear;
any leftover exclusion rows for that category are inert until the category is
opted in again and a matching period row appears. Deleting an adjustment leaves
any exclusions for that id inert.

## UI

### Actions

| Row kind                       | Actions                            |
| ------------------------------ | ---------------------------------- |
| User adjustment (included)     | Menu: Edit / Delete / **Exclude**  |
| User adjustment (excluded)     | Menu: Edit / Delete / **Include**  |
| Excludable generated, included | **Exclude** (text button)          |
| Excludable generated, excluded | **Include** (text button)          |
| Other generated (cash, cards)  | Plain `Read-only` text (unchanged) |

Desktop Actions column and mobile row actions both expose these controls.

### Appearance

- **Generated + included:** Actions show Exclude/Include. Show a compact
  `Projected` label (muted, xs) beside the Source text. Do not use
  strike-through while included.
- **Custom adjustment + included:** No `Projected` cue. Edit/Delete/Exclude in
  the overflow menu.
- **Any excluded row (generated or custom):** Muted foreground + line-through
  on label and amount; amount still shows the would-be value; Include
  available. Generated rows keep the `Projected` cue.
- **Non-excludable generated:** No new styling; keep plain `Read-only`.

Follow `DESIGN.md` tokens and existing table density; prefer text/button
patterns already used in forecast actions over new icon-only inventiveness.

### Interaction

- Toggle applies only to the activity’s period (the pinned month’s row).
- Optimistic update; disable that row’s control while the request is in flight
  (not the whole table).
- On failure: revert optimistic state and show an error toast using existing
  patterns.

## Data flow

```
UI Exclude/Include
  → server action (upsert or delete exclusion)
  → finance reducer updates cashForecastExclusions
  → selectCashForecast / buildCashForecast
  → activity flags + totals/chart
```

## DESIGN.md updates (implementation)

Amend Cash Forecast section to state:

- Excludable generated rows (`budget_projection`, `default_income`,
  `recurring_bill`) expose Exclude/Include instead of static Read-only.
- Custom forecast adjustments expose Exclude/Include in the same overflow menu
  as Edit/Delete.
- Exclusions are month-specific, persisted, and keep the row visible muted /
  struck through when excluded.
- Totals and chart ignore excluded amounts.
- Global Budget projections opt-in remains the horizon-wide budget gate.
- Credit card and actual cash rows remain non-excludable Read-only.

## Testing

- Engine: exclude default income in month M → that month’s income/totals drop
  by that amount; M±1 unchanged; activity still listed with
  `excludedFromProjection`.
- Engine: exclude recurring bill occurrence for one period only.
- Engine: exclude budget projection by category+period; other months and other
  budgets unchanged.
- Engine: exclusion for a non-opted-in budget category has no effect (no row).
- Engine: exclude a monthly `planned_outflow` / `additional_income` in month M
  only; other months still include it; activity remains with flag.
- Queries/actions: unique key; user isolation; include deletes the row; new
  source types accepted.
- UI: Exclude/Include on generated rows; adjustment menu includes
  Exclude/Include with Edit/Delete; muted+strike when excluded; cash/card still
  Read-only.

## Implementation sketch (non-normative)

Already shipped for generated rows (`019`, types, engine, UI). Remaining for
custom items:

- Migration widening `source_type` CHECK
- Types + Zod allow `additional_income` / `planned_outflow`
- Engine: flag and omit excluded adjustment amounts from components + bridge
- UI: add Exclude/Include to `ForecastActivityActions` menu; apply excluded
  styling to adjustment rows
- `DESIGN.md` + tests as above
