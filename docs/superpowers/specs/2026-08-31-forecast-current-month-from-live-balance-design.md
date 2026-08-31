# Forecast Current Month From Live Balance — Design

**Date:** 2026-08-31  
**Status:** Approved  
**Amends:** [Cash Forecast — Design](./2026-07-11-cash-forecast-design.md),
[Forecast Current-Month Income — Design](./2026-07-20-forecast-current-month-income-design.md)

## Summary

Revise the current Cash Forecast month so it starts from today's live primary
account balance and applies only still-pending income and obligations. Posted
cash activity, including pot Main Account movements, is already in that balance
and must not be counted again.

## Goals

- Use today's primary-account balance as the only current-month opening.
- Count remaining default income, additional income, unpaid bills, unpaid card
  statements due on or before month end, planned outflows, and opted-in budget
  projections.
- Keep overdue unpaid statements and bills in the current month.
- Carry the new current-month ending into September and later months.

## Non-Goals

- Changing statement payment-due mapping or pulling later-due statements into
  the current month.
- Changing Direct Adjustment or pot-to-pot behavior.

## Algorithm

```text
current opening = todayPrimaryBalanceCents
salaryReceivedCents =
  sum of current-month salary-category cash receipts
  excluding owner-contact pot movements
remainingDefaultIncomeCents =
  max(0, default_monthly_income_cents − salaryReceivedCents)

current income =
  remainingDefaultIncomeCents
  + pending additional income

current outflows =
  unpaid direct bills due on or before month end
  + unpaid card statements due on or before month end
  + pending planned outflows
  + opted-in budget projections

ending = current opening + current income − current outflows
next opening = ending
```

Current-month activity lists posted cash movements as `Actual` rows. Display
`totalIncomeCents`, `totalOutflowsCents`, and `monthlyChangeCents` include
those listed rows so they match the table. The ending balance still uses
today's live balance plus pending income minus pending outflows.

## Worked example

Today's balance: $12,476.24. Overdue statements: $19,000. No further expected
income.

```text
ending ≈ 12,476.24 − 19,000 ≈ −6,524
```

A pot Add Money already reduced today's balance, so it does not raise the
ending. It can still appear as an Actual activity row.

## Amendments to Prior Forecast Design

- ~~Reconstruct current-month opening from month-to-date cash movement~~ →
  current-month opening is today's primary-account balance.
- ~~Combine actual cash transactions with pending items in current totals and
  activity~~ → listed Actual rows appear in display totals; ending balance
  still uses today's live balance plus pending only.
- ~~Exclude pot movements from totals while using them to reconstruct
  opening~~ → pot movements stay in today's live balance and do not change
  ending; they may still appear as Actual activity.
- Remaining default income still reduces by salary received this month and
  still counts as pending current-month income.
