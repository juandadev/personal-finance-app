# Cash Forecast — Design

**Date:** 2026-07-11  
**Status:** Approved

## Summary

Add a `Cash Forecast` module that summarizes the user's primary payment-account
cash for the current local calendar month and estimates its balance for the
next 12 full calendar months. The 13-month report starts the current month from
today's live primary-account balance, applies still-pending income and
obligations, and carries that ending balance through every future month.

Amended by
[Forecast Current Month From Live Balance — Design](./2026-08-31-forecast-current-month-from-live-balance-design.md).

The report combines a saved default monthly income, month-specific additional
income, direct recurring bills, credit-card statement payments, and custom
planned outflows. Users can also define a planned outflow that repeats every
month. Forecast values remain simulated data and never create income
transactions or change account balances.

The primary visualization is a composed monthly chart with income and outflow
bars plus a running ending-balance line. Hovering previews a month; selecting a
month pins it and updates a paginated activity list below the chart.

## Goals

- Show a current-month runway from today's live balance plus estimated ending
  balances for the next 12 full months.
- Use today's actual primary-account balance as the current-month opening.
- Distinguish still-pending forecast activity from posted bank activity that is
  already in today's balance.
- Carry every monthly surplus or deficit into all later projected balances.
- Start from the actual primary payment-account balance.
- Account for current-period custom adjustments and known remaining obligations
  without projecting the default income in the current month.
- Project direct recurring bills and credit-card cash payments in the month
  when money is expected to leave the primary account.
- Save one default monthly income used only by the forecast.
- Support labeled, one-time additional income in any displayed month.
- Support labeled, one-time or ongoing monthly planned outflows.
- Make negative future balances prominent so the user can plan corrective
  action.
- Explain each month through a detailed income and outflow list.
- Recalculate immediately after relevant finance data or forecast inputs change.

## Non-Goals

- Automatically create or modify transactions, account summaries, budgets, or
  savings balances.
- Infer the default income from transaction history.
- Forecast unknown future credit-card purchases.
- Treat budget limits as scheduled spending.
- Automatically reconcile user-created forecast adjustments against actual
  transactions.
- Support multiple forecast scenarios or scenario comparison.
- Forecast more than 12 full future months in the first version.
- Convert currencies.
- Persist generated forecast months, balances, or activity rows.
- Preserve historical versions of prior predictions.

## Core Decisions

- Use a live derived forecast. Persist user-owned settings and adjustments, then
  recompute generated results from the latest finance state.
- Use the existing primary payment-account resolver. Do not combine checking and
  savings accounts.
- Return 13 ordered months: the current local calendar month followed by 12 full
  future months.
- Treat the current month as today's live balance plus still-pending activity.
- Do not count posted primary-account cash activity again in current-month
  totals. Use current-month salary receipts only to reduce remaining default
  income.
- Keep current-period custom adjustments pending until the user edits or deletes
  them; do not infer settlement by matching transactions.
- Apply a credit-card obligation in its statement payment-due month.
- Apply a custom planned outflow in the user-selected month. It has no payment
  source and does not shift according to a card cycle.
- A repeating additional-income or planned-outflow adjustment starts in its
  selected period and remains active in every later rolling forecast month
  until edited or deleted.

## Terminology

- **Current-month runway:** Today's primary-account balance plus still-pending
  income minus still-pending outflows for the current local month.
- **Opening balance:** Today's primary-account balance for the current month,
  or the prior month's ending balance for future months.
- **Monthly change:** Total projected income minus total projected outflows.
- **Ending balance:** Opening balance plus monthly change.
- **Pending activity:** A forecast adjustment or unpaid generated obligation
  that has not yet changed cash.
- **Pinned month:** The month whose activity list is currently displayed.
- **Previewed month:** A temporarily hovered or keyboard-focused month whose
  ending balance is shown without changing the pinned activity list.

## Persistence

### `cash_forecast_settings`

Store one optional settings row per user:

| Field                          | Rule                                         |
| ------------------------------ | -------------------------------------------- |
| `user_id`                      | Primary key and owner reference              |
| `default_monthly_income_cents` | Integer cents; greater than or equal to zero |
| `created_at`                   | Creation timestamp                           |
| `updated_at`                   | Last-update timestamp                        |

The absence of this row means forecast onboarding is incomplete. A saved value
of zero is valid and differs from no settings row.

### `cash_forecast_adjustments`

Store user-created forecast entries:

