# Overview Month Summaries — Design

**Date:** 2026-07-22  
**Status:** Awaiting spec review

## Summary

The shared Credit Cards and Recurring Bills summary rows (overview + dedicated
pages) do not give a useful picture of the current month. Credit Cards “Paid”
sums remaining pending on fully paid cards, so it stays at `$0` after real
payments. Recurring Bills “Paid Bills” keys off due-date month instead of when
the payment happened.

Fix the shared selectors so Paid reflects cash paid this month, Credit Cards
and Recurring Bills Upcoming are unpaid obligations due next calendar month,
and Due Soon stays urgency-based.

## Goals

- Show accurate **current-month Paid** totals for credit-card payments and
  recurring-bill payments using `paid_at` / `paidAt`.
- Scope Credit Cards **Upcoming** to unpaid statements due in the next calendar
  month.
- Keep Credit Cards **Due Soon / Overdue** as a live urgency window (any month).
- Order Credit Cards summary rows Paid → Due Soon / Overdue → Upcoming.
- Scope Recurring Bills **Upcoming** to unsettled occurrences payable in the
  next calendar month (`statusDueDate ?? dueDate`).
- Keep Recurring Bills **Due Soon** as a live urgency window (any month).
- Order Recurring Bills summary rows Paid → Due Soon → Upcoming.
- Apply the same summary arrays everywhere they are already shared (overview,
  Credit Cards page, Recurring Bills page).
- Cover the new rules with selector unit tests.

## Non-Goals

- Broader UI layout changes beyond summary label/order updates.
- Changing card-level `totalPendingAmount`, utilization, or payment actions.
- Changing occurrence generation, statement cycles, or due-status windows.
- Database migrations or SQL-side month aggregation.
- Timezone preference changes for `today` (continue using the view model’s
  existing `today` / `todayIsoDate()`).

## Month Definition

`currentMonth = today.slice(0, 7)` where `today` is the ISO date already passed
into `selectFinanceViewModel` (default `todayIsoDate()`).

## Metric Rules

### Credit Cards (`creditCardSummary`)

Aggregate from active (non-archived) cards’ payments and statements. Switch from
card-level pending buckets to payment/statement aggregates.

Row order: **Paid → Due Soon / Overdue → Upcoming**.

| Label              | Amount                                                                                                       | Count                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| Paid               | Sum of payment `amount` where `paidAt` is in `currentMonth`                                                  | Number of those payments   |
| Due Soon / Overdue | Sum of unpaid statement `totalAmount` where `dueStatus` is `due-soon`, `due-today`, or `overdue` (any month) | Number of those statements |
| Upcoming           | Sum of unpaid statement `totalAmount` where `paymentDueDate` is in the **next** calendar month               | Number of those statements |

Notes:

- Paid is based on payment records; it does not use unpaid statement amounts.
- Upcoming is next-month unpaid obligations only (not the current month).
- A next-month statement that is also urgent can appear in both Due Soon /
  Overdue and Upcoming.

### Recurring Bills (`recurringBillsSummary`)

Row order: **Paid → Due Soon → Upcoming**.

| Label    | Rule                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Paid     | Active bills only. Count/sum occurrences with `status === "paid"` and `paidAt` in `currentMonth`. Skipped occurrences never count. |
| Due Soon | Unsettled occurrences with status `due-soon`, `due-today`, or `overdue` (any month).                                               |
| Upcoming | Unsettled occurrences whose payable date (`statusDueDate ?? dueDate`) is in the **next** calendar month.                           |

Notes:

- Upcoming is next-month unpaid obligations only (not the current month).
- A next-month occurrence that is also urgent can appear in both Due Soon and
  Upcoming.

## Implementation

### Files

- `lib/finance/selectors.ts` — update `selectCreditCardSummary` and
  `selectRecurringBillsSummary`; pass `today` into the credit-card summary.
- `lib/finance/selectors.test.ts` — add/update coverage for the rules above.

No UI file changes. Existing consumers keep reading `creditCardSummary` and
`recurringBillsSummary`.

### Credit Cards selector shape

```ts
function selectCreditCardSummary(
  creditCards: CreditCard[],
  today: string,
): FinanceViewModel["creditCardSummary"]
```

Suggested local helpers (same file, not exported unless tests need them):

- Filter payments by `paidAt.slice(0, 7) === currentMonth`.
- Collect unpaid statements from active cards.
- Split into urgent (any month) vs unpaid due next month.

### Recurring Bills selector change

- Paid uses `paidAt` month (not due-date month).
- Upcoming uses payable date month (`statusDueDate ?? dueDate`) equal to next
  month.
- Return order is Paid → Due Soon → Upcoming; labels drop the old
  “Paid Bills” / “Total Upcoming” wording.

## Testing

Add or update tests in `lib/finance/selectors.test.ts`:

1. After paying two statements this month, Paid amount equals the sum of those
   payment amounts (not `$0`).
2. An unpaid statement due next month contributes to Upcoming.
3. An unpaid urgent statement due next month contributes to Due Soon / Overdue
   and Upcoming.
4. An unpaid urgent statement due this month contributes to Due Soon / Overdue
   only (not Upcoming).
5. Credit Cards summary row order is Paid → Due Soon / Overdue → Upcoming.
6. A bill paid this month for a prior-month due date counts in Paid.
7. A bill with due date this month but `paidAt` in another month does not count
   in this month’s Paid.
8. An unsettled bill payable next month contributes to Upcoming.
9. An unsettled bill payable this month does not contribute to Upcoming.
10. Recurring Bills summary row order is Paid → Due Soon → Upcoming.

## Example

On 2026-07-22:

- Two credit-card payments this month: `$1,200` and `$800` → Paid `$2,000`
  (count 2).
- One unpaid statement due 2026-08-15, total `$350` → Upcoming `$350`.
- One unpaid statement due 2026-08-05, status `due-soon`, total `$500` →
  Due Soon / Overdue `$500` and Upcoming `$500`.
- Recurring bill due 2026-06-30, paid on 2026-07-03 for `$49` → Paid includes
  `$49`.
- Recurring bill payable 2026-08-10 for `$55` → Upcoming `$55`.

## Out of Scope Follow-Ups

- Aligning `today` with user timezone preferences.
- Showing payment counts on the overview cards (overview still shows amount
  only; dedicated pages keep showing count where they already do).
