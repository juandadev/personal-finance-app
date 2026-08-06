# Recurring Bill Pause / Cancel Implementation Plan

## Goal

Implement the approved design from
`docs/superpowers/specs/2026-08-04-recurring-bill-pause-cancel-charge-decision-design.md`.

## Delivered scope

- `paused_at` lifecycle separate from `archived_at`
- Shared pause/cancel mutation with keep/remove charge decision for card bills on unpaid statements
- Resume with required `first_due_date >= today`
- Active → Paused → Archived list sections
- Overview/summary filters exclude paused and archived bills; kept card charges remain on statement surfaces via schedule cutoff

## Key files

- `db/migrations/026_recurring_bill_pause.sql`
- `lib/finance/recurring-bill-schedule.ts`
- `lib/finance/recurring-bill-charge-decision.ts`
- `lib/finance/queries.ts` (`setRecurringBillInactive`, `resumeRecurringBill`)
- `lib/finance/actions.ts`
- `components/recurring-bills/inactive-bill-dialog.tsx`
- `components/recurring-bills/resume-bill-dialog.tsx`
- `components/recurring-bills/bills-content.tsx`
- `components/recurring-bills/bill-table-row.tsx`
