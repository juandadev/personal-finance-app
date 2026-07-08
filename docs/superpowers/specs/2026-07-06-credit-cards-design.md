# Credit Cards Design

## Summary

Add a dedicated Credit Cards module for tracking credit-card purchases,
statement balances, payment due dates, and manual card-payment reconciliation.

The feature models the user's real cash-flow pattern: purchases made with a
credit card are real expenses immediately, so they affect budgets and monthly
expense reporting on the purchase date. They do not reduce the bank-account
current balance until the user manually pays the card statement.

## Goals

- Let users manually register credit cards with safe, non-sensitive identifying
  details.
- Track card purchases as expenses without immediately reducing bank-account
  balance.
- Calculate statement balances from each card's monthly billing cycle.
- Highlight upcoming, due soon, due today, overdue, and paid statements.
- Let users manually mark a statement as paid with a confirmation step.
- Record card payments as cash movements that reduce bank balance without
  double-counting expenses or budget spending.
- Preserve paid statement history as locked snapshots.
- Keep the first implementation compatible with future multiple bank accounts,
  while using the primary account in the first UI.

## Non-Goals

- Do not store full card numbers, CVV/CVC/CID, PINs, magstripe/chip data, online
  banking credentials, or payment-provider credentials.
- Do not process real card payments.
- Do not import transactions from banks or card issuers.
- Do not support automatic statement payment.
- Do not support direct editing of paid statement totals.
- Do not ship a full multi-account transfer UI in this iteration.
- Do not support custom image uploads for card avatars in the first version.
- Do not create late-posting adjustment flows in v1; block direct mutations into
  locked statements and leave explicit adjustment creation for a later version.

## Current State

The finance model stores signed transactions. Positive amounts are income and
negative amounts are expenses. Transaction mutations currently update
`accounts.current_balance_cents` and `account_summaries` at write time.

The recent voucher-expense work added a useful precedent: some transactions can
count toward budgets without affecting account balance. Credit-card purchases
need a richer version of that idea because they also belong to card statements
and later trigger a cash movement when the statement is paid.

Budget spending is already assignment-based through
`budget_transaction_assignments`. Credit-card purchases should keep using that
model so budgets answer "what did I spend?" regardless of payment method.

## PCI And Sensitive Data Posture

The app should avoid becoming a card-data storage or payment-processing system.
For this feature, store only low-risk card metadata needed for recognition and
planning:

- nickname.
- issuer name, such as BBVA, Nu, Amex, or Citi.
- network, such as Visa, Mastercard, or American Express.
- last four digits.
- expiration month and year.
- credit limit.
- billing cycle closing day.
- payment due day.
- theme color.
- archived state.

The UI and server validation should reject fields that look like full PANs or
CVV values. The product copy should make clear that users should not enter full
card numbers, security codes, PINs, or banking credentials.

Last four digits and expiration date alone are far lower risk than full PAN
storage. If the product later needs real payments, tokenization and payment data
collection should be delegated to a PCI-compliant provider instead of extending
this module into sensitive card storage.

## Data Model

### Credit Cards

Add a user-owned `credit_cards` table.

Recommended fields:

- `user_id`
- `id`
- `nickname`
- `issuer`
- `network`
- `last_four`
- `expiration_month`
- `expiration_year`
- `credit_limit_cents`
- `closing_day_of_month`
- `payment_due_day_of_month`
- `theme_color`
- `archived_at`
- `created_at`
- `updated_at`

Rules:

- `nickname` should be required and unique per user after trimming.
- `last_four` must be exactly four digits.
- expiration month must be `1` through `12`.
- expiration year must be a reasonable current or future year.
- credit limit must be positive.
- closing and due days must be `1` through `31`.
- dates for shorter months should clamp to the last day of that month.
- archived cards remain visible in history but are hidden from default pickers.

### Credit Card Statements

Add a user-owned `credit_card_statements` table.

Recommended fields:

