# Forecast Current-Month Income — Design

**Date:** 2026-07-20  
**Status:** Approved  
**Amends:** [Cash Forecast — Design](./2026-07-11-cash-forecast-design.md)

## Summary

Revise the Cash Forecast engine so the **current month** projects **remaining**
default monthly income instead of excluding it entirely. Salary received in the
current month (category slug `salary`) reduces that pending amount so the
forecast does not double-count pay already recorded. Pot main-account movements
are excluded from forecast income and outflow totals because they are internal
reallocations, not external cash flow. The account-owner contact is reserved for
pot movements and hidden from manual transaction entry.

Implementation stays inside the pure `buildCashForecast` module plus a small UI
filter on the transaction contact picker. No schema migration is required.

## Goals

- Include **remaining** default monthly income in the current month's projected
  income.
- Reduce remaining default income by salary-category transactions posted in the
  current month (category slug `salary`, case-insensitive).
- Exclude pot main-account transactions from forecast income and outflow totals.
- Keep opening-balance reconstruction accurate using **all** cash-changing
  transactions, including pot movements.
- Hide the account-owner contact from manual Add/Edit Transaction dialogs.
- Leave future-month projection unchanged (full default income every month).

## Non-Goals

- Changing how account summaries or the Transactions module classify income.
- Adding forecast settings for salary category selection (slug matching only).
- Adding durable transaction markers such as `pot_id`.
- Excluding pot movements from the user's actual bank balance or account
  summaries.
- Adjusting future months based on salary already received in the current month.
- Showing pot main-account movements in the forecast activity list.

## Core Decisions

- **Approach:** Forecast-engine adjustment only inside `buildCashForecast`; no
  persistence changes.
- **Salary identification:** Match the user's category whose slug equals
  `salary` (case-insensitive). If no such category exists, salary received is
  zero and the full default applies as remaining income.
- **Pot identification:** Treat any cash-changing primary-account transaction
  whose counterparty is the account owner (`is_account_owner = true`) as a pot
  main-account movement.
- **Owner contact UX:** Hide the account-owner contact from manual transaction
  entry so the counterparty signal stays reliable.
- **Two totals in the engine:**
  - **Reconciliation totals** — all cash-changing transactions; used only for
    opening-balance reconstruction.
  - **Forecast totals** — exclude owner-contact transactions; used for current
    month income/outflow display, monthly totals, chart data, and activity rows.

## Terminology

- **Remaining default income:** `max(0, default_monthly_income_cents −
salaryReceivedCents)` for the current period only.
- **Salary received:** Sum of positive, cash-changing, primary-account
  transactions in the current month whose category slug is `salary`, excluding
  owner-contact transactions.
- **Forecast actual income:** Positive cash-changing transactions counted toward
  current-month projected income, excluding owner-contact transactions.
- **Forecast actual outflow:** Absolute sum of negative cash-changing
  transactions counted toward current-month projected outflows, excluding
  owner-contact transactions.
- **Pot main-account movement:** A pot Add Money or Withdraw action routed
  through the primary bank account, recorded as a transaction using the
  account-owner counterparty.

## Algorithm Changes

### Opening balance (unchanged anchor)

Select all primary-account cash-changing transactions posted from the first day
of the current local month through the configured as-of date.

```text
reconciliationIncomeCents = sum(positive cash-changing transactions)
reconciliationOutflowCents = sum(abs(negative cash-changing transactions))
reconciliationNetCents = reconciliationIncomeCents − reconciliationOutflowCents
openingBalanceCents = todayPrimaryBalanceCents − reconciliationNetCents
```

This includes pot movements because they did move bank cash and must reconcile
to today's actual balance.

### Current-month projected income

```text
salaryCategoryId = category where lower(slug) = 'salary' (if any)

salaryReceivedCents =
  sum(positive cash-changing primary-account transactions in current month
      where category_id = salaryCategoryId
      and counterparty is not account owner)

forecastActualIncomeCents =
  sum(positive cash-changing primary-account transactions in current month
      where counterparty is not account owner)

remainingDefaultIncomeCents =
  max(0, default_monthly_income_cents − salaryReceivedCents)

totalIncomeCents =
  forecastActualIncomeCents
  + remainingDefaultIncomeCents
  + additionalIncomeCents
```

Future months keep the existing rule:

```text
totalIncomeCents = default_monthly_income_cents + additionalIncomeCents
```

### Current-month projected outflows

```text
forecastActualOutflowCents =
  sum(abs(negative cash-changing primary-account transactions in current month
          where counterparty is not account owner))

totalOutflowsCents =
  forecastActualOutflowCents
  + directBillOutflowCents
  + creditCardOutflowCents
  + plannedOutflowCents
  + budgetProjectionOutflowCents
```

