# URL Filtering Design

## Goal

Make transaction and recurring-bill list state shareable and restorable through
URL query parameters. The immediate outcome is a working Budget `See All` link
that opens Transactions scoped to the selected budget.

The feature uses `nuqs` for typed client-side query state. It retains the
existing server-hydrated `FinanceProvider` and client-side list derivation; no
server-query or data-fetching migration is part of this design.

## Architecture

- Install `nuqs` and mount `NuqsAdapter` from the Next.js App Router adapter
  once in the root layout.
- Keep `FinanceProvider` as the source of the authenticated user's finance
  data. It continues to hydrate all list data and reconcile mutations through
  its existing reducer/actions.
- Add a focused URL-filter module that owns:
  - typed `nuqs` parser definitions and defaults;
  - canonical serialization of query values;
  - shared parsing helpers for repeated IDs, dates, absolute money bounds, and
    pages;
  - pure transaction and recurring-bill predicate and sorting functions.
- `TransactionsContent` and `BillsContent` consume typed URL state and derive
  their visible rows from the data already supplied by the finance store.
  Neither component fetches data.
- Update the budget-card link to emit the canonical `budget` parameter that
  the transaction predicate consumes.

This structure puts URL serialization and filtering rules in independently
testable units while preserving the existing provider's responsibility for
data and mutations.

## Query Semantics

- Omit default values from generated URLs.
- Use repeated keys for multi-select filters, such as
  `category=<id>&category=<id>`.
- Combine different filter groups with AND. Combine values within one group
  with OR.
- Use stable user-owned record IDs for categories, budgets, accounts,
  counterparties, and credit cards. Display names are never URL identifiers.
- Treat `from`, `to`, `dueFrom`, and `dueTo` as inclusive ISO `YYYY-MM-DD`
  dates.
- Treat `minAmount` and `maxAmount` as inclusive absolute major-currency
  values. `direction` separately selects income or expense transactions.
- Every filter or sort update resets transaction `page` to `1`. The page
  parameter is retained in links so shared transaction URLs restore the
  selected result page.
- URL updates use shallow routing and replace the current browser-history
  entry. They do not trigger a server refresh or create a history entry for
  each control change.

## Transaction Query Contract

The `/transactions` route supports these parameters:

| Parameter                | Values                                                | Behavior                                                                                                 |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `q`                      | text                                                  | Case-insensitive match against counterparty/name, concept, and description.                              |
| `sort`                   | `latest`, `oldest`, `a-z`, `z-a`, `highest`, `lowest` | Defaults to `latest`.                                                                                    |
| `page`                   | positive integer                                      | Defaults to `1`; pagination happens after filtering and sorting.                                         |
| `category`               | repeated category IDs                                 | Matches one of the selected categories.                                                                  |
| `budget`                 | repeated budget IDs or `unassigned`                   | Matches one selected assignment, or transactions with no assignment. A link with both uses OR semantics. |
| `account`                | repeated account IDs                                  | Matches one selected account.                                                                            |
| `counterparty`           | repeated counterparty IDs                             | Matches one selected counterparty.                                                                       |
| `method`                 | repeated payment methods                              | Matches `bank_account`, `credit_card`, `voucher`, or `credit_card_payment`.                              |
| `card`                   | repeated credit-card IDs                              | Matches one selected credit card.                                                                        |
| `direction`              | `income` or `expense`                                 | Selects the transaction's money direction.                                                               |
| `from`, `to`             | ISO dates                                             | Filters the posted date inclusively.                                                                     |
| `minAmount`, `maxAmount` | non-negative decimal amounts                          | Filters absolute transaction magnitude inclusively.                                                      |

Current transaction search, sort, and category controls read and write their
corresponding URL values. The remaining dimensions are URL-only in this scope.

## Recurring-Bill Query Contract

The `/recurring-bills` route supports these parameters:

| Parameter                | Values                                                | Behavior                                                                  |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `q`                      | text                                                  | Case-insensitive match against counterparty/name and bill concept.        |
| `sort`                   | `latest`, `oldest`, `a-z`, `z-a`, `highest`, `lowest` | Defaults to `latest`; preserves the current due-status priority behavior. |
| `category`               | repeated category IDs                                 | Matches one selected category.                                            |
| `counterparty`           | repeated counterparty IDs                             | Matches one selected counterparty.                                        |
| `frequency`              | repeated `monthly` or `yearly`                        | Matches one selected schedule frequency.                                  |
| `status`                 | repeated current occurrence statuses                  | Matches one selected computed bill status.                                |
| `dueFrom`, `dueTo`       | ISO dates                                             | Filters the computed next due date inclusively.                           |
| `minAmount`, `maxAmount` | non-negative decimal amounts                          | Filters bill amounts inclusively.                                         |
| `source`                 | repeated `bank_account` or `credit_card`              | Filters the payment funding type.                                         |
| `card`                   | repeated credit-card IDs                              | Matches one selected credit card.                                         |
| `lifecycle`              | `all`, `active`, or `archived`                        | Defaults to `all`, preserving the current active and archived groups.     |
| `schedule`               | `ongoing` or `finite`                                 | Filters indefinite bills or finite-installment bills.                     |

The existing recurring-bill search and sort controls also read and write their
URL values. All other recurring-bill dimensions are URL-only in this scope.

## User Experience

- A Budget card's `See All` link opens `/transactions?budget=<budget-id>`.
  Transactions assigned to that budget are immediately shown.
- Existing search, sort, category, and pagination behavior remains in place,
  with URL state replacing the current local state where applicable.
- URL-only filters intentionally receive no dedicated filter controls, chips,
  or visual summaries in this phase.
- A `Reset Filters` action appears in each list's filter row only when URL
  state differs from its defaults. It clears every supported URL filter,
  restores `sort=latest`, and returns Transactions to page one. It uses an
  icon-only ghost button with an accessible label and tooltip at every
  breakpoint.
- Filtered links can be bookmarked and shared. A URL restores its state after
  hydration from the global finance store.
- If a filter leaves no matching rows, the existing no-results state renders.
- If filtered results contain rows and a valid page is greater than the
  available page count, the final available page is rendered. Zero matching
  rows always render the no-results state.

## Error Handling and Safety

- Invalid enum values, malformed dates or amounts, and non-positive pages are
  ignored or resolve to the relevant safe default. An inverted date or amount
  range discards both bounds for that range.
- Unknown or stale IDs simply match no records; they do not throw.
- Query parameters only filter the records already hydrated for the current
  authenticated user. They neither trigger data access nor alter mutations.
- Computed recurring-bill filters use the current selector output. A shared
  link can naturally show a different bill status or next due date as time
  passes.

## Testing

- Unit-test pure transaction and bill predicates for every filter, sorting,
  inclusive date and amount boundaries, OR-within/AND-across semantics,
  unassigned budgets, lifecycle, status, and schedules.
- Test malformed values, stale IDs, inverted ranges, default restoration, and
  out-of-range pagination.
- Test `nuqs` parser integration for canonical URL serialization, hydration,
  history replacement, and resetting transactions to page one when filter or
  sort state changes.
- Test existing transaction and recurring-bill controls update and restore
  their query state.
- Test reset actions clear every query parameter and restore the default sort
  and transaction page.
- Test a Budget `See All` link produces the canonical budget URL and shows
  only transactions assigned to that budget.

## Deferred Work

- Server-side filtering, sorting, and pagination.
- Route-level data fetching or a replacement for `FinanceProvider`.
- Historical budget-period navigation.
- New filter controls, active-filter indicators, and chips.

Those changes become appropriate if the globally hydrated transaction history
creates measurable payload or client-performance pressure.
