# Finite Recurring Bill Credit Reservation Implementation Plan

## Goal

Implement the approved finite recurring bill credit reservation design from
`docs/superpowers/specs/2026-07-08-finite-recurring-bill-credit-reservation-design.md`.

Finite card-assigned recurring bills should reserve their unpaid installment
total against available credit immediately. The reservation should decrease as
installments are paid or skipped, without adding persisted remaining-credit
fields or new bill form controls.

## Constraints

- No database migration is required.
- Do not store remaining or available credit. Keep it derived in selectors.
- Do not add a "reserve total amount" field or toggle to the recurring bill
  form.
- Only finite bills assigned to a credit card reserve future installments.
- Indefinite card-assigned bills keep the existing due-date-based pending line
  behavior.
- Avoid double-counting due finite occurrences that already affect an unpaid
  statement as pending bill lines.
- Follow `DESIGN.md` for finance values, helper text, card metrics, and
  responsive spacing.

## Phase 1: Domain Type Extension

Update `lib/types.ts`.

Responsibilities:

- Add a `reservedInstallmentAmount: number` field to `CreditCard`.
- Keep `availableCredit` as the final usable credit value after subtracting
  statements and reservations.
- Do not expose cents to UI types; keep the public view model in dollars, like
  `creditLimit`, `currentStatementAmount`, and `availableCredit`.

Expected behavior:

- Existing components can keep reading `availableCredit`.
- Credit card components can opt into showing reservation context from
  `reservedInstallmentAmount`.

## Phase 2: Reservation Selector Helper

Update `lib/finance/selectors.ts`.

Add a pure helper near the existing credit-card pending bill helpers.

Suggested shape:

```ts
function selectReservedInstallmentCentsByCard(
  recurringBills: RecurringBillRecord[],
  paymentsByBillId: Map<string, RecurringBillPaymentRecord[]>,
  pendingCyclesByCardId: Map<string, Map<string, PendingCycleGroup>>,
  today: string,
): Map<string, number>
```

Responsibilities:

- Iterate recurring bills and let `resolveRecurringBillOccurrences` apply the
  archive cutoff.
- Skip bills without `credit_card_id`.
- Skip bills whose `total_payments` is `null`.
- Resolve occurrences through `resolveRecurringBillOccurrences`.
- Sum unsettled occurrence amounts for the bill.
- Exclude occurrences already represented by pending bill lines for that card.
- Return reserved cents grouped by card id.

Implementation notes:

- Build a set of pending bill occurrence keys from `pendingCyclesByCardId`, for
  example `${billId}:${dueDate}`.
- Exclude occurrences with `status` equal to `paid` or `skipped`.
- Exclude pending-line occurrences regardless of whether their status is
  `due-soon`, `due-today`, or `overdue`, because statement totals already
  include them.
- Use cents internally to avoid rounding drift, then convert once when creating
  the `CreditCard` view model.

Expected behavior:

- A newly created finite card bill immediately reserves the full installment
  total.
- Settled rows reduce the reservation automatically because the schedule helper
  resolves them as paid or skipped.
- Future installments are not materialized as statements.

## Phase 3: Credit Card Derivation

Continue in `lib/finance/selectors.ts`.

Responsibilities:

- Compute `reservedInstallmentCentsByCard` after `pendingCyclesByCardId`.
- Pass the reservation map into `selectCreditCards`.
- In `selectCreditCards`, derive:
  - `reservedInstallmentAmount = centsToDollars(reservedCents)`
  - `availableCredit = creditLimit - currentStatementAmount - reservedInstallmentAmount`
- Keep `currentStatementAmount` unchanged. It remains the selected statement's
  total amount, including due pending bill lines.
- Keep `totalCreditCardStatementBalance` unchanged unless it currently reads
  `availableCredit`; it should continue representing statement debt, not
  reserved future installments.

Expected behavior:

- Credit card summaries that show statement debt are not inflated by future
  installments.
- Available credit can become negative and should not be clamped.

## Phase 4: Credit Card UI Context

Update:

- `components/credit-cards/credit-cards-page-content.tsx`
- `components/credit-cards/credit-card-detail-content.tsx`

Responsibilities:

- Keep existing `Available Credit` metric placement.
- When `reservedInstallmentAmount > 0`, show concise helper context:
  `Includes {amount} reserved for installments`.
- On the detail page, show `Reserved Installments` as a separate metric when the
  amount is greater than zero.
- Keep `Current Statement` copy and statement history focused on statement debt
  and due pending bill lines.
- Do not add new recurring bill controls or edit the bill dialog.

Recommended layout:

- On credit-card list cards, place the helper line immediately below the metric
  grid.
- On detail, use a four-metric grid only when reservation exists; otherwise keep
  the current three-metric layout.
- Use `formatCurrency(..., { forceDecimals: true })`.
- Use muted helper text and no new color tokens.

Expected behavior:

- Users can see why available credit is lower than the current statement alone
  would imply.
- Future installments stay out of statement history until their due date.

## Phase 5: Focused Tests

Add tests around the pure selector behavior.

Create `lib/finance/selectors.test.ts` for this work. Prefer testing through
`selectFinanceViewModel` or the highest existing public selector entry point. If
that setup becomes too broad, export the reserved-installment helper and test it
directly with small records.

Cover these cases:

- A finite card-assigned bill reserves all unpaid installments immediately.
- Paying one occurrence reduces the reservation by one installment.
- Skipping one occurrence reduces the reservation by one installment.
- An indefinite card-assigned bill does not reserve future credit.
- A finite bill without a credit card does not reserve card credit.
- A due finite occurrence already present as a pending statement line is not
  double-counted in reserved installments.
- Archived finite bills stop reserving occurrences after the archive cutoff.
- Available credit can become negative.

Test data guidance:

- Use cents in finance records.
- Use a fixed `today` value.
- Keep fixtures small: one card, one bill, and only the statements/payments
  needed for each scenario.

## Phase 6: Verification

Run automated checks:

- `bun run format`
- `bun test`
- `bun run lint`

Manual verification checklist:

- Create or identify a finite recurring bill assigned to a credit card.
- Confirm the credit card's available credit drops by the full unpaid
  installment total immediately.
- Pay one installment and confirm available credit recovers by one installment,
  while current statement behavior remains correct.
- Skip one installment and confirm available credit recovers by one installment.
- Confirm an indefinite card-assigned bill does not reserve future credit.
- Open the credit card detail page and confirm `Reserved Installments` appears
  only when the amount is greater than zero.
- Confirm future installments do not appear in statement history before their
  due date.

## Implementation Order

1. Extend the `CreditCard` view model type.
2. Add the reserved-installment selector helper.
3. Wire the helper into credit-card derivation and available credit.
4. Update credit-card list/detail UI context.
5. Add focused tests.
6. Run formatting, tests, and linting.
7. Manually verify the installment-credit scenario.