Pot deposits from the main account (negative owner-contact transactions) are
excluded symmetrically with pot withdrawals.

### Ending balance

```text
monthlyChangeCents = totalIncomeCents − totalOutflowsCents
endingBalanceCents = openingBalanceCents + monthlyChangeCents
```

Because opening balance is anchored to today's actual balance and forecast
totals exclude internal pot movements, the current month ending balance reflects
real external income still expected plus pending obligations.

### Worked example

Default monthly income: $40,000. Salary received this month: $20,000. Pot
withdrawal to bank: $5,000. Today's balance: $125,000. Reconstructed opening:
$100,000.

| Component                            | Amount   |
| ------------------------------------ | -------- |
| Forecast actual income (salary only) | $20,000  |
| Remaining default income             | $20,000  |
| Pot withdrawal                       | excluded |
| Total projected income               | $40,000  |

Ending balance before pending outflows: $100,000 + $40,000 = $140,000.

## Domain Output

### `CashForecastMonth` (current period)

| Field                | Meaning                                          |
| -------------------- | ------------------------------------------------ |
| `actualIncomeCents`  | Forecast actual income (excludes pot movements)  |
| `actualOutflowCents` | Forecast actual outflow (excludes pot movements) |
| `defaultIncomeCents` | Remaining default income for the current month   |
| `totalIncomeCents`   | Sum per algorithm above                          |

Future months: `defaultIncomeCents` remains the full saved default;
`actualIncomeCents` and `actualOutflowCents` remain zero.

### Activities

**Current month**

- Include forecast actual transactions (non-owner-contact) as `cash_transaction`
  rows with status `actual`.
- When `remainingDefaultIncomeCents > 0`, add one pending row:
  - key: `default-income:{period}`
  - sourceType: `default_income`
  - label: `Remaining Monthly Income`
  - status: `pending`
- Omit owner-contact transactions entirely.

**Future months**

- Unchanged: one pending `default_income` row labeled `Default Monthly Income`
  when the saved default is greater than zero.

### Bridge

Expose forecast-adjusted values for display consistency:

- `actualIncomeCents` → forecast actual income
- `actualOutflowCents` → forecast actual outflow
- `actualNetMovementCents` → forecast actual income − forecast actual outflow
- `openingBalanceCents` → still derived from full reconciliation net

## UI Changes

### Transaction dialog

Add an optional prop to `ContactSelectWithQuickCreate`, e.g.
`excludeAccountOwner?: boolean`. When true, omit counterparties where
`is_account_owner === true` from selectable options.

Pass `excludeAccountOwner` from the Add/Edit Transaction dialog only. Pot
transfer dialogs remain unchanged.

### Forecast page

No new controls. Existing chart and activity report consume updated engine
output. The current-month income bar and totals reflect remaining default
income plus non-pot actual income.

## Edge Cases

| Case                                        | Behavior                                                  |
| ------------------------------------------- | --------------------------------------------------------- |
| Salary received exceeds default             | `remainingDefaultIncomeCents = 0`                         |
| No `salary` slug category                   | Full default applies as remaining income                  |
| Category renamed from Salary                | Slug updates; link breaks until name/slug is restored     |
| Multiple salary transactions                | Sum all qualifying salary receipts                        |
| Non-salary income                           | Counts in forecast actual income; does not reduce default |
| Owner contact used only by pot movements    | Reliable after hiding from manual entry                   |
| Pot direct adjustment / pot-to-pot transfer | No bank transaction; forecast unaffected                  |

## Testing

Add or update unit tests in `lib/finance/cash-forecast.test.ts`:

1. Current month includes remaining default after partial salary.
2. Current month total income does not double-count salary.
3. Salary above default clamps remaining default to zero.
4. Pot withdrawal excluded from forecast income; opening balance still correct.
5. Pot deposit excluded from forecast outflow.
6. Non-salary income included without reducing remaining default.
7. Future months still use full default income.
8. Owner-contact transactions omitted from forecast activities.

Add or update component test for transaction contact picker excluding account
owner when `excludeAccountOwner` is set.

## Amendments to Prior Forecast Design

Replace these rules from the 2026-07-11 cash-forecast design:

- ~~"without projecting the default income in the current month"~~ → project
  **remaining** default income in the current month.
- ~~"exclude the default monthly income" from current-month reconciliation~~ →
  include remaining default income in current-month totals.
- ~~"The partial current month does not add default income"~~ → current month
  adds remaining default income when greater than zero.

All other forecast behavior (future months, adjustments, bills, cards, budget
projections) remains unchanged.
