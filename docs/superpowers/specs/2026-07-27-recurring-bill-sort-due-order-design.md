# Recurring Bill Sort by Urgency then Due Date — Design

**Date:** 2026-07-27  
**Status:** Awaiting spec review

## Summary

The recurring bills table default sort (**Latest**) groups by urgency status, then
orders by next due date **descending**. After Due Soon, far-future yearly and
one-time bills appear above nearer monthly bills. Change Latest and Oldest so
both keep the same urgency groups, and flip due-date direction: Latest soonest
first, Oldest furthest first.

## Goals

- Keep urgency as the primary key for Latest and Oldest:
  Overdue → Due Today → Due Soon → Upcoming → paid/other.
- Within the same status, order by `nextDueDate`:
  - Latest: ascending (soonest first)
  - Oldest: descending (furthest first)
- Leave A–Z, Z–A, Highest, and Lowest unchanged.
- Keep default URL sort as `latest` and existing option labels.

## Non-Goals

- Renaming sort options or changing URL param values.
- Changing summary card aggregates or overview card row order.
- Changing credit-card statement sort or reducer store order for bill records.
- Changing how `nextDueDate` is derived
  (`currentOccurrence?.dueDate ?? firstDueDate`).
- New UI beyond the existing sort dropdown behavior.

## Current Behavior

`sortRecurringBills` in `lib/finance/url-filters/recurring-bill-filters.ts`:

| Mode   | Primary                         | Secondary                    |
| ------ | ------------------------------- | ---------------------------- |
| Latest | Status urgency rank (low first) | `nextDueDate` **descending** |
| Oldest | None (date only)                | `nextDueDate` **ascending**  |

Latest therefore correctly pins Due Soon (and more urgent statuses) at the top,
but within Upcoming it prefers the furthest due dates — so yearly/one-time bills
that are months away outrank monthly bills due next week.

Oldest today is pure chronological ascending with no status grouping, so it is
not the reverse of Latest. That also lets paid/settled bills with past due dates
float above unsettled upcoming bills; after this change, paid/other always sort
after unsettled urgency ranks.

## Sort Rule

Both Latest and Oldest use the same status priority map already used by Latest:

| Rank | Status                        |
| ---- | ----------------------------- |
| 0    | `overdue`                     |
| 1    | `due-today`                   |
| 2    | `due-soon`                    |
| 3    | `upcoming`                    |
| ∞    | `paid`, `skipped`, or unknown |

Then compare `nextDueDate` (ISO date string via `localeCompare`):

| Mode   | Primary status order | Secondary due date |
| ------ | -------------------- | ------------------ |
| Latest | urgency ascending    | ascending          |
| Oldest | urgency ascending    | descending         |

Example under Latest with today in the due-soon window:

1. Overdue / Due Today / Due Soon (each subgroup soonest due first)
2. Upcoming monthly due next week
3. Upcoming yearly due in several months
4. Paid or fully settled bills last

Under Oldest, the same status buckets appear, but within each bucket furthest
due date comes first.

## Architecture

Single change site: `sortRecurringBills` in
`lib/finance/url-filters/recurring-bill-filters.ts`.

1. Share the existing `latestSortStatusPriority` / `latestSortRank` helper for
   both `latest` and `oldest` cases (rename only if it improves clarity; not
   required).
2. After a non-zero status comparison, return that result for both modes.
3. On equal status:
   - `latest`: `nextDueDate(left).localeCompare(nextDueDate(right))`
   - `oldest`: `nextDueDate(right).localeCompare(nextDueDate(left))`
4. Leave name and amount sort branches untouched.
5. `filterRecurringBills` continues to call `sortRecurringBills` unchanged.

No component, query-parser, or type changes.

## Testing

Add unit tests in `lib/finance/url-filters/url-filters.test.ts` (or a focused
companion if that file is already large):

1. **Latest urgency:** overdue before due-soon before upcoming before paid.
2. **Latest within upcoming:** sooner `nextDueDate` before later (e.g. monthly
   next week before yearly in December).
3. **Oldest within upcoming:** later `nextDueDate` before sooner (mirror of 2).
4. **Oldest still urgency-first:** overdue before upcoming, and paid after
   upcoming, regardless of raw `nextDueDate` order.

Use minimal `RecurringBill` fixtures with `status` and
`currentOccurrence.dueDate` (or `firstDueDate`) set explicitly.

## Acceptance Criteria

1. Default bills table (no `sort` query param) shows urgent bills first, then
   remaining bills in soonest-next-due order within each status.
2. Choosing Oldest keeps the same status buckets and reverses due-date order
   within each bucket.
3. Other sort options behave as today.
4. Unit tests above pass.
