# Credit Card Annuality — Design

**Date:** 2026-07-31  
**Status:** Approved  
**Amends:** [Credit Cards — Design](./2026-07-06-credit-cards-design.md),
[Credit Card Total Pending — Design](./2026-07-11-credit-card-total-pending-design.md),
[Finite Recurring Bill Credit Reservation — Design](./2026-07-08-finite-recurring-bill-credit-reservation-design.md)

## Summary

Add an optional card-level **annuality** (annual fee) configuration so
automatic yearly charges appear correctly on credit card statements. The user
sets a full annual amount, an anniversary month/day, and a payment count
(default 1). When the count is greater than 1, the fee splits across consecutive
statement cycles starting with the cycle that contains the anniversary date.
Equal installments are the default; the user may override individual amounts for
the current anniversary year only. Installments surface as pending statement
lines (same path as card-assigned bills) and materialize as real purchases when
the statement is paid or closed.

## Goals

- Configure annuality on the credit card itself (not as a recurring bill).
- Support a single yearly charge or a multi-payment split of one annual amount.
- Reflect due installments on the correct statement cycle balances (Total
  Pending) and reserve future unpaid installments (Reserved Installments /
  available credit).
- Allow current-year per-installment amount overrides that reset to equal splits
  on the next anniversary.
- Keep mid-year config edits from rewriting already-posted or already-pending
  materialized history—only future unpaid installments recalculate.

## Non-Goals

- Modeling annuality as a recurring bill or generating linked bill rows.
- Lasting multi-year override templates (overrides are per anniversary year).
- Background jobs / cron to post fees; derivation stays read-time like bills.
- Partial statement payments or paying an annuality installment independently of
  the statement.
- Waiving, skipping, or pro-rating a fee mid-cycle beyond amount/count edits.
- International fee tax lines or issuer-specific fee product catalogs.
- Payment counts above 12 in v1.

## Core Decisions

- **Approach:** Card config + derived installments (Approach 1). Persist the
  annuality rule on `credit_cards` and sparse current-year overrides in
  `credit_card_annuality_overrides`. Derive installment dates and amounts at
  read time; do not create `recurring_bills` rows.
- **Anniversary:** User-configured month and day. Day clamps for short months
  using the same rules as closing / due days.
- **Schedule start:** First installment lands on the statement cycle that
  contains the anniversary date; remaining installments use the next
  consecutive statement cycles.
- **Default split:** Equal cents across N payments; remainder cents on the last
  installment. When N = 1, the full amount hits that anniversary cycle once per
  year.
- **Overrides:** Optional per installment index for a given `anniversary_year`.
  Apply only to that year; the next anniversary ignores prior overrides and
  regenerates equal splits from the card’s full amount and payment count.
- **Statement integration:** Due unpaid installments are pending statement lines
  (label “Annuality”). Paying or closing the statement materializes them as
  `credit_card` purchases, same as pending card bills.
- **Mid-year edits:** Changing amount or payment count never alters materialized
  purchases. All non-materialized installments (including unpaid pending lines on
  open statements) recompute from the new rule and overrides.
- **Optional:** Off by default (`annuality_enabled = false`).
- **UI placement:** Rule fields live in Add/Edit Card. Current-year installment
  amounts edit inline on the card detail schedule section.

## Terminology

- **Annuality:** The card’s annual fee configuration and its derived charges.
- **Anniversary date:** Configured month/day that anchors each yearly schedule
  (clamped when needed).
- **Anniversary year:** Calendar year of the first installment in a given yearly
  schedule (used as the override scope key).
- **Installment index:** 1-based position in that year’s N-payment schedule.
- **Pending annuality line:** Derived obligation on a statement cycle that has
  not yet been materialized into a purchase transaction.

## Persistence

### `credit_cards` (new columns)

| Column                        | Type                             | Notes                                |
| ----------------------------- | -------------------------------- | ------------------------------------ |
| `annuality_enabled`           | `boolean NOT NULL DEFAULT false` | Master switch                        |
| `annuality_amount_cents`      | `integer NULL`                   | Required when enabled; must be > 0   |
| `annuality_anniversary_month` | `smallint NULL`                  | 1–12 when enabled                    |
| `annuality_anniversary_day`   | `smallint NULL`                  | 1–31 when enabled; clamp on use      |
| `annuality_payment_count`     | `integer NULL`                   | ≥ 1 and ≤ 12 when enabled; default 1 |

When `annuality_enabled` is false, the other annuality columns may be null or
retained for re-enable convenience; derivation ignores them until enabled again.

### `credit_card_annuality_overrides`

