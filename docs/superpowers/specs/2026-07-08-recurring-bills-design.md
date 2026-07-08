# Recurring Bills Module — Design

**Date:** 2026-07-08
**Status:** Approved for planning

## Summary

Turn the read-only recurring bills scaffolding into a working module: create, edit, pay, skip, and archive recurring bills; integrate card-assigned bills into the credit card statement lifecycle; and feed the overview summary card with real derived data. No cron or background jobs — pending state is derived from dates at read time, and real rows are only written when money actually moves.

## Goals

- Full CRUD for recurring bills, persisted through server actions (the current provider-only, non-persisted mutations are replaced).
- Bills optionally charge to a credit card; those occurrences settle automatically when the card statement is paid.
- Bills without a card are settled manually, choosing bank account or credit card at pay time.
- Monthly and yearly frequencies; indefinite duration or a fixed number of payments (financing).
- Missed occurrences accumulate as overdue; occurrences can be explicitly skipped.
- Overview page summary card shows real Paid / Upcoming / Due Soon data, matching the credit cards card.
- Correct money math: bills count toward Expenses exactly once, and Current Balance only moves when cash actually leaves.

## Non-Goals

- Budgets integration (deferred until a concrete use case exists).
- Weekly or custom-interval frequencies (monthly + yearly only in v1).
- Automatic posting of non-card bills (nothing moves money without user action).
- Partial payments of an occurrence.
- Bulk "pay all" action (occurrences are paid one at a time in v1).

## Core model: derive pending, record outcomes

Occurrences are **not** materialized in the database. A bill stores its definition; a pure schedule module computes which due dates the bill has hit as of today. Only settled occurrences (paid or skipped) get a database row, in `recurring_bill_payments`, with the amount frozen at settlement time and a link to the real transaction.

Consequences:

- No cron and no ensure-on-load writes; the app evaluates dates at read time.
- Paid history is immutable: editing or deleting a bill never rewrites past statements, transactions, or amounts.
- Edits automatically apply only to unsettled (future/overdue) occurrences.
- A bill can simultaneously show July as `overdue` and August as `upcoming`.

## Schema (migration 009)

### `recurring_bills` (modified)

Kept: `user_id`, `id`, `counterparty_id` (name/avatar source), `amount_cents` (> 0), `currency`.

| Change                         | Detail                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `frequency`                    | Check loosened to `'monthly' \| 'yearly'`                                                                   |
| `first_due_date date NOT NULL` | Replaces `due_day_of_month`. Anchors the schedule: day-of-month for monthly, month+day for yearly.          |
| `total_payments integer NULL`  | `> 0`. Null = until canceled. Derived end date for display only.                                            |
| `credit_card_id uuid NULL`     | FK `(user_id, credit_card_id)` → `credit_cards`. Set = auto-charges to that card.                           |
| `category_id uuid NOT NULL`    | FK `(user_id, category_id)` → `categories`. Stamped on every generated transaction. Form defaults to Bills. |
| `archived_at timestamptz NULL` | Cancel = archive. No occurrences generated past this date.                                                  |
| `status`                       | **Dropped** — status is derived per occurrence.                                                             |

### `recurring_bill_payments` (new)

One row per settled occurrence.

| Column                            | Detail                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `user_id`, `id`                   | Composite PK, matching repo convention                                         |
| `recurring_bill_id uuid NOT NULL` | FK → `recurring_bills`, delete restricted                                      |
| `due_date date NOT NULL`          | Identifies the occurrence. Unique `(user_id, recurring_bill_id, due_date)`     |
| `amount_cents integer`            | `> 0`, frozen at settlement                                                    |
| `status text`                     | `'paid' \| 'skipped'`                                                          |
| `transaction_id uuid NULL`        | Unique. FK → `transactions`. Required iff `status = 'paid'`, null when skipped |
| `paid_at date NOT NULL`           | Settlement date (payment date, or the day the skip was recorded)               |

Both tables: RLS enabled + forced with the standard `app.current_user_id()` policy, `touch_updated_at` triggers.

Migration also reshapes existing seed rows (`data/recurring-bills.json`, `lib/finance/seed.ts`, `scripts/db/seed.ts`) to the new columns.

## Schedule derivation

New pure module `lib/finance/recurring-bill-schedule.ts`, mirroring `credit-card-cycle.ts`:

- **Generation:** start at `first_due_date`, step 1 month or 1 year with month-end clamping (anchor on the 31st → Feb 28), reusing the clamping approach from credit card cycles. Stop at the earliest of: `total_payments` occurrences, `archived_at`, or a short horizon past today (always includes the next upcoming occurrence).
- **Identity:** an occurrence is identified by its (clamped) due date and numbered sequentially ("payment 5 of 12").
- **Status:** settled occurrences resolve from `recurring_bill_payments` (`paid` / `skipped`, frozen amount). Unsettled ones derive `upcoming | due-soon | due-today | overdue` using the same due-status logic and due-soon window as credit cards.

Selectors (`lib/finance/selectors.ts`) build on this:

- Bills page: each bill with its occurrence list, current status, next due date, progress.
- Overview summary: Paid / Upcoming / Due Soon rows with counts and amounts (`RecurringBillSummary` gains `count` for parity with `CreditCardSummary`).
- `totalBillsAmount`: sum of all active (non-archived) bills' `amount_cents`, as today.
- Credit card integration: unsettled occurrences of card-assigned bills attach to the earliest **unpaid** statement cycle whose period ends on or after the occurrence's due date (so a due date landing inside an already-paid statement's period rolls forward to the next cycle). The displayed statement balance is `statement_amount_cents` + pending occurrences, and they appear in the card's history as pending lines (derived, no DB row). Attachment is computed from the card's cycle days even when no statement row exists yet for that cycle.