- `user_id`
- `id`
- `credit_card_id`
- `period_start`
- `period_end`
- `payment_due_date`
- `statement_amount_cents`
- `lifecycle_status`
- `paid_at`
- `created_at`
- `updated_at`

Statement lifecycle statuses:

- `open`: current unpaid statement receiving eligible purchases.
- `closed`: no longer receiving purchases, not yet paid.
- `paid`: statement has been manually reconciled.

The display due status shown in UI should be derived from a shared selector so
Overview and Credit Cards never disagree:

- `upcoming`: unpaid statement due more than seven days from today.
- `due_soon`: unpaid statement due within seven days.
- `due_today`: unpaid statement due today.
- `overdue`: unpaid statement whose due date is in the past.
- `paid`: paid statement.

Persisting only the lifecycle avoids stale due labels in the database. Due soon
and overdue labels should be derived from `payment_due_date`, `paid_at`,
`lifecycle_status`, and the current date.

Paid statements are locked snapshots. Once paid, their amount and transaction
membership should not be silently recalculated.

### Credit Card Payments

Add a user-owned `credit_card_payments` table.

Recommended fields:

- `user_id`
- `id`
- `credit_card_id`
- `statement_id`
- `source_account_id`
- `cashflow_transaction_id`
- `amount_cents`
- `paid_at`
- `created_at`

Rules:

- payment amount must be positive.
- payment amount should default to the statement amount.
- v1 should pay the statement in full.
- `source_account_id` should exist for future multiple-account support.
- the first UI may default to the primary/current account and not expose a full
  account picker.
- each paid statement should have one payment record in v1.

### Transactions

Extend transactions so payment method is explicit instead of adding more
independent booleans.

Recommended fields:

- `payment_method`: `bank_account`, `credit_card`, `voucher`,
  `credit_card_payment`.
- `credit_card_id`: nullable reference to `credit_cards`.
- `credit_card_statement_id`: nullable reference to `credit_card_statements`.

Rules:

- normal bank transactions use `payment_method = bank_account`.
- voucher expenses use `payment_method = voucher`.
- card purchases use `payment_method = credit_card` and must reference a card.
- card payment cash movements use `payment_method = credit_card_payment`.
- credit-card purchases must be expenses.
- credit-card payment transactions reduce bank balance but do not affect budgets
  or monthly expense totals.
- voucher and credit-card purchases can affect budgets, but neither immediately
  reduces bank balance.

The existing `is_voucher_expense` field can be migrated into the new
`payment_method` model or kept as a compatibility bridge during implementation.
The target design should avoid stacking unrelated booleans for mutually
exclusive payment behaviors.

## Billing Cycle Rules

Each card defines a fixed monthly closing day and fixed monthly payment due day.
If the configured day does not exist in a month, clamp to that month's last day.

For a purchase date, the matching statement is the statement whose
`period_start <= posted_at <= period_end`. The period end is the card's closing
date for that month. The period start is the day after the previous period end.

When a card purchase is created or edited, the mutation should find or create
the matching open statement for that card and date. If the matching statement is
paid, direct assignment is blocked in v1.

## Money Movement Rules

### Bank-Account Transactions

Normal bank transactions keep the current behavior:

- income increases bank balance and monthly income summary.
- expense decreases bank balance and monthly expense summary.
- assigned expenses reduce matching budget remaining.

### Voucher Expenses

Voucher expenses keep the existing behavior:

- they must be expenses.
- they appear in transaction history.
- they can affect budgets.
- they do not affect bank balance.
- they do not affect monthly income or expense summaries.

### Credit-Card Purchases

Credit-card purchases behave as delayed cash movements:

- they must be expenses.
- they appear in transaction history.
- they affect monthly expense reporting on the purchase date.
- they can be assigned to matching budgets on the purchase date.
- they increase the matching card statement amount.
- they do not affect bank-account current balance.

This means Overview `Expenses` should include credit-card purchases when they are
recorded, but Overview `Current Balance` should not change until the statement
payment is recorded.