| Column                      | Type                | Notes                                     |
| --------------------------- | ------------------- | ----------------------------------------- |
| `id`                        | uuid / text         | Primary key (match project convention)    |
| `user_id`                   | text                | Owner                                     |
| `credit_card_id`            | fk → `credit_cards` | Cascade on card delete                    |
| `anniversary_year`          | integer             | Year of that schedule’s first installment |
| `installment_index`         | integer             | 1…N                                       |
| `amount_cents`              | integer             | > 0                                       |
| `created_at` / `updated_at` | timestamptz         | Standard                                  |

Unique: `(credit_card_id, anniversary_year, installment_index)`.

v1 does not require pruning old years’ override rows; derivation simply ignores
years that are not the active schedule under consideration.

## Derivation

For an enabled card and a target anniversary year:

1. Build the anniversary date (clamp day).
2. Resolve the statement cycle that contains that date (existing cycle helpers).
3. Emit N consecutive cycles from that starting cycle.
4. Default amounts: `floor(amount / N)` for indexes `1…N-1`; last gets the
   remainder so the sum equals `annuality_amount_cents`.
5. Apply any override for `(anniversary_year, installment_index)`.
6. Classify each installment:
   - **Pending** on a cycle if that installment is due for the cycle and has not
     been materialized as a purchase yet.
   - **Reserved** if it is a future unpaid installment not already counted as a
     pending line on an unpaid statement.

Materialization: extend the existing pay/close statement path that turns pending
card-bill lines into `credit_card` purchases so it also materializes pending
annuality lines. An installment is materialized when that generated purchase
exists for its statement cycle; derivation then omits it from pending/reserved.
Do not invent a separate pay-annuality flow.

### Mid-year recalculation

When amount or payment count changes:

- **Materialized purchases never change.**
- Non-materialized installments (pending on open statements or only reserved)
  fully recompute from the new rule plus current-year overrides, so visible
  unpaid pending amounts may update.
- If N shrinks, drop trailing non-materialized indexes.
- If N grows, append new indexes. Re-split
  (`annuality_amount_cents` − sum of materialized amounts this anniversary year)
  equally across all non-materialized slots (remainder on the last), then re-apply
  any overrides that still target valid indexes. Year total must remain
  materialized sum + non-materialized sum = `annuality_amount_cents`.

## Balances & forecast

- Statement displayed `totalAmount` includes pending annuality lines for that
  cycle (alongside purchases and pending card bills).
- **Total Pending** includes those amounts on unpaid statements.
- **Reserved Installments** includes future unpaid annuality installments not
  already in Total Pending.
- **Available Credit** = limit − Total Pending − Reserved Installments
  (unchanged formula; annuality feeds the existing inputs).
- Cash forecast continues to treat card statement obligations as statement-level
  (no separate cash outflow for annuality until the user pays the statement).

## UI

### Add / Edit Card dialog

- Section **Annuality** with toggle “Charge annual fee on this card” (off by
  default).
- When on: full amount, anniversary month/day, payment count (default 1).
- Live preview of the equal-split schedule (e.g. `$400.00 × 3 consecutive
statement cycles`, or full amount once when count is 1).

### Card detail

- When enabled: **Annuality** schedule section for the current anniversary year.
- Rows: installment index, statement cycle label, amount.
- When payment count > 1: amount fields editable for non-materialized
  installments; materialized rows locked.
- Show sum vs full annual amount; Save persists sparse overrides.
- **Reset to equal** clears overrides for the current anniversary year.
- When payment count is 1: compact summary only (no override editor).

### Statements

- Pending line label: **Annuality**.
- Materialized purchase uses the same label (or equivalent merchant/description
  string used elsewhere for generated card charges).

## Validation

- Enabled ⇒ amount > 0; month 1–12; day 1–31; payment count integer 1–12.
- Override save ⇒ each editable amount > 0; sum of all N installment amounts
  (defaults merged with overrides) equals `annuality_amount_cents`.
- Disabling annuality ⇒ stop deriving future pending/reserved lines; leave
  already-posted purchases; current-year overrides may remain unused.

## Testing

- Unit: equal split + remainder on last; cycle sequence from anniversary;
  override merge; mid-year edit leaves materialized purchases intact; reserved
  vs pending classification; clamp anniversary day.
- Selectors / obligations: statement totals, Total Pending, reserved
  installments, available credit include annuality.
- Pay/close statement materializes pending annuality into `credit_card`
  purchases and updates `statement_amount_cents`.
- UI coverage as needed for enable-in-dialog and override-on-detail happy paths.

## DESIGN.md updates

Document card-level annuality in the credit cards section: optional fee, split
payments, pending-line behavior, reserved installments, and UI placement
(dialog rule + detail schedule).