| Field          | Rule                                                       |
| -------------- | ---------------------------------------------------------- |
| `id`           | Stable record identifier                                   |
| `user_id`      | Owner reference                                            |
| `kind`         | `additional_income` or `planned_outflow`                   |
| `name`         | Required user-facing label                                 |
| `amount_cents` | Positive integer cents                                     |
| `start_period` | `YYYY-MM`; the one-time period or monthly recurrence start |
| `recurrence`   | `once` or `monthly`                                        |
| `created_at`   | Creation timestamp                                         |
| `updated_at`   | Last-update timestamp                                      |

Database and server validation must enforce these invariants:

- Both adjustment kinds may use `once` or `monthly`.
- A monthly adjustment is active when
  `forecast_period >= adjustment.start_period`.
- A one-time adjustment is active only when
  `forecast_period = adjustment.start_period`.
- Names are trimmed and cannot be empty.
- Amounts are positive and remain within the application's safe money range.

Generated forecast output is never written to either table.

## Domain Output

The pure forecast engine returns:

- A current-month runway summary.
- Exactly 13 ordered months, beginning with the current local month.
- For each month:
  - period and display label;
  - whether it is the current period;
  - opening balance;
  - actual income and actual outflow totals;
  - default and additional income totals;
  - direct recurring-bill total;
  - credit-card payment total;
  - planned-outflow total;
  - total income;
  - total outflows;
  - monthly change;
  - ending balance;
  - ordered derived activity rows.

Activity rows use signed integer cents: income is positive and outflow is
negative. Every row includes a stable key, source type, source identifier when
available, label, period, pending status, and optional effective date.
Credit-card payment rows may include nested charge details.

## Architecture

Keep the feature within the existing finance pipeline:

1. `loadFinanceState` loads forecast settings and adjustments with the existing
   account, bill, card, statement, payment, and preference records.
2. Finance state and reducer events represent settings and adjustment
   create/update/delete results.
3. A focused pure forecast module derives the current-month runway, 13 months,
   and activities.
4. The finance selector/view-model layer exposes the derived report to the
   Forecast page.
5. Server actions use Zod and the existing `{ ok, message, data }` result
   contract.
6. Query functions enforce user ownership and perform settings upsert and
   adjustment CRUD inside the existing transaction boundaries.

The calculation module must stay independent of React and database access. It
accepts normalized finance records plus an explicit current date and returns
deterministic output. Existing recurring-bill and credit-card cycle helpers
remain the source of truth for occurrence and statement timing.

## Period and Timezone Rules

- Determine today and the current calendar period in the user's configured
  timezone.
- Start the report with the current local calendar month.
- Do not reuse the budget module's first-day reset grace period. Forecast month
  rollover occurs at local midnight on the first day of the month.
- Use `YYYY-MM` as the storage and comparison format for adjustment periods.
- Use existing due-date clipping behavior for short months, leap years, and card
  cycles.

## Projection Algorithm

### 1. Resolve the Primary Account

Use the app's existing primary payment-account rule. Its current balance is the
only actual cash balance included in this forecast.

If no primary payment account exists, return a blocking setup state rather than
calculating from zero.

### 2. Build the Current-Month Runway

Use today's primary-account balance as the current-month opening. Do not
reconstruct month-open cash or count posted cash activity again.

```text
opening balance = today's actual balance
ending balance =
  today's actual balance
  + remaining default income
  + pending current additional income
  - remaining direct recurring bills
  - remaining credit-card statement payments
  - pending current planned outflows
  - opted-in budget projections
```

Remaining obligations include overdue or remaining direct-bank recurring-bill
occurrences and overdue or remaining credit-card statement obligations due on
or before the end of the current local month.

The current month must:

- exclude paid or skipped bill occurrences;
- exclude archived bills from future occurrence generation;
- exclude card payments already reflected in the actual account balance;
- include an overdue unpaid obligation even when its due date is before today;
- avoid adding card-assigned bills separately from their statement obligation;
- include remaining default income;
- include current one-time additional income and planned outflows;
- include monthly planned outflows active in the current period; and
- keep custom items pending until explicitly edited or deleted.

Paid bills and statements do not appear as pending rows. Existing bill-payment
and statement-payment records remain authoritative for excluding their
generated pending obligations. Posted cash activity stays on Overview and
Transactions.

### 3. Calculate Each Future Month

For each of the next 12 periods in ascending order:

```text
total income =
  default monthly income
  + one-time additional income for the period

total outflows =
  direct recurring bills due in the period
  + credit-card payments due in the period
  + one-time planned outflows for the period
  + monthly planned outflows active in the period

monthly change = total income - total outflows
ending balance = opening balance + monthly change
next opening balance = ending balance
```

