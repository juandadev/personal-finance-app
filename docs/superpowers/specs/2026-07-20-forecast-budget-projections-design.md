# Forecast Budget Projections — Design

**Date:** 2026-07-20  
**Status:** Approved  
**Amends:** [Cash Forecast — Design](./2026-07-11-cash-forecast-design.md)

## Summary

Extend the Cash Forecast engine so opted-in monthly budgets contribute expected
primary-account cash outflows. Each included budget projects only its
out-of-pocket amount (`limit − monthly voucher coverage`), not the full limit.
Credit-card spend assigned to those budgets reduces the budget projection in the
**statement payment-due month** (the same month the card obligation already
appears), so Forecast does not double-count that cash. The Budgets module keeps
its existing purchase-month spend behavior unchanged.

Planned outflows and additional income remain fully user-managed. This design
does not auto-detect or block overlaps between planned outflows and budget
projections.

## Goals

- Include selected budgets in Forecast as scheduled cash need.
- Project only out-of-pocket cash: `limit − monthly_voucher_coverage`.
- Avoid double-counting card-assigned budget spend with card statement
  obligations by reducing the budget projection in the payment-due month.
- Keep Budgets spend timing on `posted_at` month (including credit-card and
  voucher assignments).
- Let users opt budgets into Forecast from the Forecast page, listing active
  budgets by name (not raw category ids).
- Persist opt-in by category id so selection survives monthly budget copy.
- Store monthly voucher coverage on each budget and copy it on monthly close.

## Non-Goals

- Changing how Budgets calculate spent / remaining.
- Inferring voucher coverage from transaction history.
- Auto-migrating, suppressing, or warning about overlapping planned outflows.
- Treating every budget as included by default.
- Persisting generated forecast projection rows.
- Forecasting unknown future card purchases beyond the opted-in budget
  envelopes and existing card-obligation logic.
- Multi-currency or multi-account forecast changes.

## Relationship to prior forecast non-goal

The original cash-forecast design listed “Treat budget limits as scheduled
spending” as a non-goal. This design **narrowly revises** that rule:

- Budget limits are still not treated as scheduled spending **by default**.
- Opted-in categories **do** contribute budget projections using the rules
  below (out-of-pocket + due-month card exclusion).

## Core Decisions

- **Approach:** First-class budget projection inside `buildCashForecast`, not
  synthetic `planned_outflow` adjustments.
- **Opt-in storage:** Category ids on cash forecast settings; UI binds to
  active budgets by name.
- **Voucher coverage storage:** `monthly_voucher_coverage_cents` on `budgets`;
  edited in budget create/edit; copied on monthly close.
- **Future months:** Use the **current active** budget’s limit and coverage for
  every future forecast month (assume continuity).
- **Card exclusion month:** Payment-due month of the card charge’s statement
  obligation, not the purchase/assignment month.
- **Combined cash in due month:** For a charge of amount `A` against an OOP
  envelope `O`, the due month shows card obligation `A` plus budget projection
  `O − A` (clamped at 0), totaling `O` when `A ≤ O`.
- **Planned outflows:** Unchanged; coexistence is manual.

## Terminology

- **Out-of-pocket (OOP):** `max(0, limit_cents − monthly_voucher_coverage_cents)`.
- **Budget projection:** Forecast outflow derived from an opted-in budget for a
  specific forecast month after residual and card-due adjustments.
- **Included category:** A category id stored in forecast settings whose active
  budget may produce projections.
- **Payment-due month:** Local `YYYY-MM` of a credit-card obligation’s
  `paymentDueDate`.

## Persistence

### `budgets`

Add column:

| Column                           | Type    | Rules                                                           |
| -------------------------------- | ------- | --------------------------------------------------------------- |
| `monthly_voucher_coverage_cents` | integer | `NOT NULL DEFAULT 0`, `>= 0`, must be `<= limit_cents` on write |

Monthly close copy (`lib/finance/monthly-close.ts`) includes this column when
inserting the next period’s budgets.

### `cash_forecast_settings`

Add included categories, e.g.:

| Column                         | Type     | Rules                                                          |
| ------------------------------ | -------- | -------------------------------------------------------------- |
| `included_budget_category_ids` | `uuid[]` | `NOT NULL DEFAULT '{}'`; ids of categories opted into forecast |

Alternative acceptable shape: a small join table with `(user_id, category_id)`.
Array is sufficient for v1 if load/save stays on the existing settings row.

Orphan category ids (deleted categories) are ignored at read time and pruned on
the next settings save.

### Generated output

Still not persisted. New activity source value: `budget_projection`.

## Calculation

Resolve participants: for each id in `included_budget_category_ids`, find the
budget for the **current active budget period** and that `category_id`. If none,
contribute `$0` (skip).

Define:

```text
oop_cents = max(0, limit_cents - monthly_voucher_coverage_cents)
```

### Card amounts attributed to a category in month M

Sum amounts that appear on unpaid credit-card obligations with
`paymentDueDate` in forecast month M and that come from transactions which:

1. Have `payment_method = credit_card`, and
2. Are assigned to **any** budget whose `category_id` is the included category
   (usually the purchase-month budget; not necessarily the current active row).

