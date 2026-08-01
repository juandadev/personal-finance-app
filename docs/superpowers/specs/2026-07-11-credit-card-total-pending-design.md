# Credit-Card Total Pending Balance — Design

**Date:** 2026-07-11  
**Status:** Awaiting spec review

## Summary

Credit-card overview surfaces currently select the active billing cycle as the
card's current statement. When an older statement remains unpaid and a new
cycle begins, the UI shows only the new cycle's amount. This understates the
debt, utilization, and amount of credit still available.

Introduce a derived card-level `Total Pending` summary that aggregates every
unpaid statement and its pending card-assigned recurring bills. Preserve the
active statement for cycle-specific context. The card-level status reflects the
most urgent unpaid statement until that statement is paid.

## Goals

- Show the complete unpaid credit-card balance on overview, card-list, and
  card-detail surfaces.
- Include pending recurring-bill amounts attached to unpaid statement cycles.
- Calculate utilization and available credit from the complete pending balance.
- Preserve the active statement as the source of cycle-specific information.
- Show the most urgent unpaid statement status at card level.
- Make the card-level payment action target the oldest payable statement and
  clearly explain that choice.

## Non-Goals

- Change statement persistence, payment records, or recurring-bill attachment.
- Add partial payment support.
- Merge individual statements in statement history.
- Change a statement-level payment action in the card detail history.
- Add a database migration or persist a card-level aggregate balance.

## Derived Card Summary

Add a card-level derived summary built from the existing statement view models:

| Value                    | Rule                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalPending`           | Sum the total amount of every unpaid statement, including its pending recurring-bill lines.                                                                                |
| `oldestPayableStatement` | The unpaid statement with a positive total amount and earliest payment due date. Use the billing period as a deterministic tie-breaker.                                    |
| `hasOverdueStatement`    | True when an unpaid statement's payment due date is before today.                                                                                                          |
| `displayStatus`          | The highest-priority unpaid statement status: `Overdue`, `Due Today`, `Due Soon`, then `Upcoming`. Use the active statement's status only when no unpaid statement exists. |

The existing current-statement selection remains responsible for choosing the
active cycle and for exposing its period and normal due status. It must not be
replaced with the oldest unpaid statement.

### Example

For Nu Crédito on July 11:

- The July 15 statement has `$19,046.19` unpaid.
- The August 15 active statement has `$1,374.87`, including `$1,374.87` in
  pending recurring bills.

The card-level summary shows `Total Pending` of `$20,421.06` and `Due Soon`
because the July 15 statement is more urgent than the active August statement.
If the July 15 statement remains unpaid after that date, the card-level status
becomes `Overdue` while `Total Pending` remains `$20,421.06`. When that
statement is paid, only the August statement's outstanding total remains in
`Total Pending`.

## UI Rules

### Overview, Card List, and Card Detail

- Replace card-level `Current Statement` labels with `Total Pending`.
- Use `Total Pending` for the dashboard credit-card overview, Credit Cards page
  totals and tiles, and the card-detail metric.
- Recalculate utilization and available credit from `Total Pending`.
- Display the most urgent unpaid statement's status beside the card-level
  balance. Use destructive text only for `Overdue`.
- Keep individual statement history unchanged: each statement retains its own
  period, amount, due date, status, and payment action.

### Card-Level Payment Action

The card-level `Pay` action uses `oldestPayableStatement`.

The payment dialog must:

- State that the user is paying the oldest payable statement.
- Render the selected billing period in semibold text for quick recognition.
- Keep the existing amount, account selection, confirmation, and inline-error
  behavior.
- Include a secondary `View Card Details` action that routes to that card's
  detail page, where the user can choose a different statement.

Paid or zero-balance statements are never payment targets. When no payable
statement exists, retain the existing paid or empty card presentation and do not
offer the card-level payment action.

## Data Flow and Safeguards

1. Continue building individual statements and pending bill lines with existing
   selector logic.
2. Derive the card summary from all unpaid statements rather than from only the
   selected active statement.
3. Feed `totalPending`, `displayStatus`, and `oldestPayableStatement` to the
   overview, card-list, utilization, available-credit, and card-level payment
   surfaces.
4. Keep detail history backed by individual statement records and virtual
   statement cycles.

No database changes are needed. A successful payment removes its paid statement
from the derived summary through the existing client-state update. If payment
fails, the dialog keeps its selected statement and uses the existing inline
error treatment. Missing or empty unpaid statements must not make selector
rendering fail.

## Tests

Extend selector and component coverage to verify:

- Multiple unpaid statements aggregate into `Total Pending`.
- Pending card-assigned recurring bills are included exactly once.
- The active statement remains selected for cycle-specific information while a
  different unpaid statement has a more urgent due status.
- The card-level status prioritizes `Overdue`, `Due Today`, `Due Soon`, then
  `Upcoming` across every unpaid statement.
- Paying the oldest statement removes it from `Total Pending` and leaves the
  active statement total.
- The oldest positive unpaid statement is the card-level payment target.
- Utilization and available-credit calculations use `Total Pending`.
- Overview, card-list, and detail metrics use the new `Total Pending` label and
  value.
- The payment dialog explains the oldest-statement selection, emphasizes the
  period, and links to card details.

## Implementation Boundaries

Keep this work within the existing finance boundaries:

- Derived models and calculations: `lib/finance/selectors.ts` and related
  credit-card types.
- Utilization and available-credit consumers: existing credit-card selectors
  and components.
- Card-list, overview, detail, and payment dialog presentation:
  `components/overview/credit-cards` and `components/credit-cards`.
- Existing statement payment persistence and actions remain unchanged unless a
  consumer needs the new payment-target selection.
