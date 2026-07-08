# Recurring Bills Implementation Plan

## Goal

Implement the approved recurring bills design from
`docs/superpowers/specs/2026-07-08-recurring-bills-design.md`.

The module should support create, edit, pay, skip, and archive flows for
recurring bills; settle card-assigned bills automatically when their credit
card statement is paid; and feed the overview summary card with real derived
data. Pending state is derived from dates at read time. Real rows are written
only when money moves.

## Constraints

- No cron jobs and no ensure-on-load writes. Occurrences are derived, and only
  settled occurrences get database rows.
- Settled history is immutable: frozen amounts in `recurring_bill_payments`,
  real transactions, no retroactive rewrites on bill edit or archive.
- Every paid occurrence produces exactly one expense-side transaction. Expenses
  count once. Current Balance moves only on `bank_account` payments and card
  statement payments.
- `frequency` and `first_due_date` are locked once any payment row exists.
  `total_payments` cannot drop below the settled count.
- Bills with settled occurrences archive; only payment-free bills hard-delete.
- Reuse existing patterns: `runFinanceAction` result contract, Zod-validated
  server actions, reducer dispatch on success, no optimistic updates.
- Follow `DESIGN.md` for dialogs, labels, inline errors, and finance
  formatting. Update `DESIGN.md` before building new UI.

## Phase 1: Migration and Seed Reshape

Create `db/migrations/009_recurring_bills_lifecycle.sql`.

`recurring_bills` changes:

- Loosen `frequency` check to `('monthly', 'yearly')`.
- Add `first_due_date date NOT NULL` (backfill existing rows from
  `due_day_of_month` in the current month before dropping the old column).
- Drop `due_day_of_month` and `status`.
- Add `total_payments integer NULL` with `CHECK (total_payments > 0)`.
- Add `credit_card_id uuid NULL` with FK `(user_id, credit_card_id)` →
  `credit_cards`.
