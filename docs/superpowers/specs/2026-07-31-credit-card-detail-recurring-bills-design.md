# Credit-Card Detail Recurring Bills — Design

**Date:** 2026-07-31  
**Status:** Awaiting spec review

## Summary

Add a Recurring Bills section on Credit Card Details that lists monthly and
yearly bills assigned to that card (including archived), with edit-only row
actions and a header link into the Recurring Bills page filtered by card.
Scheduled Charges remain the home for one-time card charges.

## Goals

- Show card-assigned recurring obligations on the card detail page without
  opening Recurring Bills first.
- Keep Scheduled Charges (`one_time`) and Recurring Bills (`monthly` /
  `yearly`) as separate sections.
- Let users edit active bills in place and jump to the full filtered Recurring
  Bills list to manage everything else.

## Non-Goals

- Paying, skipping, or archiving bills from Credit Card Details.
- Merging Scheduled Charges into this list.
- Adding new URL filter parameters (reuse existing `card` on Recurring Bills).
- Changing statement pending-bill lines or reserved-installment math.

## Behavior

On Credit Card Details, list bills where:

- `bill.creditCardId === creditCard.id`
- `bill.frequency` is `monthly` or `yearly`

Include archived bills. Exclude `one_time` bills (they stay in Scheduled
Charges).

When the filtered list is empty, hide the entire Recurring Bills card.

### Row actions

- Active bills: ellipsis menu with **Edit**, opening the existing
  `EditBillDialog` (controlled open, same pattern as Scheduled Charges edit).
- Archived bills: muted styling, no row actions.

### Header manage link

In the section header, place the title and a text link with
`justify-between`:

- Label: `Manage recurring bills`
- Styling: shared `cardActionLinkClasses` + trailing `CaretRightIcon`
- Destination: `/recurring-bills?card=<creditCardId>` (existing URL-only
  `card` filter)

## UI

- Card title: `Recurring Bills`
- Rows mirror Scheduled Charges layout:
  - Primary: bill concept
  - Muted subtitle: `{contact name} · {Monthly|Yearly} · Due {display date}`
    (use current occurrence due date when present, otherwise `firstDueDate`)
  - Amount as signed outgoing `MoneyAmount`
  - Occurrence status label with the same status color treatment used by
    Scheduled Charges
- Archived rows use muted opacity; omit the overflow menu.
- Sort: active bills first by next due date ascending, then archived bills by
  next due date ascending.
- Page section order: Scheduled Charges (if any) → Recurring Bills (if any) →
  Statements → Payment History.

## DESIGN.md Updates

Under Credit Cards, document:

- Credit Card Details shows a Recurring Bills section for monthly/yearly bills
  assigned to the card, including archived (muted, no actions).
- Active rows offer edit-only actions via the shared bill dialog.
- The section header includes `Manage recurring bills`, which opens Recurring
  Bills filtered by that card.
- One-time card charges remain in Scheduled Charges only.

## Testing

- Card with a monthly/yearly bill renders the Recurring Bills section and row.
- `one_time` card bills do not appear in Recurring Bills.
- Header link `href` is `/recurring-bills?card=<id>`.
- Archived card bill renders muted without an Edit action.
- Card with no monthly/yearly bills does not render the Recurring Bills
  heading.

## Out of Scope Follow-Ups

- Creating a recurring bill from Credit Card Details.
- Exposing pay/skip/archive on the detail page.
- Showing finite installment progress (`Payment N of M`) in the subtitle.
