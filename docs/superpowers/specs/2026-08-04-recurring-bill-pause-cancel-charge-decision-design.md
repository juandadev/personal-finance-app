# Recurring Bill Pause, Cancel, and Statement Charge Decision — Design

**Date:** 2026-08-04  
**Status:** Superseded by `docs/superpowers/specs/2026-08-05-recurring-bill-end-of-period-cancel-pause-design.md`

## Summary

Canceling (archiving) a recurring bill currently sets `archived_at` to now and stops later occurrences, but it does not ask what to do when a card-assigned charge is already sitting on an unpaid statement. This design adds that charge decision to cancel, introduces a separate **pause** lifecycle with the same decision, lists paused bills after active ones (before archived), and requires a new start date when re-enabling a paused bill.

## Goals

- When canceling or pausing a **card-assigned** bill whose current unsettled occurrence attaches to an **unpaid** statement, ask whether to remove that charge or keep it and stop only later ones.
- Removing an unpaid-statement charge uses the existing skip path.
- Add pause as a distinct, resumable inactive state (`paused_at`), separate from archive/cancel (`archived_at`).
- Show list sections in order: Active → Paused → Archived.
- Resume requires a new `first_due_date` (on or after today) and is an explicit exception to the “lock first due date once payments exist” rule.
- While paused or archived, hide the bill from overview due aggregates, except a **kept** unsettled card charge that must still appear on statement / pay-statement surfaces until settled.

## Non-Goals

- A separate `schedule_cutoff_date` column (approach 1: reuse inactive timestamps + existing cutoff helper).
- Pause reasons, pause end dates, or auto-resume.
- Changing frequency on resume.
- Resuming or un-archiving cancelled bills.
- Charge decision for non-card bills.
- Removing charges from statements that are already paid.
- Cron or materializing future occurrences.

## Lifecycle model

Inactive states are mutually exclusive:

| State    | `paused_at` | `archived_at` | Resumable |
| -------- | ----------- | ------------- | --------- |
| Active   | null        | null          | —         |
| Paused   | set         | null          | yes       |
| Archived | null        | set           | no        |

Rules:

- Pause and archive cannot both be set. Archiving a paused bill clears `paused_at` and sets `archived_at`.
- Delete rules stay unchanged: delete only when the bill has zero payment rows; otherwise archive/cancel.
- Frequency remains locked once any payment row exists. Resume may update `first_due_date` even when payments exist; that is the only new unlock path.

## Schema

Add `paused_at timestamptz` nullable on `recurring_bills`.

Enforce mutual exclusion with a check constraint:

- `paused_at IS NULL OR archived_at IS NULL` (both null allowed for active).

No new cutoff column. Schedule generation continues to derive a calendar cutoff from the inactive timestamp via the existing archive-cutoff helper (extended to accept pause the same way as archive).

## Statement charge decision

### When the prompt is required

Only when **all** of the following are true:

1. The bill has `credit_card_id` set.
2. There is a current unsettled occurrence (not paid/skipped).
3. That occurrence’s attached statement cycle (existing `getBillOccurrenceStatementCycle` rules) is **unpaid**.

Otherwise cancel/pause proceeds with a simple confirmation and no charge choice.

If the statement is already paid, or the occurrence is already settled, do not offer remove: paid statement history stays intact.

### Choices

**Remove this charge and stop later ones**

1. Skip the current unsettled occurrence (same persistence rules as today’s Skip action).
2. Set `paused_at` or `archived_at` to now so the schedule cutoff is today (existing timezone rules).
3. No later unsettled occurrences are generated.

**Keep this charge; stop only later ones**

1. Do not skip or pay the occurrence.
2. Set the inactive timestamp so the existing cutoff helper resolves to that occurrence’s **due date** (not “today”). This preserves the charge when the vendor due date is still in the future but the occurrence is already on the open statement.
3. Occurrences after that due date are not generated while inactive.
4. The kept occurrence remains on card statement pending balance and pay-statement flows until paid or skipped.

### Modes without a decision

Non-card bills, or card bills that do not meet the prompt criteria: set `paused_at` / `archived_at` to now (cutoff = today). Archive always clears `paused_at`.

