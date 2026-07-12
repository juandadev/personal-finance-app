# Cross-Category Budget Assignment Design

## Goal

Let users assign an eligible budget to an expense transaction regardless of the
transaction's category. The assigned expense contributes to the selected
budget's spent total.

## Rules

- Only expense transactions can have a budget assignment.
- A selected budget must belong to the current active budget period and the
  transaction date must fall within that period.
- A transaction can be assigned to at most one budget.
- A budget assignment is not constrained by the transaction category.
- If a transaction becomes income, or is moved outside the active budget period,
  its assignment is removed.

## User Experience

- The transaction dialog continues to show the optional budget selector only
  for expense transactions.
- The selector lists every active budget eligible for the selected transaction
  date, with `No budget` as its first option.
- The inline budget selector on transaction rows offers every active budget for
  expense transactions.
- Budget option labels remain the budget category name so users can identify
  their destination budget.
- When no active budgets are eligible for the transaction date, the dialog
  explains that no active budget is available for that date.

## Implementation Boundaries

- Update the shared transaction-dialog budget eligibility helper and its
  submit-time guard to exclude category matching.
- Update the inline transaction-table selector to exclude category matching.
- Remove the category equality condition from server-side creation, update, and
  inline-assignment queries while preserving ownership, expense, and period
  checks.
- Adjust validation copy to describe the remaining eligibility requirements.
- Add targeted automated coverage for cross-category assignment eligibility.

## Error Handling

Invalid assignment attempts continue to return normal finance action errors.
The server rejects assignments for income transactions, unavailable budgets, and
budgets outside the active period. It no longer rejects a selection because its
category differs from the transaction category.

## Testing

- Creating an expense with a differently categorized active budget persists the
  assignment and updates that budget's spent total.
- Editing an expense can replace its assignment with a differently categorized
  active budget.
- Inline assignment accepts a differently categorized active budget.
- Income and out-of-period transactions remain ineligible for assignment.