### Statement Payments

When the user marks a statement as paid:

1. Show an `AlertDialog` confirmation.
2. Create a `credit_card_payments` record.
3. Create a special transaction with `payment_method = credit_card_payment`.
4. Reduce the source bank account balance by the payment amount.
5. Do not increase monthly expenses.
6. Do not affect budgets.
7. Mark the statement as paid and lock it.

The payment transaction should be visible in transaction history as a cash
movement, labeled clearly as a card payment.

## Transaction Edit Rules

Edits must reverse the old financial effects and apply the new effects
atomically inside the same database transaction.

### Bank Account To Credit Card

If a user edits a normal bank expense and assigns it to a credit card:

- reverse the original bank-account expense effect, increasing current balance
  back by the expense amount.
- keep monthly expense reporting unchanged because the purchase was already a
  real expense.
- keep compatible budget assignment unchanged.
- attach the transaction to the matching open card statement.
- increase that statement amount.

This edit is allowed only when the transaction date belongs to an unpaid/open
statement for the selected card.

If the transaction date belongs to a paid or locked statement period, block the
edit with clear copy:

> This purchase belongs to a paid card statement. Create an adjustment in the
> current statement instead.

Explicit adjustment creation is a future enhancement, not part of v1.

### Credit Card To Bank Account

If a user edits a credit-card purchase back to a bank-account expense:

- remove the transaction from its open card statement.
- reduce that statement amount.
- apply the bank-account expense effect, decreasing current balance.
- keep monthly expense reporting unchanged.
- keep compatible budget assignment unchanged.

This edit is blocked if the transaction belongs to a paid statement.

### Credit Card To Different Credit Card

If a user changes the selected card:

- remove the transaction from the old open statement.
- reduce the old open statement amount.
- attach the transaction to the new matching open statement.
- increase the new statement amount.
- keep bank balance unchanged.
- keep expenses and budgets unchanged.

The edit is allowed only if both the old statement and new target statement are
not paid or locked.

### Amount, Date, Category, Or Type Changes

For credit-card purchases:

- amount changes update the open statement amount by reversing the old amount and
  applying the new amount.
- date changes may move the transaction to another open statement for the same
  card.
- category changes should re-sync budget assignment using the existing matching
  budget rules.
- changing the transaction from expense to income must clear credit-card payment
  method and card references.

Any edit that would mutate a paid statement is blocked in v1.

## User Interface

### Navigation

Add a main navigation item:

- `Credit Cards`

The nav label should stay short and align with the existing app navigation
voice.

### Credit Cards Page

The module landing page should show summary cards first:

- total current statement balance.
- available credit.
- due soon or overdue amount.
- paid this cycle.

Below the summary, show card tiles. Each tile should include:

- generated card avatar or badge.
- nickname.
- issuer and network.
- masked identifier, such as `•••• 1234`.
- expiration month/year.
- current statement amount.
- available credit.
- closing date.
- payment due date.
- status label.
- actions for details, edit, archive, and pay statement when payable.

The avatar should be generated from nickname, issuer/network, and theme color.
Do not support image upload in v1.

### Card Detail Page

The detail page should show:

- current statement summary.
- statement timeline.
- current-cycle transactions.
- previous statements.
- payment history.

Paid statements should be visibly locked. Due soon and overdue states should be
clear and eye-catching, while still matching the app's calm finance design
language.

### Overview

Add a compact `Credit Cards` overview card similar to Recurring Bills.

Recommended summary rows:

- Paid.
- Upcoming.
- Due Soon / Overdue.

The card should link to the Credit Cards module.

### Transaction Dialog

For expense transactions, add a payment source choice:

- Bank Account.
- Credit Card.
- Voucher.

When Credit Card is selected, show a card picker with generated avatar/badge,
nickname, issuer/network, and last four digits. Helper copy should explain:

> Card purchases update budgets now and reduce your bank balance when the
> statement is paid.

