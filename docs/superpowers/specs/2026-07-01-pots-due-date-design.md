# Pots Due Date Design

## Overview

The Pots module will support an optional due date for each savings pot. A due
date lets users track when they need to finish saving for a goal without making
every pot deadline-driven.

This design adds a nullable database field, updates the add and edit pot forms,
and displays a remaining-time label on pot cards when a due date is present.

## Approved Scope

- Add an optional due date to Pots.
- Store the due date as a calendar date, not a timestamp.
- Allow users to set the due date when creating a pot.
- Allow users to add, change, or clear the due date when editing a pot.
- Reject today and past dates. Due dates must be future dates.
- Display remaining time on the Pot card when a due date is set.
- Use `date-fns` utilities for date display and remaining-duration formatting.
- Use the shadcn/Radix Date Picker pattern for date selection.

Out of scope:

- Overdue state handling.
- Due-soon warnings or special styling.
- Notifications or reminders.
- Sorting, filtering, or grouping pots by due date.
- Time-of-day selection.

## Data Model

Add `due_date date null` to the `pots` table.

Existing rows will keep `due_date` as `null`. The column is nullable because not
all savings pots have a finish date.

The field should be represented in application types as an optional or nullable
ISO calendar date string:

- Database record: `PotRecord.due_date: string | null`
- View model: `Pot.dueDate?: string`

Use `YYYY-MM-DD` as the application boundary format. The app should not store or
compare times for this feature.

## Data Flow

The due date follows the existing Pots data path:

1. `pots.due_date`
2. `PotRecord.due_date`
3. `potColumns` query selection and all pot mutation `RETURNING` clauses
4. Server Action validation
5. Finance provider optimistic updates
6. Finance selector mapping
7. `Pot.dueDate`
8. Add/Edit dialogs and Pot card rendering

Create, update, deposit, and withdraw responses should all return the due date so
the client state does not accidentally drop it after a pot mutation.

Clearing a due date in the Edit Pot dialog must persist `null`. The update path
must distinguish between "no update was provided" and "clear the current due
date"; a plain `COALESCE($value, due_date)` update is not enough for this field.

## Validation

Due dates are optional. When provided, they must be future calendar dates.

Validation should run in two places:

- The client should prevent users from selecting today or past dates in the date
  picker and show an inline error if an invalid value is submitted.
- The server action should reject today and past dates so direct calls cannot
  bypass the client.

The comparison is based on calendar dates. "Future" means strictly after today
according to the server at the time of submission. Client validation should
mirror this rule for immediate feedback, but the server result is authoritative.

## Add And Edit Pot Forms

Add an optional `Due Date` field below `Target` and before `ThemeSelect` in both
`AddPotDialog` and `EditPotDialog`.

The field should follow the shadcn Date Picker composition:

- `Popover`
- `PopoverTrigger asChild`
- outline `Button` trigger
- `PopoverContent`
- `Calendar mode="single"`

Selected dates should display with `format(date, "PPP")`. Empty state copy
should be concise, such as `Select a due date`.

The `Calendar` should disable today and past dates. When a user selects a valid
date, the popover should close and the form should store the selected date as
`YYYY-MM-DD`.

Because the field is optional, the form should include a low-emphasis way to
clear a selected date. Use a small text action such as `Clear date` near the
picker.

The form should continue using visible labels, tokenized shadcn primitives, and
inline status messages consistent with `DESIGN.md`.

## Pot Card Display

When `pot.dueDate` is present, show a muted metadata label on the Pot card near
the existing progress and target context.

Example:

`Due in 2 months, 3 days`

The label should:

- Use `date-fns` date utilities.
- Compare from the user's current browser calendar date to the stored due date
  for display.
- Keep units ordered as years, months, days.
- Omit zero-value units.
- Use correct singular and plural unit labels.

Examples:

- Tomorrow: `Due in 1 day`
- Two months and three days away: `Due in 2 months, 3 days`
- One year away: `Due in 1 year`

No due date label appears when the pot has no due date.

## Error Handling

Invalid form submissions should use the existing inline form error pattern.

Server action errors should return normal `{ ok, message }` results through the
existing finance action wrapper so the dialog can display the error without
crashing.

If a date becomes invalid between opening the dialog and submitting it, the
server validation response should be shown in the dialog.

## Testing

Focused testing should cover:

- Creating a pot without a due date still works.
- Creating a pot with a future due date persists and renders the card label.
- Editing a pot can add or change a due date.
- Editing a pot can clear a due date and remove the card label.
- Today and past dates are rejected by client and server validation.
- Deposit and withdraw mutations preserve the due date in client state.
- The remaining-duration formatter omits zero units and keeps years, months,
  days order.

## Implementation Notes

The project already has local `Calendar`, `Popover`, and `Field` primitives, so
the date picker can be composed from existing shadcn source components rather
than introducing a separate date picker dependency.

Use existing finance patterns before adding new abstractions. A small local
helper for converting between `Date` objects and `YYYY-MM-DD` strings is useful
if both Add and Edit dialogs need it. A small duration formatter is useful for
keeping the Pot card simple and testable.
