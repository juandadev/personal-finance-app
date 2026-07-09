# Finite Recurring Bill Credit Reservation Design

## Purpose

Make available credit reflect finite credit-card recurring bills, matching the
installment-purchase model common in Mexico. When a recurring bill is assigned
to a credit card and has an explicit number of payments, the app should reserve
the unpaid installment total against the card's available credit immediately.
As installments are paid or skipped, the reserved balance decreases.

This should happen automatically from the existing bill schedule fields. The
bill creation flow should not add a "reserve total amount" field or toggle.

## Current Behavior

Credit cards store `credit_limit_cents`, but they do not store remaining or
available credit. Available credit is derived in the finance selector layer as
credit limit minus the selected current statement amount.

Recurring bills already have enough data to identify finite installment plans:

- `credit_card_id` identifies card-assigned bills.
- `total_payments` identifies finite bills. `null` means the bill continues
  until archived.
- `recurring_bill_payments` stores settled occurrences as `paid` or `skipped`.
- `resolveRecurringBillOccurrences` derives schedule occurrences from the bill
  definition and payment records.

Card-assigned recurring bills currently affect statements only when an
unsettled occurrence has reached its due date. Future finite installments do
not reduce available credit before they are due.

## Desired Behavior

Available credit should be derived as:

```text
credit limit - current unpaid statement balance - reserved finite installment balance
```

The reserved finite installment balance is the sum of unpaid and unskipped
future installments for active recurring bills that are both:

- assigned to the credit card, and
- finite (`total_payments` is not `null`).

Indefinite recurring bills keep the existing behavior. They do not reserve
future credit, because there is no explicit total purchase amount.

## Reservation Rules

The calculation should be conservative and avoid double-counting.

- Only finite bills with a `credit_card_id` reserve installments.
- Paid occurrences do not count in the reservation.
- Skipped occurrences do not count in the reservation.
- Future finite occurrences count in the reservation immediately.
- Due or overdue finite occurrences count once: if they are already attached to
  an unpaid statement as pending bill lines, they count through statement debt
  and not through the reserved future-installment balance.
- Future finite occurrences stay out of statement history until their due date
  is reached.
- If a finite bill amount is edited before any payments exist, the reservation
  updates from the new amount.
- Existing schedule-lock rules continue to protect settled history once a bill
  has payment rows.
- Archived bills follow the existing archive cutoff behavior. Occurrences no
  longer generated after the cutoff are not reserved.
- Available credit can go negative when statement debt plus reserved
  installments exceed the credit limit. The UI should show that value instead
  of clamping it to zero.

## UI Behavior

Credit card screens should keep `Available Credit` as a primary metric, but the
value should become real usable credit after installment reservations.

On credit card list cards and the credit card detail header:

- `Current Statement` remains statement debt only, including existing pending
  bill lines that have reached their due date.
- `Available Credit` subtracts both statement debt and reserved finite
  installments.
- When a card has reserved finite installments, show supporting context such as
  `Includes $12,000.00 reserved for installments`.

On the credit card detail page:

- Show `Reserved Installments` as a separate metric when the amount is greater
  than zero.
- The metric should stay secondary to `Current Statement`, `Available Credit`,
  and `Credit Limit`.
- Statement history should not show future installments before their due date.

Recurring bill rows do not need a new control. Finite bills can continue to use
the existing `Payment N of M` progress label.

## Implementation Shape

This change belongs in the derived finance model, not in persisted credit
balances or bill form state.

Recommended implementation:

1. Add a pure selector helper that computes reserved finite installment cents by
   card from `recurringBills`, `recurringBillPayments`, existing pending bill
   cycle data, and `today`.
2. Reuse `resolveRecurringBillOccurrences` so month-end clamping, total payment
   limits, skipped rows, paid rows, and archive cutoffs stay consistent.
3. Exclude occurrences that are already represented by pending bill lines in an
   unpaid statement, so due finite occurrences are not counted twice.
4. Extend the `CreditCard` view model with a field such as
   `reservedInstallmentAmount`.
5. Update `availableCredit` to subtract `currentStatementAmount` plus
   `reservedInstallmentAmount`.
6. Update credit card UI components to show the reservation context only when
   the amount is greater than zero.

No migration is needed because the app can derive the reservation from existing
records.

## Testing

Add focused tests around the selector or pure helper:

- A finite card-assigned bill reserves all unpaid future installments
  immediately.
- Paying one occurrence reduces the reservation by one installment.
- Skipping one occurrence reduces the reservation by one installment.
- An indefinite card-assigned bill does not reserve future credit.
- A finite bill without a credit card does not reserve card credit.
- A due finite occurrence attached to an unpaid statement does not double-count
  in both current statement balance and reserved installments.
- Archived finite bills stop reserving occurrences after the archive cutoff.
- Available credit is allowed to become negative.

Manual verification should cover the credit cards list, credit card detail
page, recurring bill progress labels, and paying a statement that includes a
finite recurring bill occurrence.
