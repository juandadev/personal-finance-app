# Credit-Card Statement Transactions Deep-Link — Design

**Date:** 2026-07-31  
**Status:** Awaiting spec review

## Summary

Replace the Credit Card Details “Card Transactions” list with a per-statement
quick filter that opens Transactions already scoped to that card and statement
period. Users can inspect, edit, and remove activity for one period without a
second, incomplete list on the detail page.

## Goals

- Let users jump from a statement row to Transactions filtered by that credit
  card and inclusive statement period.
- Keep the control clear: a `View statement transactions` text link using the
  shared card action-link styling.
- Remove the Card Transactions card from Credit Card Details so the detail page
  no longer duplicates a transaction list.

## Non-Goals

- Adding visible Transactions filter controls, chips, or summaries for `card`,
  `from`, or `to` (those remain URL-only per the URL filtering design).
- Changing statement cycle math, payment/close dialogs, or persistence.
- Surfacing pending recurring-bill lines on the Transactions page.
- Changing Payment History or scheduled-charge sections on card details.

## Behavior

On Credit Card Details → Statements, each statement row may show a quick-filter
control when that statement has activity worth inspecting:

- Show when `amount > 0` or `pendingBillsAmount > 0`.
- Hide when both are zero.

The control is a link (not a mutation) to:

```text
/transactions?card=<creditCardId>&from=<periodStart>&to=<periodEnd>
```

- `card` is the current credit card’s ID.
- `from` and `to` are the statement’s `periodStart` and `periodEnd` as ISO
  `YYYY-MM-DD` dates.
- Filtering uses the existing Transactions URL contract: inclusive posted-date
  range and `transaction.creditCardId` match.
- Default sort and page apply; no other query params are set.

A statement that only has pending bills (no posted card purchases yet) may still
show the control; Transactions can correctly render its empty/no-results state.
Reset Filters on Transactions clears the deep-link state, matching other
URL-only deep-links such as budget “See All”.

## UI

- Place the control in the left column under the period range and due-date
  text, not beside Pay / Close. Stack that column with vertical
  `justify-between` (and stretch the row on `sm+`) so the link sits apart from
  the dates.
- Use a `View statement transactions` text link with the shared
  `cardActionLinkClasses` treatment and trailing `CaretRightIcon`.
- Remove the entire Card Transactions card (pending bill lines + unscoped card
  purchase list) from the detail page.
- Remaining detail sections stay in order: Statements, then Payment History /
  scheduled charges as they exist today.

## DESIGN.md Updates

Under Credit Cards, document:

- Each statement with purchase amount or pending bills exposes a per-statement
  “view transactions” deep-link to Transactions for that card and period.
- Credit Card Details no longer shows a Card Transactions list; statement-scoped
  review happens on Transactions via that deep-link.

## Testing

- Eligible statement renders a `View statement transactions` link whose `href`
  includes the card ID and the statement’s `from` / `to` period bounds.
- Zero-activity statement (`amount` and `pendingBillsAmount` both zero) does not
  render the control.
- Credit Card Details no longer renders the Card Transactions heading/section.
- Existing URL-filter behavior for `card` / `from` / `to` remains the source of
  truth; no new parser work is required unless a regression appears.

## Out of Scope Follow-Ups

- Exposing card or date-range controls in the Transactions filter row.
- Filtering Transactions by statement ID instead of posted-date bounds.
- Linking statement payment rows in Payment History to related payment
  transactions.
