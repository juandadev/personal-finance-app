# One-Time Scheduled Credit-Card Charge Design

## Purpose

Allow a user to record a known, one-time future charge for a credit card. The
charge must reserve the card's credit immediately, then join the applicable
statement as a pending amount on its charge date. Paying that statement creates
the normal credit-card transaction.

This supports a planned purchase or fixed installment without treating a future
commitment as money that has already moved.

## Decisions

- One-time scheduled card charges extend the existing recurring-bills domain.
  They are not future-dated transactions and do not need a new finance module
  or a new scheduled-charges table.
- A new `one_time` schedule variant represents exactly one occurrence. Its
  charge date is its first due date and its total payment count is exactly one.
- The charge must target a credit card. It stores the ordinary expense details:
  payee or contact, category, amount, charge date, and optional note.
- Creating or editing a schedule creates no transaction and does not update a
  persisted statement balance.
- The credit-card and forecast modules remain consumers of the derived
  occurrence. Transactions remain the record of settled activity.
- No cron or background materialization is required. A charge becomes a
  statement pending line when its charge date is reached during normal state
  loading and calculation.

## Lifecycle and Financial Effects

### Before the charge date

The schedule resolver returns the single unresolved occurrence. It is included
in the card's reserved-installments calculation immediately, so:

```text
available credit = credit limit - total pending statement amount - reserved installments
```

The occurrence remains outside statement history and the statement's pending
line list before its charge date. This matches the established behavior for
future finite recurring-bill installments and prevents future activity from
appearing as current statement debt.

The card detail page provides a separate scheduled-charge management list so
the user can see, edit, or delete unsettled commitments. This list is not
statement history.

### On or after the charge date

The existing statement-cycle resolver maps the occurrence to the target card's
matching billing cycle. Credit-card obligations include it as a derived
pending line. The line appears in the card's upcoming statement or payment
presentation according to the existing due-status rules.

The reservation selector must exclude an occurrence already represented by that
pending line. The amount therefore counts once: first as a future reservation,
then as unpaid statement debt.

### When the statement is paid

The existing statement-payment flow materializes the pending line as exactly
one standard negative `credit_card` transaction, attaches it to the paid
statement, and persists the recurring-bill payment row with its transaction
reference. That settled occurrence no longer contributes to either pending
debt or reserved installments.

### Editing, deleting, and cancellation

Before settlement, editing a one-time schedule recalculates its occurrence,
statement-cycle mapping, and reservation. Deleting it removes all of those
derived effects. After settlement, the schedule is no longer editable; the
normal transaction and statement history remain authoritative.

## Module Boundaries

### Recurring Bills

Recurring Bills owns the persisted schedule definition, schedule validation,
one-time occurrence resolution, and settled-occurrence history.

A migration extends the frequency constraint and finance type with `one_time`.
The one-time variant requires a target `credit_card_id`, exactly one total
payment, and a future first due date when created. Existing monthly and yearly
bills retain their present behavior.

### Credit Cards

Credit-card obligations own the read-time mapping of a due occurrence into a
statement cycle and its derived pending statement line. Credit-card selectors
own total pending amount, available credit, and reserved-installments
presentation. They must reuse the common schedule resolver and preserve the
existing double-count protection.

### Transactions

Transactions do not store a future schedule. They are created only by the
existing statement-settlement path, after the scheduled charge is due and the
user manually pays the statement.

### Cash Forecast

The cash forecast continues to represent a card purchase as cash leaving the
bank at the statement payment due date. It must consume the derived card
obligation and must not add a separate cash outflow on the charge date.

## User Experience

The credit-card detail page is the entry point and management surface.

- `Add Scheduled Charge` is a secondary card action. If the card header already
  has a primary action such as `Pay Statement`, this action belongs in the
  header overflow menu in accordance with the app's one-primary-action rule.
- The dialog uses the existing finance form primitives and captures payee or
  contact, category, amount, future charge date, and optional note. The target
  card is preselected and locked.
- A `Scheduled Charges` list on the card detail page shows unresolved schedules,
  their charge dates, amounts, status, and Edit/Delete actions.
- On its charge date, the schedule also appears in the matching statement's
  pending or upcoming payment presentation. It leaves the management list only
  after settlement.
- Existing `Reserved Installments` and `Available Credit` presentation includes
  the amount from save time. The UI may show negative available credit rather
  than clamping it.

## Validation and Failure Handling

- Creation rejects an archived or otherwise unavailable target card.
- Creation rejects a charge date on or before the user's profile-local current
  date. A same-day purchase must use the ordinary transaction flow.
- The amount, payee or contact, and category follow the existing expense form
  validation rules.
- Scheduling is allowed when it makes available credit negative, matching the
  existing derived-balance behavior. The resulting warning remains visible
  rather than silently blocking the user from recording a known commitment.
- Server actions return the established `{ ok, message }` result shape so the
  dialog can show recoverable validation and persistence errors inline.
- Repeated reads are idempotent: they cannot create transactions, duplicate
  statement lines, or reserve an occurrence twice.

## Testing

Add focused coverage for:

1. One-time occurrence generation produces one unresolved occurrence on its
   configured date and none after it is settled or deleted.
2. A future one-time card charge immediately reserves its full value and
   reduces available credit.
3. A future charge is absent from statement pending lines until its charge date.
4. A due charge maps to the correct statement cycle and appears as one pending
   line.
5. A due charge is not counted both as reserved installments and as unpaid
   statement debt.
6. Editing or deleting an unresolved charge updates the reservation and derived
   statement presentation.
7. Paying the statement materializes one, and only one, normal card
   transaction and settles the scheduled occurrence.
8. The cash forecast reflects the card's statement payment due date without
   introducing a charge-date cash outflow.
9. Existing finite and indefinite recurring card bills preserve their current
   reservation and statement behavior.

Manual verification covers the card detail form, scheduled-charge list,
available-credit and reservation metrics, the due-date transition, and a
statement payment containing the scheduled charge.
