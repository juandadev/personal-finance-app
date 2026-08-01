# Manual Transactions Design

## Overview

The Transactions module will support manual transaction recording as a real
finance workflow. Users can create, edit, and delete transactions, classify each
transaction with a reusable category, connect it to a reusable contact or
counterparty, add a transaction-specific concept, and optionally assign expense
transactions to a matching active budget.

This design also introduces a reusable transaction library for categories and
contacts. The goal is to make transactions useful immediately: saving a
transaction should update the transaction list, overview totals, account
balance, and matching budget spending in one coherent flow.

## Approved Scope

- Add persisted create, edit, and delete behavior for manual transactions.
- Capture both classification axes on every transaction:
  - category: what kind of money movement it is.
  - contact or counterparty: who the money involved.
- Capture a required transaction concept that describes the specific reason or
  detail for that transaction.
- Make categories user-owned records that are reusable by transactions, filters,
  and budgets.
- Make contacts user-owned records with a name, person or merchant type, theme
  color, and optional notes.
- Render categories and contacts with token-based theme colors. Contacts should
  use colored initials instead of requiring avatar images.
- Let users quick-create categories and contacts from the transaction form.
- Add a dedicated transaction library page for managing categories and contacts.
- Allow optional budget assignment during transaction creation and editing when
  the transaction is an expense, the date is in the active period, and the
  selected budget category matches the transaction category.
- Update account balance and monthly income or expense summaries when
  transactions are created, edited, or deleted.

Out of scope:

- Split transactions across multiple budgets.
- Importing transactions from banks or files.
- Account transfers between two owned accounts.
- Attachments or receipts.
- Full address book fields such as email, phone number, address, or tax IDs.
- A historical reports UI beyond the existing budget monthly snapshots.
- Deriving every account balance from the full transaction ledger in this
  iteration.

## Domain Model

### Transactions

Transactions remain the central event record. Each transaction belongs to one
user, one account, one category, and one counterparty.

The existing amount convention stays in place:

- positive `amount_cents` means income.
- negative `amount_cents` means expense.

Manual transaction fields:

- `id`
- `user_id`
- `account_id`
- `counterparty_id`
- `category_id`
- `concept`
- `amount_cents`
- `posted_at`
- `description`
- `created_at`
- `updated_at`

The transaction form should present amount type as `Income` or `Expense` so the
user does not need to think in signed numbers. The server action should convert
the form amount into the signed `amount_cents` value.

`concept` is the short, user-facing detail for the specific transaction, such as
`July salary`, `Weekly groceries`, `Tax payment`, or `Dinner with friends`. It
should be required for manual transactions, trimmed before saving, and displayed
only in the Transactions module. The existing `description` field remains an
optional longer note and does not need to appear in compact overview cards.

The migration should add `transactions.concept` as a non-empty text field. For
existing seed or production rows, it can be backfilled from `description` when
present and otherwise from the related category or counterparty name so existing
transactions remain readable after migration.

### Categories

Categories should become user-owned finance taxonomy records. They are the
source of truth for transaction classification, transaction filters, and budget
categories.

Recommended fields:

- `user_id`
- `id`
- `name`
- `slug`
- `theme_color`
- `created_at`
- `updated_at`

Rules:

- Category names should be unique per user, case-insensitively after trimming.
- Slugs should be generated from the normalized name and kept unique per user.
- Categories used by transactions or budgets cannot be deleted.
- Editing a category name or color updates future displays but does not rewrite
  immutable budget monthly snapshots.

The migration should preserve the current seeded categories by creating
user-owned category rows for existing users and updating references as needed.
Category ownership should be enforced with a composite user-scoped relationship:
categories should expose a unique `(user_id, id)` pair, and transactions and
budgets should validate their `(user_id, category_id)` against it so a user
cannot attach another user's category to their transaction or budget.

### Contacts And Counterparties

Counterparties become the reusable contacts/merchants shown in transaction rows.
The app should stop depending on avatar image URLs for manual records and render
colored initials from the display name.

Recommended fields:

- `user_id`
- `id`
- `display_name`
- `type`
- `theme_color`
- `notes`
- `created_at`
- `updated_at`

Rules:

- `type` remains `person` or `merchant`.
- `notes` are optional plain text for lightweight context.
- Display names should be unique per user, case-insensitively after trimming.
- Contacts used by transactions or recurring bills cannot be deleted.
- Existing seed avatar URLs can remain as nullable legacy data during migration,
  but new UI should not require users to provide images.

### Budgets

Budgets remain category-based monthly records. The existing one-budget-per-user,
category, and period rule still applies.

Budget assignment rules:

- Only expense transactions can be assigned to budgets.
- The transaction date must belong to the active budget period.
- The transaction category must match the budget category.
- A transaction can be assigned to at most one budget in this version.
- `assigned_amount_cents` stores the positive absolute value of the expense.

These rules should apply both in the transaction form and in existing inline
budget assignment controls on the transactions table.

### Account Summaries

The first implementation should update stored account summary rows instead of
deriving them from all transactions at read time.

When a transaction is created, edited, or deleted, the mutation should update:

- `accounts.current_balance_cents`
- the relevant `account_summaries.income_cents` value for income.
- the relevant `account_summaries.expense_cents` value for expenses.

If an edit changes account, date period, or amount sign, the mutation must
reverse the old contribution and apply the new contribution.

## Mutation Architecture

Transaction mutations should be implemented as Server Actions backed by
database query helpers. They should follow the existing finance action pattern:
validate input with Zod, run inside `withFinanceTransaction`, and return a
structured `{ ok, message, data }` result for the client.

### Create Transaction

The create action should:

1. Validate account, category, counterparty, concept, date, amount, description,
   and optional budget.
2. Insert the transaction.
3. Update the selected account balance by the signed amount.
4. Upsert the transaction month account summary and add the income or expense
   amount.
5. Create a budget assignment when a valid matching budget was selected.
6. Return the inserted transaction plus any affected account summary and budget
   assignment records needed to update client state.

### Edit Transaction

The edit action should:

1. Load the existing transaction for the current user.
2. Validate the requested changes.
3. Reverse the old transaction contribution from account balance and monthly
   summary.
4. Apply the new transaction contribution to the new account balance and monthly
   summary.
5. Update the transaction row.
6. Replace, update, or remove the budget assignment according to the new
   category, date, sign, and selected budget.

If the transaction changes from expense to income, any budget assignment must be
removed. If it changes to a different category or period, any incompatible
assignment must be removed unless the request includes a valid replacement.

### Delete Transaction

The delete action should:

1. Load the existing transaction for the current user.
2. Reverse its account balance and monthly summary contribution.
3. Delete any budget assignment for the transaction.
4. Delete the transaction row.

The database can cascade assignment deletion, but the action should still make
the client state change explicit so the UI updates predictably.

## User Interface

### Transactions Page

The Transactions page should keep the current searchable, filterable table/list
pattern and add primary actions near the page heading:

- `Add Transaction`
- a lower-emphasis `Manage Library` link to the reusable data page.

Rows should continue to show contact, concept, category, date, amount, and
budget assignment. On desktop, concept should be its own table column so users
can scan the specific reason for each transaction. On mobile, concept should sit
near the contact name as secondary transaction detail. The contact avatar area
should render colored initials for records without an image.

Overview transaction cards should stay compact and do not need to display
concept. They should continue to prioritize contact, date, and amount.

Inline budget assignment should only list matching-category active budgets for
expense transactions. If no matching budget exists, the row should explain that
there is no matching active budget.

### Add And Edit Transaction Dialogs

The transaction dialog should follow the existing finance dialog pattern used by
budget and pot forms:

- shadcn `Dialog` with `variant="finance"`.
- visible labels for every field.
- `CurrencyInput` for amount.
- date picker pattern based on the existing pot due date picker.
- inline validation messages.
- `AuthStatusMessage` for server action failures.
- full-width finance submit button.

Fields:

- Type: `Income` or `Expense`.
- Amount.
- Account.
- Date.
- Concept.
- Category.
- Contact or counterparty.
- Optional description.
- Optional matching budget, shown only when the selected values qualify.

