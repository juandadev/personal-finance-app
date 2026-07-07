# Voucher Expense Transactions Design

## Summary

Add a transaction-level voucher marker so expenses paid with vouchers can count
against budgets without changing the active account balance or account expense
summary.

The app currently treats every transaction as movement through the active
account. That makes bank-account totals inaccurate when a user records spending
paid with employer vouchers. The new behavior keeps the transaction in spending
history and budget tracking, while leaving the bank-account balance aligned with
the real primary account.

## Goals

- Let users mark expense transactions as paid with voucher.
- Keep voucher expenses in transaction history.
- Let voucher expenses reduce assigned budget remaining.
- Prevent voucher expenses from changing current balance.
- Prevent voucher expenses from increasing the Overview account `Expenses`
  summary.
- Keep mixed payments simple by entering two transactions: one voucher expense
  and one normal bank expense.

## Non-Goals

- Do not track voucher allowance balances or monthly voucher funding.
- Do not add separate grocery and restaurant voucher types.
- Do not add user-defined payment sources in this iteration.
- Do not add split-payment support inside one transaction.
- Do not change budget creation fields or require budgets to separate voucher
  and bank-funded amounts.
- Do not reintroduce account selection to transaction creation.

## Current State

The finance model stores transactions with signed `amount_cents`: positive
values are income and negative values are expenses. Transaction mutations update
the active account and account monthly summary whenever a transaction is
created, edited, or deleted.

Budget spending is already assignment-based. An expense affects a budget only
when it has a matching `budget_transaction_assignments` row. This means voucher
support does not need a new budget-spending model. It needs a way for a
transaction to be budget-affecting without being account-affecting.

## Data Model

Add a boolean column to `transactions`:

- `is_voucher_expense boolean not null default false`

The field means:

- `false`: normal account-affecting transaction.
- `true`: expense paid with voucher, budget-affecting but not
  account-affecting.

`is_voucher_expense` is intentionally generic. It does not distinguish grocery
vouchers from restaurant vouchers because the first product need is only to
exclude the transaction from bank-account math while keeping it in budget
spending history.

Existing transactions should backfill to `false`.

## Transaction Rules

Normal transactions keep the current behavior:

- Income increases the account balance and monthly income summary.
- Expense decreases the account balance and increases the monthly expense
  summary.
- Assigned expenses reduce matching budget remaining.

Voucher expense transactions behave differently:

- They must be expenses.
- They appear in transaction history.
- They can be assigned to a matching current-month budget.
- They reduce assigned budget remaining by the expense amount.
- They do not change `accounts.current_balance_cents`.
- They do not change `account_summaries.income_cents`.
- They do not change `account_summaries.expense_cents`.

Mixed payments are represented as two transactions. For example, if a grocery
purchase is partly paid with voucher and partly paid with bank money, the user
records one voucher expense for the voucher amount and one normal expense for
the bank amount.

## Mutation Flow

### Create Transaction

Creation should save the transaction with `is_voucher_expense`.

If the transaction is normal, apply the existing account balance and monthly
summary effects. If it is a voucher expense, skip those account effects.

Budget assignment logic remains based on the saved expense transaction:

- The transaction must be an expense.
- The budget must match the category.
- The transaction date must be in the active budget period.
- The assigned amount remains the positive absolute expense amount.

### Edit Transaction

Edits must consider both the old voucher state and the new voucher state.

Before saving the new transaction values:

- Reverse the old account effects only if the existing transaction was not a
  voucher expense.

After saving:

- Apply the new account effects only if the saved transaction is not a voucher
  expense.
- Re-sync the budget assignment from the new amount, date, category, and budget
  selection.

This covers the important transitions:

- Normal expense to voucher expense: remove the old bank effect and keep or
  re-sync budget spending.
- Voucher expense to normal expense: apply the bank effect and keep or re-sync
  budget spending.
- Expense to income: clear voucher state and remove any budget assignment.
- Income to expense: allow voucher state only if the user explicitly checks it.

### Delete Transaction

Deleting a transaction should:

- Reverse account effects only if the transaction was not a voucher expense.
- Delete any budget assignment.
- Delete the transaction.

Voucher expense deletion removes the history row and its budget impact without
touching account balance or account summaries.

## User Interface

In the add and edit transaction dialog, add a checkbox control:

> Paid with voucher

The control should render only when `Type = Expense`. It should be hidden for
income transactions rather than disabled. Switching from `Expense` to `Income`
clears the value to `false` and hides the checkbox.

Default state:

- New expense transactions default to unchecked.
- Existing voucher expenses open with the checkbox checked.
- Existing income transactions never show the checkbox.

Helper copy should be concise:

> Voucher expenses reduce budgets but do not change your account balance.

The budget selector remains available for voucher expenses, using the same
matching-category and active-period rules as normal expenses.

The transaction list should show a small `Voucher` label or chip on voucher-paid
transactions. Amount styling can remain the same as other expenses because the
row still represents spending.

## Budget Creation

Budget creation does not need a new field. Users should continue entering the
full monthly budget limit, including the amount they expect to spend with
vouchers.

For example:

- Groceries budget: `$12,000 MXN`, including the monthly grocery voucher amount.
- Entertainment budget: `$6,000 MXN`, including the monthly restaurant voucher
  amount.

Budget spending answers "how much did I really spend in this category?" across
both bank-funded and voucher-funded expenses.

## Validation And Error Handling

Client validation should keep `is_voucher_expense` as a boolean with default
`false`.

Server validation remains the authority:

- Reject `is_voucher_expense = true` for income transactions.
- Treat missing `is_voucher_expense` as `false` for compatibility with older
  clients during rollout.
- Preserve existing transaction validation for amount, date, concept, category,
  contact, and description.
- Preserve existing budget assignment validation for category and active period.

Expected validation failures should use the existing form status and field-error
patterns.

## Client State And Selectors

`TransactionRecord` should include `is_voucher_expense`. The selected
transaction view model should expose enough data for the transaction list and
edit dialog, such as `isVoucherExpense`.

Overview summary cards should continue reading from account and account summary
records. Because voucher expenses skip account effects at mutation time, the
existing summary selector does not need to subtract voucher expenses at read
time.

Budget selectors can continue deriving spending from
`budget_transaction_assignments`. Voucher expenses reduce budgets through the
same assignment rows as normal expenses.

## Testing And Verification

Automated coverage should focus on money movement rules:

- Creating a normal expense decreases balance, increases account expenses, and
  reduces the assigned budget.
- Creating a voucher expense does not change balance or account expenses, and
  reduces the assigned budget.
- Editing a normal expense to a voucher expense reverses the old account effects
  and keeps or re-syncs budget assignment.
- Editing a voucher expense to a normal expense applies account effects and
  keeps or re-syncs budget assignment.
- Editing an expense to income clears voucher state and removes budget
  assignment.
- Deleting a voucher expense removes the transaction and budget assignment
  without changing account balance or account summaries.
- Server validation rejects voucher income payloads.

Manual verification should cover:

- Add a voucher expense with a matching budget.
- Confirm Overview current balance and expenses do not change.
- Confirm the matching budget spent amount increases.
- Confirm transaction history shows the expense with a `Voucher` label.
- Confirm editing the transaction between voucher and normal updates account
  totals correctly.
- Confirm changing transaction type to income hides the checkbox and clears the
  voucher value.