The default income applies exactly once to every future forecast month and never
to the current month. Editing it recomputes all 12 future periods but never
creates an income transaction.

### 4. Resolve Recurring Bills

- Direct-bank bills reduce cash in their bill due-date month.
- Card-assigned bills do not reduce cash in the bill charge month. Map each
  occurrence into its statement cycle and reduce cash in that statement's
  payment-due month.
- Respect monthly and yearly schedules, finite payment counts, first due dates,
  archived state, and paid/skipped history.
- Generate only the occurrences needed for the current-month reconciliation and
  13-month display horizon.

### 5. Resolve Credit-Card Payments

Use existing unpaid-statement and virtual-statement semantics:

- Existing unpaid statement balances contribute in their payment-due period.
- Pending recurring-bill lines are included exactly once.
- Card-assigned future bill occurrences may create projected virtual statement
  obligations when no persisted statement exists.
- Paid statements and zero-balance statements contribute nothing.
- Existing card transactions contribute only through a known statement balance.
- Unknown future purchases are not inferred.

When itemized statement charges do not account for the full statement total,
the expandable activity row includes an `Other Statement Balance` remainder so
the child details reconcile to the parent amount.

## Recalculation and Rollover

Recompute the entire report after:

- default income changes;
- an adjustment is created, edited, or deleted;
- the primary account balance changes;
- a recurring bill is created, edited, archived, paid, or skipped;
- a credit-card statement or card payment changes; or
- the user's local calendar month rolls over.

Past one-time adjustments may remain stored but do not contribute. Current
one-time adjustments remain pending and do contribute. A monthly planned
outflow remains active for every displayed period on or after its start period.
Editing it changes all currently derived occurrences; deleting it removes all
derived occurrences.

## User Experience

### Navigation and Page Header

- Add `Forecast` to primary navigation.
- Use `Cash Forecast` as the page title.
- Show one visible primary action: `Add Forecast Item`.
- Place `Edit Monthly Income` in the page header's secondary ellipsis menu.
- Follow the existing `PageHeading`, card, form, and action-menu patterns.

### First-Visit Income Setup

When no settings row exists:

1. Open the monthly-income setup dialog automatically.
2. Require a labeled currency amount greater than or equal to zero.
3. Keep the report unavailable until the value is saved.
4. If the dialog is dismissed, show an inline setup state with a
   `Set Monthly Income` action and open the dialog again on a later visit.

The dialog follows TanStack Form, Zod, inline validation, focus management, and
server-action feedback standards from `DESIGN.md`.

### Forecast Item Dialog

The primary action opens one dialog with an item-type choice:

- **Additional Income:** name, amount, and month.
- **Planned Outflow:** name, amount, start month, and `Repeat Every Month`
  checkbox.

The repeat checkbox includes helper text explaining that the amount continues
in each rolling forecast month until edited or deleted. The month selector is
limited to the displayed current month plus 12 future months in the first
version.

User-created activity rows expose Edit and Delete in their item ellipsis menu.
Generated bill and card rows are read-only and identify their source.

### Summary and Chart

The summary card contains:

- `Current-Month Ending Balance · <Month Year>` for the current month or
  `Projected Ending Balance · <Month Year>` for future months;
- the selected or previewed ending balance in large tabular numerals;
- today's primary-account balance;
- pending current-month income and outflows; and
- a short indication of whether the value is selected or being previewed.

Use a Recharts composed chart through the shared chart primitives:

- `chart-1` for income bars;
- `chart-4` for outflow bars;
- `chart-3` for the ending-balance line and normal points; and
- the destructive token for a negative point and negative ending-balance text.

The chart follows these interaction rules:

- Pin the current month initially.
- Hovering a month temporarily updates only the large ending-balance label and
  value.
- Pointer exit restores the pinned month's value.
- Clicking or tapping pins the target month and updates the activity list.
- Keyboard focus previews a month; Enter or Space pins it.
- Left and right arrow keys move chart focus between months.
- Non-active months use reduced opacity while preserving readable labels.
- Negative values include text or an icon in addition to color.
- On mobile, place the 13-month plot in a horizontal scroll region and use
  tap-to-pin behavior.
- Honor reduced-motion preferences and avoid decorative animation.

### Monthly Activity

Below the chart, show:

- the pinned month label;
- total income, total outflows, and monthly change;
- a responsive activity list; and
- pagination with 10 parent rows per page.

The current month lists posted cash movements as `Actual` rows and still-pending
items as `Pending` rows. Posted rows do not change current-month totals.
Future activity behavior remains projected and otherwise unchanged.

