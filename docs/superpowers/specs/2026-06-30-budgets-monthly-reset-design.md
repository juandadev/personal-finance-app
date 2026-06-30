# Budgets Monthly Reset Design

## Overview

The Budgets module will support monthly budget tracking with automatic calendar-month resets. Users define budgets for the active month, manually assign expense transactions to those budgets, and see how much has been spent and how much remains. At the start of each new month, the app will close the previous month, store immutable budget history snapshots, and copy the previous month's active budget definitions into the new month with spending reset to zero.

This design focuses only on the Budgets module. It introduces a reporting pattern that can later be reused by other modules, but it does not build a full reports section yet.

## Approved Scope

- Use one Vercel Cron process for all users.
- Reset budgets on the 1st day of each month at 12:00 UTC.
- Store each user's timezone for display and future reporting.
- Show the user a reset-time disclaimer on the Budgets page using their timezone.
- Track budget spending through manual transaction assignment.
- Allow one transaction to be assigned to at most one budget in this version.
- Design the assignment schema so split assignments can be added later.
- Save static historical budget snapshots that are not affected by future budget edits.
- Copy active previous-month budgets into the new month with zero spending.
- Prepare Budgets links to Transactions with query params, but do not implement Transactions query-param filtering in this work.

Out of scope:

- User-configurable budget cycle start days.
- Biweekly or payday-based budget cycles.
- Timezone-specific cron schedules.
- A full historical reports UI.
- Transactions page filtering behavior.
- Split transaction assignment across multiple budgets.

## Reset Architecture

The app will use Vercel Cron to call a protected Next.js route, such as `/api/cron/monthly-budget-close`, on the 1st day of each month at 12:00 UTC.

The route will call a server-side close service that processes every user. The service must be idempotent so retries or duplicate invocations cannot create duplicate monthly report records, duplicate budget snapshots, or duplicate copied budgets.

The monthly close service will:

1. Identify the previous calendar period and new calendar period.
2. Finalize previous-month budget results for each user.
3. Store immutable budget snapshots for each previous-month budget.
4. Copy each previous-month active budget into the new month.
5. Start copied budgets with no assigned spending.
6. Return structured execution details for observability.

The global reset time is fixed at 12:00 UTC. User timezone does not control when the reset job runs. It only controls how the reset time is displayed in the UI and provides a foundation for later localized reporting decisions.

## Data Model

### Profiles

Add `profiles.timezone`.

Recommended initial behavior:

- Default existing users to `America/Mexico_City`, unless the app already has a stronger user locale source by implementation time.
- Validate timezone values against a known IANA timezone list in application code.
- Use the stored timezone to display the reset disclaimer on the Budgets page.

### Budgets

Keep `budgets` as monthly budget instances.

Each row represents one budget for one user, category, and period. The existing uniqueness rule on user, category, and period remains useful because copied budgets create a new row for the new period.

The Budgets page should load and display only the active current-period budgets by default.

### Transaction Assignments

Add `budget_transaction_assignments`.

Recommended columns:

- `user_id`
- `id`
- `budget_id`
- `transaction_id`
- `assigned_amount_cents`
- `created_at`
- `updated_at`

Behavior:

- Only expense transactions can be assigned to budgets.
- In this version, a transaction can be assigned to at most one budget.
- `assigned_amount_cents` should store the positive absolute value of the assigned expense amount. In this version, it equals the full absolute value of the expense transaction.
- The table should include enough structure to later support multiple assignment rows per transaction for split budgeting.

The first implementation can enforce one assignment per transaction with a unique constraint on `(user_id, transaction_id)`. Future split support would replace or relax this constraint.

### Monthly Report Runs

Add `monthly_report_runs` as a lightweight reusable reporting parent table.

Recommended columns:

- `user_id`
- `id`
- `period`
- `module`
- `status`
- `started_at`
- `completed_at`
- `error_message`

Behavior:

- The first module value is `budgets`.
- A successful run should be unique by user, module, and period.
- The close service can use this table to decide whether a user's budget close has already completed.

This creates a reusable pattern for later monthly reports without making the first Budgets implementation too generic.

### Budget Monthly Snapshots