Reuse existing obligation construction so due dates stay consistent with card
statement rows already shown in Forecast.

For the current-month residual formula, `base_cash_need` still uses assignments
on the **current active** budget only. The due-month card subtraction then uses
this category-level attribution for the current month as well (so a same-month
due charge is not counted twice).

### Future months

```text
budget_projection(M) = max(0, oop_cents - card_attributed_to_category_due_in_M)
```

Use the current active budget’s `oop_cents` for every future M.

### Current month

```text
cash_assigned = bank + card assignments due in the current month
  (exclude voucher assignments; exclude card charges due in a later month)

budget_projection(current) = max(0, oop_cents - cash_assigned)
```

Notes:

- Card charges due in a **later** month do not reduce the current-month budget
  projection; they reduce that later month instead.
- Bank assignments reduce current projection; those cash amounts also continue
  to appear in current-month actuals when they already posted.
- Voucher assignments never affect Forecast budget projections. Monthly voucher
  coverage only shrinks the projected OOP envelope (`limit − coverage`); actual
  voucher spend is ignored because it is not cash leaving the primary account.
- Credit-card obligation lines are unchanged; budget projection only subtracts
  the overlapping attributed amount.

### Worked example

- Groceries limit `$12,426`, voucher coverage `$3,566` → OOP `$8,860`
- July: `$500` groceries on credit card, payment due August
- Category opted into forecast

| Month  | Grocery budget projection | Card obligation (that charge) | Grocery-related cash total |
| ------ | ------------------------- | ----------------------------- | -------------------------- |
| July   | Unchanged by the `$500`   | —                             | (other July rules apply)   |
| August | `$8,360`                  | `$500`                        | `$8,860`                   |

### Totals

Add each month’s positive budget projections into that month’s total outflows
and monthly change, same as bills and planned outflows.

## UI

### Budget create / edit

- Field: **Monthly voucher coverage** (money input, default `$0`)
- Helper: only `limit − coverage` is treated as expected cash in Forecast when
  the budget’s category is included
- Validation: coverage must be `<=` limit; inline error on violation

### Forecast — Budget projections panel

- List **active budgets** by name (show limit; show computed OOP when coverage
  `> 0`)
- Checkbox / toggle per budget to include in forecast
- Empty state when there are no active budgets, with a short pointer to Budgets
- Save maps selected budgets → `included_budget_category_ids`
- Never display raw category UUIDs in this panel

### Activity report / chart

- Source: `budget_projection`
- Label: budget name (e.g. “Groceries”)
- Amount: that month’s projection (not the full limit)
- Omit rows when amount is `0`

## Edge cases

| Case                                              | Behavior                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Coverage > limit                                  | Reject budget save                                                       |
| Coverage = limit                                  | OOP `0`; no projection row                                               |
| Included category, no active budget               | Skip (`$0`)                                                              |
| Card due in M, attribution > remaining projection | Clamp projection to `0`                                                  |
| Voucher assignments (any amount / coverage)       | Ignored for Forecast budget projections                                  |
| Cross-category assignment                         | Follow the assigned **budget**; opt-in match uses that budget’s category |
| Forecast not `ready`                              | Existing gates; no projections                                           |
| Overlapping planned outflow                       | Both count; user-managed                                                 |
| Orphan included category ids                      | Ignore on read; prune on next save                                       |

## Testing

### Engine (`cash-forecast.test.ts`)

- Future month OOP = limit − coverage
- July card charge due August: July projection unchanged by that charge; August
  projection reduced by charge amount; August card obligation still includes
  charge; combined grocery-related cash in August equals full OOP when charge
  `≤` OOP
- Current month: bank assignment reduces projection via remaining budget
- Current month: voucher assignments do not change budget projections
  (including when coverage is `$0`)
- Same-month card due: reduces current projection; obligation still present once
- Category not opted in → no `budget_projection` rows
- Opted in without active budget → skipped

### Monthly close

- Copied budgets retain `monthly_voucher_coverage_cents`

### UI / actions

- Budget dialog validates coverage `<=` limit
- Forecast panel lists active budgets by name and persists category ids

### Regression

- Existing forecast suites (income, bills, cards, planned outflows, voucher
  exclusion from cash actuals) still pass
- Budgets purchase-month spend behavior unchanged

## Implementation touchpoints (indicative)

- Migration: budgets coverage column + forecast settings included categories
- `lib/finance/types.ts`, queries, actions, reducer/settings save path
- `lib/finance/monthly-close.ts` copy column
- `lib/finance/cash-forecast.ts` projection math + activity rows
- Budget form UI for coverage
- Forecast page panel for opt-in
- Update `DESIGN.md` only if new Forecast UI patterns need documenting beyond
  existing forecast chart/activity guidance

## Success criteria

1. Opted-in Groceries at `$12,426` with `$3,566` voucher → future months show
   `$8,860` budget projection (not `$12,426`).
2. Card grocery charge due next month increases that due month’s card obligation
   and reduces **that same month’s** grocery budget projection so combined
   grocery-related cash equals full OOP (not purchase-month residual reduction).
3. Budgets module behavior unchanged.
4. Categories not opted in contribute `$0` to forecast.
5. Forecast opt-in UI shows active budget names, never category ids.
