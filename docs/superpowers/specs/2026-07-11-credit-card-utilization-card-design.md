# Credit-Card Utilization Card — Design

**Date:** 2026-07-11  
**Status:** Awaiting spec review

## Summary

Replace the credit-card page tile's four boxed metrics with an at-a-glance
horizontal credit-utilization bar and a budget-card-style detail layout. The
bar makes the relationship between the current statement, future installment
commitments, and available credit easy to scan without changing any card
actions, menus, persistence, or navigation.

## Goals

- Show each active card's credit utilization against its full credit limit.
- Use the user-selected card color for the current statement segment.
- Show only the installment amount that is not already included in the
  current statement, so credit usage is never double-counted.
- Leave available credit as the unfilled remainder of the progress track.
- Arrange the remaining financial details with the visual hierarchy used in
  budget cards.
- Preserve the existing card heading, due-status treatment, ellipsis menu,
  and action buttons.

## Non-Goals

- Change credit-card dialogs, available menu items, or card actions.
- Change statement cycles, payment processing, recurring-bill scheduling, or
  persisted financial data.
- Redesign the individual credit-card detail page.
- Add a circular chart, new theme colors, or an additional data model.

## Card Layout

Each tile keeps its existing heading: card badge, nickname, issuer/network,
last four digits, due-status label, and item ellipsis menu.

The four `Metric` containers are replaced with:

1. A full-width horizontal utilization bar.
   - **Current Statement:** first segment, using the card's selected theme
     color.
   - **Reserved Installments:** second segment, using an existing neutral
     secondary treatment distinct from the identity color.
   - **Available Credit:** unfilled track after those segments.
2. A budget-card-style detail row beneath the bar:
   - Current Statement
   - Reserved Installments
   - Available Credit
3. Concise muted supporting metadata for credit limit, closing day, payment
   due day, and the current statement period/due date. The existing
   no-activity message remains when no statement is available.
4. The existing `See Details`, payment, and close-statement controls in their
   current position and with their current behavior.

On small screens, the header and financial details wrap or stack without
truncating labels or values. At wider widths, the detail values use a balanced
multi-column layout comparable to the budget card.

## Credit Accounting

The bar's maximum is `creditLimit`.

```text
statement segment = currentStatementAmount
reserved segment = reservedInstallmentAmount
available credit = creditLimit - statement segment - reserved segment
```

`reservedInstallmentAmount` is already the non-overlapping portion: the
selector omits recurring-bill occurrences that are pending in the current
statement cycle before it sums future installments. Therefore, if a $10,000
statement contains $5,000 from $20,000 total installments, the bar displays a
$10,000 statement segment and a $15,000 reserved-installment segment.

The view model's `availableCredit` must remain derived from these same
non-overlapping segments. Segment widths are clamped to the bar range for
rendering safety; adjacent formatted values communicate the actual monetary
amounts.

## Components and Accessibility

Add a reusable `CreditUtilizationBar` product component. It accepts the credit
limit, current statement amount, non-overlapping reserved installment amount,
and the card theme color. It owns the segment-width calculation and exposes
progress-bar semantics, including numeric context through accessible text.

The card page composes the bar with its financial detail and metadata blocks.
It does not construct theme classes dynamically; it resolves the chosen card
color through `lib/theme-colors.ts`.

The bar does not communicate meaning by color alone: the detail values label
the statement, reserved installments, and available credit. It supports
reduced motion if the fill entrance is animated, consistent with the existing
design motion rules.

## Testing

Add or extend selector tests for:

- A statement with no reserved installments.
- Future installments with no current statement.
- An installment total that partially overlaps the current statement, ensuring
  the displayed reserved amount excludes the overlap.
- Fully utilized and over-limit card amounts, including safe visual clamping.
- Available credit equal to the limit for a card with no balance or reserves.

Verify the tile visually at mobile and desktop widths, including long card
names and each supported theme color. Run formatting after implementation.
