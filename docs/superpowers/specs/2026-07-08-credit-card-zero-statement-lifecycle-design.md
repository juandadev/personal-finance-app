# Credit Card Zero Statement Lifecycle Design

## Summary

Fix a credit-card statement lifecycle gap where an older unpaid statement with a
zero balance can appear as the card's current statement, causing the card tile
and overview summary to show `Overdue` and `$0` even when the active cycle has a
real balance.

The fix should keep legitimate backdated purchase entry for unpaid statements,
block mutations into paid statements, and add an explicit way to close zero-dollar
statements so stale cycles do not block the current card view.

## Problem

Credit-card statements are created from the purchase date's billing cycle. The
current selector then chooses the card's displayed statement by prioritizing
unpaid overdue statements. This creates a bad state when a past-cycle statement
is open, overdue, and has `statement_amount_cents = 0`.

In the observed data, Joy Banamex has:

- An active statement for `2026-06-21` to `2026-07-20` with a non-zero balance.
- An older statement for `2026-05-21` to `2026-06-20`, due `2026-06-30`, with a
  zero balance and `lifecycle_status = open`.

Because the old zero statement is overdue, the card tile chooses it as the
displayed current statement. The UI then shows `Overdue` and `$0`, and Overview
also aggregates `$0`.

The Pay Statement action is hidden for zero-balance statements, so the user has
no action to clear or lock that old cycle.

## Goals

- Keep card tiles and Overview focused on the active current statement balance.
- Keep older overdue unpaid statements visible as obligations or cleanup items.
- Allow users to add or edit credit-card purchases into past cycles only while
  those statements are unpaid and unlocked.
- Block direct transaction mutations into paid or locked statements.
- Let users explicitly close unpaid zero-balance statements.
- Avoid creating cashflow transactions or payment records for zero-dollar
  statement closure.

## Non-Goals

- Do not create a full adjustment workflow for paid statements.
- Do not support partial card payments.
- Do not automatically create real payments for zero-dollar closures.
- Do not hide statement history.

## Statement Display Rules

The card's displayed current statement should represent the active cycle for the
card, not whichever unpaid statement is most urgent.

Recommended selector behavior:

1. Prefer an unpaid statement whose period contains today's date.
2. If none exists, prefer the newest unpaid statement by `period_end`.
3. If all statements are paid, show the newest paid statement as history.

Older unpaid overdue statements should not replace the active statement on the
card tile. They should still be exposed in the detail page statement list so the
user knows cleanup or payment is needed.

Overview statement balance should sum the displayed current statement balances,
not stale zero-dollar overdue statements.

## Statement Closure Rules

Add a `Close Statement` action for unpaid statements with a zero balance.

The action should:

- Require `statement_amount_cents = 0`.
- Require `lifecycle_status <> 'paid'`.
- Mark the statement as paid or locked by setting `lifecycle_status = 'paid'`
  and `paid_at = now()`.
- Create no `credit_card_payments` record.
- Create no `transactions` row.
- Return the updated statement so client state can refresh immediately.

This treats a zero-dollar closure as reconciliation rather than money movement.
The statement becomes locked, so future direct mutations into that cycle are
blocked.

## Transaction Date Rules

Backdated credit-card transactions are allowed only if the matching statement is
unpaid and unlocked.

Allowed:

- A purchase dated in the current active cycle.
- A purchase dated in a past cycle whose statement is still unpaid.
- Editing a transaction date from one unpaid statement to another unpaid
  statement.

Blocked:

- Creating a purchase in a paid statement period.
- Editing a transaction so it enters a paid statement period.
- Editing or deleting a purchase that currently belongs to a paid statement.

The server should remain the source of truth. Client validation can guide the
user, but server mutations must enforce the locked-statement rules.

Recommended error copy:

> This purchase belongs to a paid card statement. Create an adjustment in the
> current statement instead.

## UI Rules

`Pay Statement` remains for unpaid statements with balances greater than zero.

`Close Statement` appears for unpaid zero-balance statements in the card detail
statement list. It also appears on the card tile when the displayed statement is
an unpaid zero statement.

The detail page should make statement state explicit:

- Paid statements show the lock indicator.
- Unpaid zero-balance statements show `Close Statement`.
- Unpaid non-zero statements show `Pay Statement`.
- Older unpaid overdue statements remain visible in the statement list even when
  the tile displays the active cycle.

Use the existing `AlertDialog` pattern. The close confirmation should explain
that closing a zero statement locks the cycle and records no payment.

## Data Repair

Existing zero-balance overdue statements can be repaired through the same
`Close Statement` action once implemented.

For the observed Joy Banamex state, closing the older `2026-05-21` to
`2026-06-20` zero statement should remove the stale overdue blocker while leaving
the active `2026-06-21` to `2026-07-20` statement and its transactions intact.

No manual transaction edits are required for the active statement if its
transactions already point to the correct statement.

## Testing Plan

Automated tests should cover:

- Current statement selection prefers today's cycle over an older overdue zero
  statement.
- Overview balance sums the active current statement balance.
- A zero-balance unpaid statement can be closed without creating a payment or
  cashflow transaction.
- A positive-balance unpaid statement cannot be closed with the zero-close
  action.
- A paid statement blocks create, edit, and delete effects for credit-card
  purchases.
- A backdated purchase into an unpaid past statement is allowed.

Manual verification should cover:

- Reproduce the old zero overdue state and confirm the card tile still shows the
  active statement balance.
- Close the zero overdue statement from the UI.
- Confirm the old statement becomes locked and no payment appears in payment
  history.
- Confirm a purchase can still be entered for an unpaid past cycle.
- Confirm a purchase cannot be entered for a closed zero statement.

## Implementation Notes

The implementation should stay within existing finance boundaries:

- Server mutations in `lib/finance/queries.ts` and `lib/finance/actions.ts`.
- Client state updates in `lib/finance/reducer.ts`.
- Display derivation in `lib/finance/selectors.ts`.
- UI actions in `components/credit-cards`.

No schema change is required for the first fix because a zero-dollar closed
statement can reuse `lifecycle_status = 'paid'` with `paid_at` as the lock
timestamp.