For the current month, order actual cash transactions by effective date first,
then additional-income adjustments in creation order, dated pending outflows by
effective date, and undated planned outflows in creation order. For future
months, retain the existing order: default income, additional income, dated
outflows, then planned outflows.

Credit-card payments render as one expandable parent row. Their nested charges
do not count against pagination. Changing the pinned month or deleting the last
row on a page resets pagination to the nearest valid page.

Desktop uses the app's dense table pattern. Mobile uses list rows with bold
names and amounts, muted source metadata, and right-aligned money.

## Loading, Empty, and Error States

- A missing primary account blocks the report with a clear setup message.
- A valid zero-income forecast still renders.
- A month with no activity remains selectable and displays zero totals. Current
  empty copy names both actual cash activity and pending items.
- A negative balance is a valid forecast result, not an application error.
- Mixed-currency source data blocks calculation with an explicit unsupported
  currency message. Do not omit records or combine values without conversion.
- Expected save/delete errors render inline and leave the prior forecast intact.
- Unexpected render failures use the existing route error boundary.
- Loading copy names the operation, such as `Loading forecast...` or
  `Saving forecast item...`.

## Accessibility

- The chart cannot rely on hover alone; every month target is keyboard and touch
  accessible.
- Month targets expose the month, income, outflows, monthly change, and ending
  balance to assistive technology.
- Focus indicators use the existing ring token.
- Positive and negative states include labels, signs, or icons in addition to
  color.
- Expanded statement rows use an accessible disclosure control and announce
  state.
- Dialogs have visible labels, described validation messages, and predictable
  initial focus.
- Currency values use shared formatting helpers and tabular numerals where
  alignment matters.

## Tests

### Pure Calculation Tests

- Current opening balance equals today's primary-account balance.
- The current month adds remaining default income when greater than zero.
- Current-month totals ignore posted cash activity already in today's balance.
- Current custom additional income, one-time planned outflows, and active
  monthly planned outflows remain pending and affect current ending balance.
- Current ending balance carries positively or negatively into the next month.
- Settled recurring bills and paid statements do not appear as pending
  obligations.
- Unpaid current obligations contribute exactly once.
- Monthly surplus and deficit carry forward across all later months.
- Negative balances remain valid and continue carrying forward.
- Direct bills use bill due periods.
- Card-assigned bills use statement payment-due periods.
- Existing and virtual statement obligations aggregate without duplicate
  pending bill lines.
- Paid, skipped, archived, and zero-balance sources are excluded.
- Monthly and yearly bills, finite schedules, short months, and leap years are
  handled.
- One-time additional income and planned outflows affect only their selected
  future periods.
- Monthly additional income and planned outflows begin at `start_period` and
  continue through rolling horizons.
- Current-period custom adjustments are included as pending.
- Mixed currencies and missing primary accounts return blocking states.
- Thirteen ordered months are returned across year boundaries.

### Persistence and Action Tests

- Settings upsert permits zero and rejects negative income.
- Adjustment validation enforces positive amounts and non-empty names.
- Both adjustment kinds can be saved with one-time or monthly recurrence.
- User ownership is enforced for every settings and adjustment operation.
- Successful actions update finance state and recompute the view model.
- Failed actions preserve the previous state and return actionable messages.

### Interaction Tests

- Missing settings automatically open onboarding and block the report.
- Saving or editing income refreshes every forecast month.
- Hover/focus previews the large balance without changing activity.
- Pointer exit/blur restores the pinned month.
- Click, tap, Enter, and Space pin a month and update activity.
- Inactive-month opacity, negative labels, and focus states remain accessible.
- Pagination resets safely when the selected month or row count changes.
- Credit-card parent rows expand and reconcile their details to the parent total.
- Mobile chart scrolling and tap selection work without hover.
- Chart controls expose all 13 months and initialize on the current month.
- Forecast item forms include the current period.

## Implementation Boundaries

Expected areas of change:

- Database migration for forecast settings and adjustments.
- Finance record, state, reducer-event, and view-model types.
- Finance load queries plus settings and adjustment mutations.
- Server actions and Zod schemas.
- A pure cash-forecast calculation module with focused tests.
- Forecast page and product components.
- Navigation data.
- `DESIGN.md` only if implementation introduces a reusable chart interaction
  standard not already covered by its current chart and accessibility rules.

Do not refactor unrelated budget, transaction, recurring-bill, or credit-card
flows. Reuse their public records and schedule helpers while preserving their
existing behavior.
