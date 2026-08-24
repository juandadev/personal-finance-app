# Recurring Bill End-of-Period Cancel / Pause — Design

**Date:** 2026-08-05  
**Status:** Approved for planning  
**Supersedes:** `docs/superpowers/specs/2026-08-04-recurring-bill-pause-cancel-charge-decision-design.md`

## Summary

Canceling a card-assigned recurring bill should match real subscription cancel: the current period’s charge stays, the bill remains Active until the next due date, and that next due date is never charged. Pause uses the same end-of-period timing. Non-card bills still stop immediately. This replaces the previous keep/remove statement-charge prompt on Cancel/Pause.

## Motivating example

- Bill created with first due **28 Jul**, amount 505.58, assigned to a credit card.
- Today is **5 Aug**. The 28 Jul charge is already on the open statement.
- User cancels: bill stays Active with “Cancels on 28 Aug”; the 28 Jul charge remains; no occurrence is generated for 28 Aug.
- Before 28 Aug, Undo returns the bill to a normal Active schedule.
- On/after 28 Aug, the bill materializes to Archived.

## Goals

- Card Cancel/Pause schedule an end on the **next due date strictly after today**.
- Active (ending) bills stay in the **Active** list with a clear end-date signal until that date.
- Current period charge is **always kept** on Cancel/Pause (no keep/remove prompt).
- Undo clears a pending scheduled end while still Active (ending).
- After the end date: Cancel → Archived; Pause → Paused (resumable).
- Non-card Cancel/Pause remain **immediate** inactive from today.

## Non-Goals

- Keep/remove charge decision on Cancel/Pause (removed; Skip stays separate).
- Cron-required materialization (lazy on load/mutate is enough).
- Pause reasons, pause end dates, or auto-resume.
- Changing frequency on resume.
- Un-archiving cancelled bills.
- A separate `schedule_cutoff_date` column beyond the scheduled-end fields below.

## Lifecycle model

| State           | `scheduled_end_*` | `paused_at` | `archived_at` | List section | Undo scheduled end | Resume |
| --------------- | ----------------- | ----------- | ------------- | ------------ | ------------------ | ------ |
| Active          | null              | null        | null          | Active       | —                  | —      |
| Active (ending) | both set          | null        | null          | Active       | yes                | no     |
| Paused          | null              | set         | null          | Paused       | —                  | yes    |
| Archived        | null              | null        | set           | Archived     | —                  | no     |

Rules:

- Pause and archive timestamps remain mutually exclusive.
- Scheduled end fields are both null or both set.
- If `paused_at` or `archived_at` is set, scheduled end fields must be null.
- Cannot schedule an end while already paused or archived.
- Scheduling Cancel while a Pause end is pending (or vice versa) **replaces** `scheduled_end_mode` (and refreshes `scheduled_end_date` from “next due after today”).
- Delete rules unchanged: delete only with zero payment rows; otherwise cancel/archive.
- Product label **Cancel** persists as archive (`archived_at` / `scheduled_end_mode = archive`).

## Card vs non-card behavior

### Card-assigned (`credit_card_id` set)

1. Compute `scheduled_end_date` = next occurrence due date **strictly after today**.
2. Set `scheduled_end_mode` = `archive` (Cancel) or `pause` (Pause).
3. Leave `paused_at` / `archived_at` null.
4. Do not skip, pay, or otherwise settle the current occurrence as part of Cancel/Pause.
5. Stop generating unsettled occurrences with `dueDate >= scheduled_end_date`.
6. Before the end date: **Undo** clears scheduled fields.
7. When `today >= scheduled_end_date`: materialize — Cancel sets `archived_at`, Pause sets `paused_at`, using an inactive timestamp whose cutoff date equals `scheduled_end_date` (not “now” if “now” is later), then clear scheduled fields. This keeps the stop date stable if materialization runs days after the end date.

If there is **no** due date strictly after today (finished finite series, or one-time already due/past): fall back to **immediate** inactive (same as non-card), rather than erroring.

### Non-card