Credit limit warnings should appear when the purchase would exceed available
credit, but saving should still be allowed.

### Payment Confirmation

Use `AlertDialog` for statement payment confirmation.

The confirmation should summarize:

- card nickname.
- statement period.
- due date.
- payment amount.
- payment date.
- source account.

The primary action should be explicit, such as `Pay Statement`.

## Validation And Error Handling

Server validation remains the authority.

Credit-card validation:

- reject full card numbers and CVV-like values.
- require last four digits to be exactly four digits.
- require valid expiration month and year.
- require positive credit limit.
- require closing and due days between `1` and `31`.
- require nickname and issuer fields to be trimmed and length-limited.

Transaction validation:

- credit-card purchases must be expenses.
- credit-card purchases must reference an active card.
- card-payment transactions must reference a statement payment.
- card-payment transactions must not be budget assignable.
- card-payment transactions must not increase account expense summaries.
- direct mutations to paid statements must be blocked.

Credit-limit validation:

- warn when a purchase would exceed available credit.
- allow saving despite the warning.
- show the warning in the transaction form and card detail UI.

Known failures should use user-actionable copy:

- card not found.
- card is archived.
- statement is already paid.
- transaction date belongs to a locked statement.
- payment was already recorded.
- source account is not ready.

## Selectors And Client State

`FinanceState` should include cards, statements, and payments. The
`FinanceViewModel` should expose:

- card list view models.
- card detail view models.
- statement status summaries.
- overview credit-card summary rows.
- transaction rows with payment-method labels.

Overview and Credit Cards should derive due status from the same helper to avoid
drift. Money values should continue using shared format helpers.

## Accessibility And Design Standards

The UI should follow `DESIGN.md`:

- use existing card, dialog, alert dialog, select, input, and table primitives.
- use token-based theme colors.
- avoid hard-coded card colors.
- preserve mobile-first layouts.
- include visible labels and helper text for all fields.
- make payment and archive actions keyboard reachable.
- use status text and icons, not color alone, for due and paid states.
- keep copy concise and action-specific.

## Testing Plan

Automated coverage should focus on financial correctness:

- creating a credit-card purchase increases monthly expenses and budget spending
  but does not change bank balance.
- creating a credit-card purchase increases the matching open statement amount.
- paying a statement reduces bank balance but does not increase expenses or
  budget spending.
- paid statements are locked.
- editing a bank expense into an open-statement card purchase reverses the bank
  effect and increases the card statement amount without changing expenses.
- editing a card purchase back to bank expense applies the bank effect and
  reduces the open statement amount.
- moving a purchase between cards updates both open statements correctly.
- edits into paid statement periods are blocked.
- due status derives correctly for upcoming, due soon, due today, overdue, and
  paid statements.
- month-end cycle clamping works for 29th, 30th, and 31st configurations.
- forbidden sensitive card fields cannot be saved.

Manual verification should cover:

- add, edit, archive, and view a credit card.
- add a credit-card purchase from the transaction dialog.
- confirm Overview expenses change while current balance does not.
- confirm the matching budget changes when assigned.
- confirm the card page shows the purchase in the current statement.
- pay the statement and confirm current balance decreases.
- confirm the payment appears in transaction history without budget impact.
- confirm Overview Credit Cards shows paid, upcoming, due soon, and overdue
  states correctly.
- confirm locked paid statements cannot be directly mutated by later edits.

## Implementation Notes

This feature should stay inside the existing finance boundaries:

- SQL migrations in `db/migrations`.
- server actions in `lib/finance/actions.ts`.
- database helpers in `lib/finance/queries.ts`.
- reducer updates in `lib/finance/reducer.ts`.
- selectors in `lib/finance/selectors.ts`.
- route pages under `app/(app)/credit-cards`.
- UI under `components/credit-cards` plus targeted transaction and overview
  components.

The migration from `is_voucher_expense` to a broader `payment_method` should be
planned carefully. Existing voucher behavior must keep working while the new
credit-card payment method is introduced.