- Add `category_id uuid NOT NULL` with FK `(user_id, category_id)` →
  `categories` (backfill existing rows to the user's Bills category).
- Add `archived_at timestamptz NULL`.

New `recurring_bill_payments` table:

- Composite PK `(user_id, id)`, `id uuid DEFAULT gen_random_uuid()`.
- `recurring_bill_id uuid NOT NULL`, FK delete-restricted.
- `due_date date NOT NULL`; unique `(user_id, recurring_bill_id, due_date)`.
- `amount_cents integer` with `CHECK (amount_cents > 0)`.
- `status text` with `CHECK (status IN ('paid', 'skipped'))`.
- `transaction_id uuid NULL`, unique, FK → `transactions`; CHECK that it is
  non-null iff `status = 'paid'`.
- `paid_at date NOT NULL`.
- RLS enabled + forced with the `app.current_user_id()` policy and
  `touch_updated_at` trigger, matching migration 008 conventions.

Reshape demo data:

- `data/recurring-bills.json`: new fields, realistic mix (indefinite monthly
  subscription, 12-payment financing assigned to a seeded card, yearly bill,
  overdue non-card bill).
- `lib/finance/seed.ts` and `scripts/db/seed.ts`: emit the new shape and seed
  an empty `recurringBillPayments` collection.

## Phase 2: Schedule Module

Create `lib/finance/recurring-bill-schedule.ts` as a pure-function module
mirroring `credit-card-cycle.ts`.

Responsibilities:

- Generate occurrence due dates from `first_due_date`, stepping 1 month or
  1 year with month-end clamping (anchor day 31 → Feb 28).
- Stop at the earliest of `total_payments` occurrences, `archived_at`, or a
  short horizon past today that always includes the next upcoming occurrence.
- Number occurrences sequentially for "payment N of M" display.
- Resolve occurrence status: settled from a payments lookup keyed by due date
  (`paid` / `skipped`, frozen amount), otherwise derive
  `upcoming | due-soon | due-today | overdue` reusing the credit card
  due-status logic and due-soon window.
- Statement attachment helper: given a card's cycle configuration and its
  statements, attach an unsettled occurrence to the earliest unpaid cycle
  whose period ends on or after the occurrence due date, rolling forward past
  paid periods, computed even when no statement row exists yet.

Add `lib/finance/recurring-bill-schedule.test.ts` using Bun's built-in test
runner (`bun test`) covering: monthly and yearly stepping, month-end clamping,
`total_payments` cutoff, `archived_at` cutoff, missed-occurrence accumulation,
settled lookup, and statement attachment roll-forward.

## Phase 3: Domain Types

Update `lib/finance/types.ts` and `lib/types.ts`.

- Reshape `RecurringBillRecord` to the new columns; add
  `RecurringBillPaymentRecord`.
- Add `recurringBillPayments` to `FinanceState`.
- UI types: extend `RecurringBill` with derived fields (status, next due date,
  progress, card assignment, category); add an occurrence view type; add
  `count` to `RecurringBillSummary` for parity with `CreditCardSummary`.

## Phase 4: Query Helpers

Update `lib/finance/queries.ts`.

- Load `recurring_bill_payments` in `loadFinanceState()`; update
  `recurringBillColumns` to the new shape.
- `insertRecurringBill(userId, input)` / `updateRecurringBill(userId, id,
input)`:
  - Update guards: reject `frequency` / `first_due_date` changes and
    `total_payments` below the settled count when payment rows exist.
- `archiveRecurringBill(userId, id)`: set `archived_at`.
- `deleteRecurringBill(userId, id)`: reject when payment rows exist.
- `payRecurringBillOccurrence(userId, billId, dueDate, source)`:
  - Lock the bill, reject archived bills, duplicate settlements (unique
    occurrence), and due dates not on the bill's schedule.
  - `source = bank account`: insert a `bank_account` expense transaction
    (bill category, bill counterparty, `posted_at` = payment date) and apply
    balance + expense-summary effects via the existing account-effect path.
  - `source = credit card`: insert a `credit_card` purchase transaction on the
    chosen card's open statement via `ensureOpenCreditCardStatement()` and
    apply the standard purchase effects.
  - Insert the `recurring_bill_payments` row (`paid`, frozen amount,
    transaction link).
- `skipRecurringBillOccurrence(userId, billId, dueDate)`: same occurrence
  validation; insert a `skipped` payment row with no transaction.
- Extend `payCreditCardStatement()`:
  - Before paying, find unsettled occurrences of bills assigned to the card
    that attach to this statement.
  - For each: insert a `credit_card` transaction (`posted_at` = occurrence due
    date, bill category and counterparty, linked to card and statement), apply
    expense-summary and statement-amount effects, and insert the payment row.
  - Pay the combined total as one cashflow transaction.
- Extend `closeZeroBalanceCreditCardStatement()`: reject when pending bill
  occurrences attach to the statement.
- Keep `deleteCounterparty()` blocked while referenced by bills (existing).

## Phase 5: Server Actions

Update `lib/finance/actions.ts` with Zod-validated actions:

- `createRecurringBillAction`, `updateRecurringBillAction`,
  `archiveRecurringBillAction`, `deleteRecurringBillAction`.
- `payRecurringBillOccurrenceAction(billId, dueDate, source)` where source is
  a bank account or a credit card id.
- `skipRecurringBillOccurrenceAction(billId, dueDate)`.
- All return the `runFinanceAction` `{ ok, message }` contract with the
  records needed for reducer dispatch (bill, payment row, transaction,
  accounts, account summaries, statements as applicable).

## Phase 6: Reducer and Provider Wiring

Update `lib/finance/reducer.ts` and
`components/providers/finance-provider.tsx`.

- Replace local-only `recurring-bill/add|update|delete` with server-backed
  payloads; add `recurring-bill/archive`, `recurring-bill/settle` (payment row
  - transaction + account/summary/statement side effects), mirroring the
    `credit-card/payment` action shape.
- Extend the credit card payment reducer payload with settled bill payment
  rows and materialized transactions.
- Provider: convert `addRecurringBill` / `updateRecurringBill` /
  `deleteRecurringBill` to async server-action wrappers; add
  `archiveRecurringBill`, `payRecurringBillOccurrence`,
  `skipRecurringBillOccurrence`.

## Phase 7: Selectors

Update `lib/finance/selectors.ts`.

- `selectRecurringBills()`: build from schedule module; include occurrence
  lists, current status, next due date, progress, card badge data, archived
  flag.
- `selectRecurringBillsSummary()`: Paid / Upcoming / Due Soon (due-soon
  includes due-today and overdue, matching the credit card summary grouping)
  with counts and amounts from the current cycle's occurrences.
- `totalBillsAmount`: sum of active (non-archived) bills' amounts (unchanged
  semantics).
