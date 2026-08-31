# Forecast Current-Month Income — Design

**Date:** 2026-07-20  
**Status:** Approved  
**Amends:** [Cash Forecast — Design](./2026-07-11-cash-forecast-design.md)

## Summary

Revise the Cash Forecast engine so the **current month** projects **remaining**
default monthly income instead of excluding it entirely. Salary received in the
current month (category slug `salary`) reduces that pending amount so the
forecast does not double-count pay already recorded. The current month now
starts from today's live primary-account balance; pot main-account movements
are already in that balance and do not change Forecast totals. They can still
appear as Actual activity. The account-owner contact is reserved for pot
movements and hidden from manual transaction entry.

Amended by
[Forecast Current Month From Live Balance — Design](./2026-08-31-forecast-current-month-from-live-balance-design.md).

Implementation stays inside the pure `buildCashForecast` module plus a small UI
filter on the transaction contact picker. No schema migration is required.

## Goals

- Include **remaining** default monthly income in the current month's projected
  income.
- Reduce remaining default income by salary-category transactions posted in the
  current month (category slug `salary`, case-insensitive).
- Keep pot main-account transactions out of forecast totals because they are
  already in today's live balance. Still show them as Actual activity.
- Use today's primary-account balance as the current-month opening.
- Hide the account-owner contact from manual Add/Edit Transaction dialogs.
- Leave future-month projection unchanged (full default income every month).

## Non-Goals

- Changing how account summaries or the Transactions module classify income.
- Adding forecast settings for salary category selection (slug matching only).
- Adding durable transaction markers such as `pot_id`.
- Excluding pot movements from the user's actual bank balance or account
  summaries.
- Adjusting future months based on salary already received in the current month.
- Counting posted cash activity again in the current-month ending balance.

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
- **Current-month totals:** pending income and pending outflows only. Posted
  cash activity is used solely to compute salary received.

## Terminology

- **Remaining default income:** `max(0, default_monthly_income_cents −
salaryReceivedCents)` for the current period only.
- **Salary received:** Sum of positive, cash-changing, primary-account
  transactions in the current month whose category slug is `salary`, excluding
  owner-contact transactions.
- **Pot main-account movement:** A pot Add Money or Withdraw action routed
  through the primary bank account, recorded as a transaction using the
  account-owner counterparty. Already reflected in today's live balance.

## Algorithm Changes

### Opening balance

```text
openingBalanceCents = todayPrimaryBalanceCents
```

Posted cash activity, including pot movements, is already in that live balance.

### Current-month projected income

```text
salaryCategoryId = category where lower(slug) = 'salary' (if any)

salaryReceivedCents =
  sum(positive cash-changing primary-account transactions in current month
      where category_id = salaryCategoryId
      and counterparty is not account owner)

remainingDefaultIncomeCents =
  max(0, default_monthly_income_cents − salaryReceivedCents)

displayTotalIncomeCents =
  actualIncomeCents
  + remainingDefaultIncomeCents
  + additionalIncomeCents
```

Future months keep the existing rule:

```text
totalIncomeCents = default_monthly_income_cents + additionalIncomeCents
```

### Current-month projected outflows

```text
displayTotalOutflowsCents =
  actualOutflowCents
  + directBillOutflowCents
  + creditCardOutflowCents
  + plannedOutflowCents
  + budgetProjectionOutflowCents
```

Posted pot deposits and other bank outflows are already in today's balance and
do not change the ending. They do count in display totals so the table adds up.

### Ending balance

```text
monthlyChangeCents = displayTotalIncomeCents − displayTotalOutflowsCents
endingBalanceCents =
  openingBalanceCents
  + remainingDefaultIncomeCents
  + additionalIncomeCents
  − pending outflows
```

Because opening balance is today's actual balance, the current month ending
reflects remaining expected income plus pending obligations without replaying
posted cash. Display totals still include listed Actual rows.

### Worked example

Default monthly income: $40,000. Salary received this month: $20,000. Pot
withdrawal to bank: $5,000. Today's balance: $125,000.

| Component                | Amount                     |
| ------------------------ | -------------------------- |
| Today's balance          | $125,000                   |
| Remaining default income | $20,000                    |
| Pot withdrawal           | already in today's balance |
| Total projected income   | $20,000                    |

Ending balance before pending outflows: $125,000 + $20,000 = $145,000.

## Domain Output

### `CashForecastMonth` (current period)

| Field                | Meaning                                            |
| -------------------- | -------------------------------------------------- |
| `actualIncomeCents`  | Listed current-month cash income, including pots   |
| `actualOutflowCents` | Listed current-month cash outflows, including pots |
| `defaultIncomeCents` | Remaining default income for the current month     |
| `totalIncomeCents`   | Display sum of listed income rows                  |

Future months: `defaultIncomeCents` remains the full saved default;
`actualIncomeCents` and `actualOutflowCents` remain zero.

### Activities

**Current month**

- Include posted cash-changing primary-account transactions as `cash_transaction`
  rows with status `actual`, including owner-contact pot movements.
- When `remainingDefaultIncomeCents > 0`, add one pending row:
  - key: `default-income:{period}`
  - sourceType: `default_income`
  - label: `Remaining Monthly Income`
  - status: `pending`

**Future months**

- Unchanged: one pending `default_income` row labeled `Default Monthly Income`
  when the saved default is greater than zero.

### Bridge

Expose forecast-adjusted values for display consistency:

- `actualIncomeCents` → 0
- `actualOutflowCents` → 0
- `actualNetMovementCents` → 0
- `openingBalanceCents` → today's primary-account balance
- `pendingIncomeCents` → remaining default income plus additional income

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
income plus additional income.

## Edge Cases

| Case                                        | Behavior                                              |
| ------------------------------------------- | ----------------------------------------------------- |
| Salary received exceeds default             | `remainingDefaultIncomeCents = 0`                     |
| No `salary` slug category                   | Full default applies as remaining income              |
| Category renamed from Salary                | Slug updates; link breaks until name/slug is restored |
| Multiple salary transactions                | Sum all qualifying salary receipts                    |
| Non-salary income                           | Already in today's balance; does not reduce default   |
| Owner contact used only by pot movements    | Reliable after hiding from manual entry               |
| Pot direct adjustment / pot-to-pot transfer | No bank transaction; forecast unaffected              |

## Testing

Add or update unit tests in `lib/finance/cash-forecast.test.ts`:

1. Current month includes remaining default after partial salary.
2. Current month total income does not double-count salary already in today's
   balance.
3. Salary above default clamps remaining default to zero.
4. Pot withdrawal does not lower the current-month ending below today's
   balance plus remaining income.
5. Pot deposit does not raise the current-month ending above today's balance
   plus remaining income.
6. Non-salary income does not reduce remaining default.
7. Future months still use full default income.
8. Posted cash and owner-contact pot movements appear as Actual activity and
   count in display totals, not in the ending balance.

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