Add `budget_monthly_snapshots`.

Recommended columns:

- `user_id`
- `id`
- `monthly_report_run_id`
- `period`
- `source_budget_id`
- `category_id`
- `category_name`
- `theme_color`
- `limit_cents`
- `spent_cents`
- `free_cents`
- `assigned_transaction_count`
- `created_at`

Behavior:

- Snapshots are immutable reporting records.
- Snapshot values are copied at close time and must not depend on future joins for historical meaning.
- Future edits to category names, budget amounts, colors, or new-month budget rows must not change historical snapshots.
- References such as `source_budget_id` and `category_id` are kept for traceability only.
- Report UI should read snapshot fields like `category_name`, `limit_cents`, `spent_cents`, and `free_cents`.

## Budget Spending Flow

Budgets will move from category-derived spending to manual assignment.

Current spending totals should be calculated from `budget_transaction_assignments`, not from transaction category alone. A transaction affects a budget only when the user assigns it to that budget.

Rules:

- Income transactions are not assignable to budgets.
- Expense transactions can be assigned to one active current-month budget.
- The positive assigned amount reduces the budget's free amount.
- Unassigning a transaction restores that amount to the budget.
- Editing or deleting an assigned transaction must update budget totals.
- Latest Spending on a budget card means latest assigned transactions, not latest category-matching transactions.

The existing `budget_summaries` table should be phased out of active app logic. The first implementation may leave the table in place for compatibility, but new current-month budget totals should come from assignment rows. A later cleanup migration can remove `budget_summaries` after the new model is stable.

## User Interface

The Budgets page should keep its current structure:

- Page heading and Add Budget action.
- Summary chart.
- Spending Summary card.
- One card per active budget.

Add a concise reset disclaimer near the page heading or summary area:

> Budgets reset on the 1st of each month at 6:00 AM in your timezone.

The displayed time is an example. The implementation should derive it from the global `12:00 UTC` reset schedule and the user's stored timezone. UI date and time formatting should use `date-fns`.

Budget cards should display:

- Limit.
- Assigned spent.
- Free amount.
- Progress.
- Latest assigned transactions.

Empty assigned-transaction copy should mention assignment, for example:

> Assigned transactions will appear here.

The `See All` link should prepare a Transactions URL with query params:

```text
/transactions?budgetId=<budgetId>
```

The Transactions page does not need to support this filter as part of this work.

## Error Handling And Idempotency

The cron route must be protected by a secret so only Vercel Cron or another authorized caller can invoke it.

The route should return structured results such as:

- users checked
- users closed
- budget snapshots created
- budgets copied
- skipped users
- user-level failures

Idempotency rules:

- `monthly_report_runs` prevents duplicate successful closes for the same user, module, and period.
- `budget_monthly_snapshots` prevents duplicate snapshots for the same user, period, and source budget.
- copied budgets respect the existing unique rule for user, category, and period.
- a retry skips completed work and completes missing work when possible.

Failure handling:

- If one user fails, the process records or reports that failure and continues with other users.
- If snapshots succeed but copying next-month budgets fails, a retry should copy missing budgets without duplicating snapshots.
- The route must not expose raw database errors or secrets.

## Testing Plan

Automated coverage should focus on the business rules most likely to regress:

- Period calculation around the 1st day of the month.
- Snapshot math for limit, spent, free, and assigned transaction count.
- Running the close service twice without creating duplicate records.
- Current budget totals from assignment rows.
- Assignment restrictions for income transactions.
- Copying previous-month budgets into the new period.

Manual checks:

- Budgets page shows the reset disclaimer with the user's timezone.
- Budget cards show assigned spending and free amount.
- Latest Spending shows only assigned transactions.
- `See All` produces `/transactions?budgetId=<budgetId>`.
- Empty states mention assigned transactions.

## Open Implementation Notes

- The exact route name and table names can be adjusted during implementation if a clearer local convention emerges.
- The implementation should keep the service boundary reusable: a cron route should orchestrate, while a finance-domain service should perform budget closing.
- The design intentionally avoids user-configurable cycle days for now, but the snapshot schema keeps explicit periods so future cycle changes can be introduced deliberately.