- Credit card view models: attach pending occurrences to statements; displayed
  statement balance = `statement_amount_cents` + pending occurrences; expose
  pending lines for the detail page history;
  `totalCreditCardStatementBalance` and pay-dialog amounts include pending
  occurrences.

## Phase 8: DESIGN.md

Add a Recurring Bills section to `DESIGN.md` before building UI: bill dialog
fields and locked-field treatment, pay dialog source choice, skip/archive
confirmations, occurrence status labels, progress copy ("Payment 5 of 12"),
pending-line treatment on the credit card detail page, and overview card rows.

## Phase 9: UI

`components/recurring-bills/`:

- `bill-dialog.tsx` (create/edit): TanStack Form + Zod via the standard form
  utilities. Counterparty contact-picker pattern from `transaction-dialog`;
  category picker defaulting to Bills; frequency Monthly/Yearly; first due
  date; optional number of payments; optional credit card picker using
  `CreditCardBadge`. Locked fields disabled with a hint once payments exist.
- `pay-bill-dialog.tsx`: occurrence amount and due date; payment source choice
  (bank account or credit card); inline status on failure.
- Skip and archive actions behind `AlertDialog` confirmations.
- `bill-table-row.tsx`: switch to shared `ContactAvatar` with initials
  fallback; show derived status, next due date, "N of M" progress, and a card
  indicator when assigned.
- `bills-content.tsx` / `bills-summary-card.tsx`: wire new derived data, add
  create/edit/pay/skip/archive entry points, archived bills treatment.

Overview:

- `components/overview/recurring-bills/recurring-bills-card.tsx` and
  `bill-row.tsx`: keep structure, feed new summary with counts + amounts.

Credit cards:

- `credit-card-detail-content.tsx`: render pending bill occurrences as
  visually distinct pending lines (muted, "Pending" label) in statement
  history; statement balances shown include pending occurrences.
- `pay-credit-card-statement-dialog.tsx`: show combined total (purchases +
  pending bills).
- `close-credit-card-statement-dialog.tsx`: surface the server rejection when
  pending bills exist.

## Phase 10: Verification

Run checks:

- `bun test` (schedule module).
- `bun run lint`.
- `bun run format`.
- `bun run db:migrate` against the dev database, then `bun run db:seed`.

Manual verification checklist:

- Create an indefinite monthly bill without a card; confirm it appears on the
  bills page and overview card as upcoming, then due-soon/overdue as dates
  dictate.
- Pay a due occurrence from the bank account; confirm balance drops, Expenses
  rise once, a transaction appears, and the occurrence shows paid while the
  next cycle shows upcoming.
- Pay a due occurrence with a credit card; confirm the charge lands on the
  card's open statement and the occurrence settles immediately.
- Create a 12-payment financing assigned to a card; confirm pending lines
  appear in the card history and the statement balance includes them; pay the
  statement and confirm one cashflow transaction covers purchases + bills,
  occurrences settle, progress advances, and Expenses count the bills in
  their due months.
- Attempt zero-close on a statement with pending bills; confirm rejection.
- Skip an occurrence; confirm no transaction and progress advances.
- Edit amount and switch cards; confirm settled occurrences are untouched and
  future occurrences move. Confirm frequency/first-due-date are locked after
  settlement.
- Archive a bill with history; confirm no new occurrences and history intact.
  Delete a payment-free bill; confirm it disappears.

## Implementation Order

1. Migration 009 and seed reshape.
2. Schedule module and its tests.
3. Domain and UI types.
4. Query helpers, including the `payCreditCardStatement` extension.
5. Server actions.
6. Reducer and provider wiring.
7. Selectors.
8. DESIGN.md update.
9. UI components.
10. Checks, migrate + seed, manual verification.