- Cancel/Pause set `archived_at` / `paused_at` to now (cutoff = today).
- No scheduled-end fields.
- No statement-charge prompt.

## Schema

Add to `recurring_bills`:

- `scheduled_end_date date` nullable
- `scheduled_end_mode text` nullable — allowed values `'pause' | 'archive'`

Constraints:

- `(scheduled_end_date IS NULL) = (scheduled_end_mode IS NULL)`
- `paused_at IS NULL OR archived_at IS NULL` (existing)
- If `paused_at IS NOT NULL OR archived_at IS NOT NULL`, then both scheduled fields are null

No new cutoff column. Schedule generation uses:

1. `scheduled_end_date` when present, else
2. inactive cutoff derived from `paused_at` / `archived_at` (existing helper)

Unsettled occurrences with `dueDate >=` that stop date are not generated. Settled paid/skipped history still appears.

## Materialization

Prefer **lazy** materialization in shared load/mutate helpers: if `today >= scheduled_end_date`, write the inactive timestamp so `getInactiveCutoffDate` resolves to that same `scheduled_end_date`, then clear scheduled fields before returning/persisting further changes.

Cron is optional later for list freshness; correctness must not depend on it.

## Mutations

- **Cancel / Pause (card):** write scheduled end fields as above.
- **Cancel / Pause (non-card or no future due):** immediate `archived_at` / `paused_at`.
- **Undo scheduled end:** clear scheduled fields; only valid while Active (ending).
- **Replace pending end:** updating pause↔cancel while ending overwrites mode and recomputes date.
- **Resume:** unchanged for already-Paused bills — require `first_due_date ≥ today`; clears `paused_at`. Undo of a _scheduled_ pause is not Resume.

Remove `currentChargeAction` / keep-remove from Cancel/Pause paths. Skip remains the way to remove an unwanted occurrence charge.

## UI

Follow `DESIGN.md` (`AlertDialog` confirmations; update that doc’s recurring-bills Cancel/Pause copy before UI work).

- Active list includes Active (ending) rows with signal copy: `Cancels on …` / `Pauses on …` (display date via existing format helpers).
- Ending rows are not muted like Paused/Archived.
- Ending actions: **Undo**; replacing mode via Cancel/Pause is allowed without a keep/remove step.
- Card confirm copy: stays active until the next due date; current charge stays on the statement; that end date is not charged.
- Non-card confirm: immediate stop (existing simple copy).
- List sections after materialization: Active → Paused → Archived (unchanged).

## Selector and surface behavior

- Active filters include Active (ending).
- Overview / due aggregates treat ending bills as Active for the **current kept** charge.
- No occurrence is invented on `scheduled_end_date`.
- Kept unsettled card charges still appear on statement / pay-statement / card-detail pending lines until paid or skipped.
- After materialization, paused/archived exclusion rules match today’s inactive behavior.

## Errors (user-facing)

- Already paused / already archived.
- Undo when not Active (ending).
- Stale state after another session materialized or changed the bill — ask to refresh.

## Testing

- Motivating example: Jul 28 first due, cancel on Aug 5 → `scheduled_end_date = Aug 28`; Jul 28 charge remains; no Aug 28 occurrence; Active + “Cancels on…”; Undo restores full schedule.
- On/after Aug 28: lazy materialize → Archived with cutoff still Aug 28 (even if first load is Aug 30); scheduled fields cleared.
- Pause twin path → Paused after end; Resume still works with new start date.
- Non-card → immediate inactive; no scheduled fields.
- No future due → immediate inactive fallback.
- Replace pending pause with cancel (and reverse) updates mode/date.
- No keep/remove UI or server parameter on pause/cancel.
- Regression: Skip, Pay, pay-statement, overview due-for-payment, finite/one-time schedules.

## Relationship to prior design

The 2026-08-04 design introduced `paused_at` and a keep/remove charge decision with immediate inactive + due-date cutoff for “keep.” That pause column remains useful for the **materialized** Paused state. The keep/remove Cancel/Pause decision and immediate archive-for-card end-of-period behavior are superseded by scheduled end fields and always-keep semantics.
