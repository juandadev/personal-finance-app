# Credit-Card Recurring-Bill Statuses — Design

**Date:** 2026-07-11  
**Status:** Awaiting spec review

## Summary

Card-assigned recurring bills currently derive `Upcoming`, `Due Soon`, `Due Today`, and `Overdue` from the vendor bill due date. This can incorrectly flag a bill as overdue before the card statement that contains it is payable. The bill remains unsettled until that statement is paid, but its status should communicate the card payment obligation, not the vendor's original billing date.

For unpaid card-assigned occurrences, derive display status and status date from the payment due date of the exact statement cycle the occurrence attaches to. Non-card bills preserve their existing due-date behavior. Payment, persistence, transaction, and statement-settlement behavior do not change.

## Goals

- Prevent card-assigned bills from appearing due soon, due today, or overdue before their attached statement's payment due date.
- Display the statement payment due date beside the derived card-bill status.
- Preserve non-card recurring-bill status behavior exactly as it is today.
- Use an accessible warning treatment for `Due Soon` and `Due Today`; retain destructive red for `Overdue`.
- Keep the existing “Due Soon” summary aggregate, including due-today and overdue occurrences.

## Non-Goals

- Change credit-card page or credit-card-detail status styling.
- Change card statement attachment, statement payment, transaction materialization, or payment persistence.
- Add a database migration or persist an additional occurrence date.
- Change the seven-day due-soon window.

## Status Derivation

### Existing authoritative dates

Each occurrence retains its original bill `dueDate`. This date remains authoritative for schedule generation, identifying settled payments, statement attachment, transaction posting, and historical records.

### Effective status date

Add a read-only effective status date to the recurring-bill occurrence view model:

| Occurrence                         | Effective status date                                         | Derived status                                        |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Unpaid non-card bill               | Original bill due date                                        | Existing date-based status                            |
| Unpaid card-assigned bill          | `paymentDueDate` of the occurrence's attached statement cycle | Date-based status using the existing seven-day window |
| Paid or skipped bill               | Not used                                                      | Persisted `paid` or `skipped` status                  |
| Card assignment cannot be resolved | Original bill due date                                        | Existing date-based status                            |

The card cycle is resolved with the existing `getBillOccurrenceStatementCycle` rules. This includes rolling past paid statement cycles and keeping unpaid cycles (including virtual statements with no stored row) until they are paid. The resulting `paymentDueDate` is therefore the same due date used by the statement that eventually settles the occurrence.

The view model exposes both the original due date and the effective status date. Recurring-bill row UI displays the effective status date; payment and statement code continue to use the original due date.

## Selector and UI Data Flow

1. Generate structural occurrences with the existing recurring-bill schedule resolver.
2. For an unpaid card-assigned occurrence, resolve the attached statement cycle from the assigned card and its statements.
3. Derive its effective status date from that cycle's payment due date and recalculate its unresolved status using the shared date-status rules.
4. Preserve persisted `paid` and `skipped` statuses without recalculation.
5. Build the recurring-bill view model from these enriched occurrences.
6. Reuse the enriched statuses in the recurring-bills summary, desktop rows, and mobile rows.

The selector will build card and statement lookups once and pass only the data needed for this display enrichment. The lower-level schedule generator remains usable for schedule-only and mutation code without a credit-card dependency.

## Visual Treatment

Update `DESIGN.md` first with the recurring-bill status color rule:

- `Due Soon` and `Due Today`: semantic `warning` color with a warning icon.
- `Overdue`: semantic `destructive` red with a warning icon.
- `Upcoming` and `Skipped`: muted foreground.
- `Paid`: accent teal with a check icon.

Add an accessible semantic `--color-warning` token to `app/globals.css`: `#93674f` (the existing finance brown) in the light theme and `#f2cdac` in the dark theme. Add `warning` to `lib/theme-colors.ts` so data-driven summary styling resolves through standard Tailwind utilities.

Apply the warning treatment to:

- Status text and alert icon in desktop bill rows.
- Status text and alert icon in mobile bill rows.
- Bill amount when the occurrence is `Due Soon` or `Due Today`.
- The existing “Due Soon” aggregate row in the recurring-bills summary and its overview-card border.

The summary keeps its current aggregation: its “Due Soon” row includes unsettled due-soon, due-today, and overdue occurrences, and it receives the warning treatment as requested.

## Safeguards

- A missing assigned-card record must not fail selector rendering; use the original bill due date as a safe fallback.
- Settled payment rows always override all derived status logic.
- No money movement, statement amount, due occurrence, or persistence rule changes as part of this work.
- Existing payment code continues using the original occurrence date and the same statement-cycle attachment calculation.

## Tests

Extend selector and schedule coverage to verify:

- Non-card bills retain their original due date and current statuses.
- A card-assigned bill displays the payment due date of its attached statement cycle.
- Card-assigned statuses correctly transition through upcoming, due-soon, due-today, and overdue based on that statement payment due date.
- Virtual statement cycles produce the same effective status behavior.
- Paid and skipped card-assigned occurrences remain settled.
- Summary totals and counts use enriched statuses while retaining the combined “Due Soon” aggregate.

Run the recurring-bill tests and formatting after implementation.