## Payment flows

All mutations are server actions in `lib/finance/actions.ts` (Zod-validated) calling helpers in `lib/finance/queries.ts`, returning the `runFinanceAction` `{ ok, message }` contract, dispatching reducer actions on success. No optimistic updates.

### 1. Card-assigned bill — settled by paying the card

`payCreditCardStatement()` is extended. Before paying, the server:

1. Finds all unsettled occurrences of bills with `credit_card_id` = this card that attach to this statement (per the attachment rule in "Schedule derivation": earliest unpaid cycle whose period ends on or after the due date).
2. For each, inserts a real transaction: `payment_method = 'credit_card'`, linked to card and statement, `posted_at` = occurrence due date, the bill's `category_id`, the bill's counterparty, negative `amount_cents`.
3. Applies the standard card-purchase effects: `account_summaries.expense_cents` for the posted month, statement amount incremented.
4. Pays the combined total (original purchases + materialized bills) as one cashflow transaction.
5. Inserts one `recurring_bill_payments` row per occurrence (`status = 'paid'`, frozen amount, transaction link).

`closeZeroBalanceCreditCardStatement()` is additionally rejected when the statement has pending bill occurrences, since the displayed balance would not be zero.

### 2. Non-card bill — paid from a bank account

Pay dialog on the occurrence. Creates a standard `bank_account` expense transaction (reduces `accounts.current_balance_cents`, counts toward `account_summaries.expense_cents`) and inserts the payment row.

### 3. Non-card bill — charged to a card at pay time

Same dialog, user picks a credit card instead. Creates an ordinary `credit_card` purchase transaction on that card's open statement (via `ensureOpenCreditCardStatement`). The occurrence is settled as `paid` immediately; the remaining debt is card debt and follows the normal statement lifecycle.

### 4. Skip

Explicit action with `AlertDialog` confirmation. Inserts a payment row with `status = 'skipped'`, no transaction, no money movement. Counts toward `total_payments` progress.

### Money-math invariants

- Every paid occurrence produces exactly one expense-side transaction; Expenses count it once (at posting for bank payments, at materialization for card paths).
- Current Balance moves only on `bank_account` payments and card statement payments, never when an occurrence is merely due.
- Statement payment cashflow equals purchases + materialized bill occurrences for that statement.

## Editing, archiving, deleting

- **Freely editable:** `amount_cents`, `category_id`, `counterparty_id`, `credit_card_id` (including setting/clearing). Settled occurrences are frozen rows, so edits only affect unsettled occurrences. Switching cards moves future occurrences to the new card; paid ones stay put.
- **Locked once any payment row exists** (server-enforced, mirrors credit card cycle-day guard): `frequency` and `first_due_date` — changing them would reshuffle the due dates that identify settled occurrences. Reschedule = archive + create new.
- **Guarded:** `total_payments` cannot be set below the number of settled occurrences.
- **Archive (cancel):** sets `archived_at`; no occurrences generated past it; history intact; archived UI treatment like archived credit cards. Required path for any bill with settled occurrences.
- **Delete:** only when the bill has zero payment rows. Counterparty deletion remains blocked while referenced.

## UI

Follows `DESIGN.md` patterns throughout (TanStack Form + Zod, `AlertDialog` for destructive/confirm, `formatCurrency`, token colors). `DESIGN.md` gains a Recurring Bills section before implementation.

- **Bill dialog (create/edit):** counterparty via the transaction-dialog contact-picker pattern; category picker (default Bills); frequency Monthly/Yearly; first due date; optional number of payments; optional credit card picker using `CreditCardBadge`. Locked fields render disabled with a hint once payments exist.
- **Pay dialog:** per occurrence — amount, due date, payment source: bank account or a credit card.
- **Skip / Archive:** `AlertDialog` confirmations.
- **Bills table:** switch avatars from raw `next/image` to shared `ContactAvatar` (initials fallback); derived status; next due date; "5 of 12" progress for finite bills; card indicator when card-assigned.
- **Overview:** existing `RecurringBillsCard` keeps its structure, fed by the new derived summary (counts + amounts), matching the credit cards card.
- **Credit card detail:** pending bill occurrences render as visually distinct pending lines (muted, "Pending" label) in statement history; statement balance shown everywhere includes them; after payment they become ordinary transactions.
- **Provider:** `addRecurringBill` / `updateRecurringBill` / `deleteRecurringBill` switch from local-only dispatch to async server-action wrappers; new pay/skip/archive actions added.

## Testing

Financial correctness tests mirroring the credit cards suite:

- Schedule derivation: monthly/yearly stepping, month-end clamping, `total_payments` cutoff, `archived_at` cutoff, accumulation of missed occurrences.
- Statement integration: pending occurrences attach to the right statement period; pay-statement materializes transactions, pays combined total, settles occurrences; zero-close rejected with pending bills.
- Pay flows: bank payment affects balance + expenses; card-at-pay-time affects statement only; skip moves progress without money.
- Edit guards: frequency/first-due-date lock, `total_payments` floor, delete vs archive rules.
