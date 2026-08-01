# Recurring Bill Tooltip Effective Due Date — Design

**Date:** 2026-08-01  
**Status:** Approved (approach 1)

## Summary

The recurring-bills short-date tooltip is meant to show the next full due date
(`EEEE, d MMM, yyyy`). For card-assigned bills it currently shows the vendor
charge date (`currentOccurrence.dueDate`), which can already be past while the
row status is still Upcoming based on the statement payment due date
(`statusDueDate`). Non-card overdue / due-soon / due-today rows look correct
because their charge date and status date are the same.

Example: Platzi Expert Duo (card) shows `Monday, 6 Jul, 2026` instead of the
next payable date `Thursday, 6 Aug, 2026`.

## Goals

- Tooltip shows the **effective next due date** used for status presentation.
- Preserve correct overdue / due-soon / due-today tooltips for non-card bills.
- Keep the change scoped to the short-date tooltip UI.

## Non-Goals

- Changing sort / filter `nextDueDate` in URL filters.
- Changing pay / skip dialogs (they must keep using the occurrence charge date).
- Changing how `statusDueDate` is computed in selectors.

## Behavior

Resolve the tooltip date as:

1. `currentOccurrence.statusDueDate` when present (unpaid card-assigned bills)
2. Else `currentOccurrence.dueDate`
3. Else `bill.firstDueDate`

Short schedule labels (`1st`, `Aug 15th`) stay anchored on `firstDueDate` +
frequency. Only the hover full date changes.

## Implementation

- Update `nextDueDate` (or the equivalent local helper) inside
  `components/recurring-bills/bill-table-row.tsx` used by
  `BillScheduleShortDate`.
- Desktop `StatusIndicator` and mobile `MobileDueDateIndicator` already share
  that component, so both pick up the fix.
- Add or extend a focused test covering a card bill with `statusDueDate` set
  so the tooltip content uses that date, not `dueDate`.

## Safeguards

- Settled occurrences do not carry `statusDueDate`; fallback to `dueDate`.
- Non-card bills have no `statusDueDate`; behavior unchanged.
- Payment and statement attachment continue to use the original charge
  `dueDate`.