The budget field should respond to changes in type, date, and category. If the
user changes the transaction so a selected budget no longer qualifies, the form
should clear the budget selection and show concise helper text.

### Quick Create

Category and contact pickers should allow quick creation without leaving the
transaction dialog.

Quick-create category fields:

- name.
- theme color.

Quick-create contact fields:

- display name.
- type: person or merchant.
- theme color.
- optional notes.

The color picker should reuse `ThemeSelect`, but this use case should not show
the `Already used` label and should not prevent choosing a color that another
record already uses.

### Transaction Library Page

Add a dedicated management surface under Transactions, such as
`/transactions/library`.

The page should use tabs or a simple segmented control:

- Categories.
- Contacts.

Each tab should list existing records with their color marker, name, and useful
metadata. Users can create and edit records from this page. Delete actions should
use `AlertDialog` and be blocked by the server when the record is in use.

This page should not become a broad settings area. It is specifically the
library of reusable transaction classification records.

## Error Handling

Expected validation failures should show inline form messages. Server failures
should return normal finance action results and render through the existing
status-message pattern. No transaction mutation should leave the dialog without
feedback.

Known errors should use user-actionable copy:

- duplicate category name.
- duplicate contact name.
- missing account, category, contact, or budget.
- missing or empty transaction concept.
- budget does not match the transaction category.
- budget is not active for the transaction period.
- attempted deletion of a category or contact that is in use.

Unexpected database errors should be handled through the existing finance action
error helper and should not expose raw SQL details.

## Client State And Selectors

`FinanceState` should include user-owned category and contact fields needed by
the UI. `FinanceViewModel` should stop depending on a fixed
`TransactionCategory` string union and instead expose category records or string
names derived from the loaded category rows.

Selectors should continue to derive:

- transaction display rows from transactions, categories, counterparties, and
  budget assignments, including concept for the Transactions module.
- budget spent values from `budget_transaction_assignments`.
- overview summary values from account and account summary records.

The reducer should receive enough data from successful Server Actions to update
client state without a full page reload.

## Testing Plan

Automated coverage should focus on the money movement rules:

- Creating an income transaction increases account balance and monthly income.
- Creating an expense transaction decreases account balance and increases
  monthly expenses.
- Creating an expense with a matching budget creates a budget assignment and
  updates derived budget spending.
- Creating a transaction persists and displays its concept in the Transactions
  module.
- Creating an income never creates a budget assignment.
- Editing amount, date, account, category, or type reverses old summary and
  balance effects before applying new effects.
- Editing an expense so it no longer matches the assigned budget removes the
  assignment.
- Deleting a transaction reverses account and summary effects and removes the
  assignment.
- Category and contact quick-create actions create reusable records for the
  current user.
- Deleting a used category or contact is blocked.

Manual checks:

- Add, edit, and delete transactions from the Transactions page.
- Confirm the Overview balance, income, and expenses change immediately.
- Confirm a matching budget's spent/free totals change immediately.
- Confirm non-matching budgets are not offered during transaction creation.
- Confirm concept appears in the Transactions table/list and not in Overview
  transaction cards.
- Confirm category and contact quick-create records appear in later transaction
  forms.
- Confirm the transaction library can edit names, colors, and contact notes.
- Confirm choosing an already-used color is allowed and does not display
  `Already used`.

## Implementation Notes

This feature should build on the existing finance module boundaries rather than
introducing a separate transaction subsystem. Server Actions belong in
`lib/finance/actions.ts`, database helpers in `lib/finance/queries.ts`, state
updates in `lib/finance/reducer.ts`, and UI under `components/transactions` plus
the new library route.

The current `budget_summaries` table is already secondary to assignment-derived
budget totals. This work should not add new active budget logic to
`budget_summaries`; budget spending should continue to come from
`budget_transaction_assignments`.

The schema changes around categories are the highest-risk part of the
implementation. The migration should be explicit about ownership, backfilling,
and referential integrity before UI work begins.