## Pause, cancel, and resume flows

### Cancel (archive)

- Product action may be labeled **Cancel**; persistence remains archive (`archived_at`).
- Runs the shared charge-decision path when required.
- History and settled payments stay intact.
- Not resumable.

### Pause

- Sets `paused_at` only (bill must be active, not archived).
- Same charge-decision path as cancel when required.
- Paused rows: muted treatment similar to archived; actions **Resume** and **Cancel**.
- No Pay/Skip from the recurring-bills row menu while paused. Kept charges are handled on card statement / pay-statement surfaces.

### Resume

- Allowed only when `paused_at` is set and `archived_at` is null.
- Requires `first_due_date` with validation: date present and **≥ today**.
- Prefill a sensible default (next occurrence of the previous day-of-month on or after today, otherwise today), but the user must confirm an editable value.
- Clears `paused_at` and writes the new `first_due_date`.
- Does not rewrite historical `recurring_bill_payments`. New occurrences step from the new anchor. Finite `total_payments` continues to count existing settled rows toward progress and floors.

## UI

Follow `DESIGN.md` patterns (`AlertDialog` for confirmations, existing bill dialog patterns for resume date).

- Active bill actions: **Pause** and **Cancel** (archive).
- Charge prompt: name the card and explain the open-statement charge; offer Keep vs Remove, then confirm.
- List sections on the recurring bills page: **Active**, then **Paused**, then **Archived**.
- Resume dialog: required start date field; submit re-enables the bill.

## Selector and surface behavior

- Active filters exclude paused and archived bills.
- Overview recurring-bills due aggregates and similar due summaries omit paused/archived bills.
- Exception: a kept unsettled card occurrence still contributes to the assigned card’s statement pending obligations and pay-statement materialization until settled.
- Credit card detail recurring sections follow the same exception for kept charges; otherwise paused/cancelled bills do not generate new pending lines.

## Server behavior

Shared inactive mutation accepts:

- `mode: 'pause' | 'archive'`
- When the server determines a charge decision is required: `currentChargeAction: 'keep' | 'remove'`

Server steps:

1. Load bill, payments, and (if card-assigned) card + statements.
2. Resolve current unsettled occurrence and unpaid-statement attachment.
3. Validate client decision against current state (reject stale remove if settled or statement paid).
4. Apply remove (skip then inactive) or keep (inactive with due-date cutoff) or simple inactive.
5. Archive clears `paused_at`.

Resume mutation:

1. Reject unless paused and not archived.
2. Validate `first_due_date ≥ today`.
3. Clear `paused_at` and update `first_due_date`.

Errors (user-facing):

- Already paused / already archived / not paused on resume.
- Remove requested but occurrence settled or statement paid — ask to retry without remove.
- Invalid or past resume start date.

## Testing

- Prompt detection: card + unsettled + unpaid statement → required; non-card / paid statement / settled → not required.
- Remove: skip row created; bill inactive; charge leaves statement pending; later occurrences absent.
- Keep: occurrence remains on statement pending; later occurrences absent; cutoff equals occurrence due date even when that date is after today.
- Pause vs archive mutual exclusion; archive-from-paused clears pause.
- Resume: rejects past dates; clears pause; new schedule from new anchor; payment history unchanged; `first_due_date` unlock only on resume.
- List order Active → Paused → Archived.
- Overview due aggregates exclude paused/archived bills entirely; kept charges still appear only on card statement / pay-statement surfaces.
- Regression: simple archive/pause without prompt; existing skip, pay, and pay-statement flows unchanged outside this path.

## Implementation notes

- Extend schedule cutoff handling so pause uses the same helper path as archive (one “inactive cutoff” concept in code, two lifecycle timestamps in data).
- For keep-charge, prefer setting the inactive timestamptz so `getArchiveCutoffDate` (or its shared successor) yields the occurrence due date in the cutoff timezone already used by archive — avoid a new column in this pass.
- Update `DESIGN.md` recurring-bills copy for Pause / Cancel / Resume and the charge-decision dialog before UI implementation.
