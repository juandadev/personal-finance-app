# Overview Due for Payment — Design

**Date:** 2026-08-01  
**Status:** Approved  
**Amends:** [Recurring Bills — Design](./2026-07-08-recurring-bills-design.md),
[URL Filtering — Design](./2026-07-14-url-filtering-design.md)

## Summary

Add an overview section under Transactions that lists manual recurring bills
needing attention: overdue, due today, or due soon, and not assigned to a
credit card. The section is a reminder surface—read-only rows and links into
the Recurring Bills page with matching filters. The existing right-column
Recurring Bills summary card (Paid / Due Soon / Upcoming totals) stays as-is.

## Goals

- Surface bills the user must pay manually before they slip past due.
- Keep the overview list compact and consistent with the Transactions card.
- Deep-link to Recurring Bills already filtered to the same set of bills.
- Reuse existing bill status, urgency sort, and URL filter machinery.

## Non-Goals

- Pay, skip, or archive actions on the overview.
- Including credit-card-assigned bills (those settle via statements).
- Changing due-soon window length (stays at the existing 7 days).
- New schema, migrations, or notification/push systems.
- Replacing or removing the overview Recurring Bills summary buckets.

## Core Decisions

- **Approach:** Compact reminder list under Transactions (Approach 1).
- **Eligibility:** Active bills only (`archivedAt` unset), `creditCardId`
  unset, current status one of `overdue` | `due-today` | `due-soon`.
- **Sort:** After filtering, reuse `sortRecurringBills(..., "latest")` so
  urgency is Overdue → Due Today → Due Soon, then soonest next due date
  within each status.
- **Cap:** UI shows at most 4 rows (same as Transactions). The selector
  returns the full matching list; the card slices.
- **Empty state:** Section always renders. When there are no matches, show a
  calm empty state (“You’re all caught up”) with a short supporting line that
  no manual bills need payment soon. “View All” remains available.
- **Navigation:** Row click and “View All” go to `/recurring-bills` with
  `source=bank_account` and `status` for `overdue`, `due-today`, and
  `due-soon` (nuqs native array query params, same as the bills page).
- **Title:** **Due for payment**.
- **Placement:** Left column: Pots → Transactions → Due for payment.

## Terminology

- **Manual bill:** Recurring bill with no `creditCardId` (payment source
  `bank_account` in filters). User chooses how to pay when settling.
- **Due for payment:** Overview module listing urgent manual bills.

## Data

- Add `selectManualBillsDueReminder(bills)` (name may vary) that filters and
  urgency-sorts existing `RecurringBill` view models from
  `selectRecurringBills`. No new DB reads.
- Prefer exposing the list via finance selectors / `useFinance()` so the card
  and tests share one rule. Cap remains a presentation concern.
- Status already comes from `getRecurringBillDueStatus` /
  `selectCurrentOccurrence`; do not recompute due windows in the card.

## UI

- New components under `components/overview/due-for-payment/`:
  - Card shell matching Transactions (`Card asChild` → `section`, header with
    `h2`, `View All` + chevron via `cardActionLinkClasses`).
  - Row: `ContactAvatar`, concept (bold) + contact (muted), amount, due date,
    and existing bill status treatment (icon + color for overdue / due today /
    due soon).
- Wire into `app/(app)/page.tsx` under `TransactionsCard`.
- Update `DESIGN.md` Overview / Recurring Bills guidance for this module:
  placement, title, eligibility, empty copy, and deep-link behavior.

## Testing

- Selector unit tests:
  - Excludes card-assigned and archived bills.
  - Includes overdue, due-today, and due-soon manual bills only.
  - Sorts by urgency then due date.
- Component tests:
  - Renders up to 4 rows from a longer match list.
  - Empty state copy when there are no matches.
  - View All (and row) href includes `source=bank_account` and the three
    urgent statuses.

## Out of scope follow-ups

- In-app toast/badge counts for urgent manual bills.
- Configurable due-soon window.
- Overview pay shortcut (explicitly deferred; settle on Recurring Bills).
