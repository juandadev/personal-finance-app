# Form Validation Standardization Design

## Summary

Standardize all existing forms around TanStack Form for client form state and
Zod for validation. Every form validates on submit first, shows field-level
danger states and helper text for invalid fields, and renders a meaningful
form-level message above the primary submit button and below the main form
fields. After the first failed submit, validation updates live as users edit.

This design covers all current forms: auth forms, finance dialogs, transaction
library dialogs, embedded quick-create panels, pot transfer forms, and admin
action/status surfaces where applicable. Destructive confirmations are not
data-entry forms, but their status messages should use the same visual status
component for consistency.

## Goals

- Use TanStack Form as the app's standard client form engine.
- Use Zod schemas for client validation and preserve server-side Zod validation
  as the final authority.
- Show a form-level validation or submit error message above the primary submit
  button.
- Highlight each invalid or missing field with `aria-invalid`, destructive
  border/focus styling, and specific helper text.
- Validate on submit for fresh forms, then validate live after the first failed
  submit.
- Reset previous form and field errors before each submit attempt, then validate
  again from the current values.
- Update `DESIGN.md` so the form validation direction becomes part of the app's
  UI/UX source of truth.

## Non-Goals

- Do not change the finance domain model or server action result shape except
  where field-error mapping needs clearer messages.
- Do not introduce a second long-term form system alongside TanStack Form.
- Do not redesign dialog layouts beyond the validation, helper text, and status
  placement standard.
- Do not make every field validate before the first submit attempt.

## Current State

The repo already has Zod validation in auth and finance server actions. Auth
actions return `fieldErrors`, and finance actions return `{ ok, message,
fieldErrors }` for Zod failures.

Most client forms currently use local `useState` plus hand-written submit
handlers. Some forms show field errors, while others only show a general status
message. Submit messages are often rendered after the submit button, which does
not match the desired standard. The existing `components/ui/form.tsx` wrapper is
tied to `react-hook-form`, and `package.json` does not yet include TanStack
Form.

## Architecture

Add TanStack Form as the single client form engine and create a thin app-specific
form foundation. The foundation should live in `components/ui` and `lib/forms`
or an equivalent local structure that keeps product forms from repeating
low-level TanStack wiring.

The foundation should include:

- An app form wrapper that centralizes submit handling, error reset, and submit
  status placement.
- Field components or field adapters for text, password, currency, select,
  textarea, date picker, and theme select controls.
- A shared field helper/error slot that shows muted helper text normally and
  destructive helper text when invalid.
- A shared `FormStatusMessage` component for error, success, and info states.
- Utilities for mapping Zod errors and server action `fieldErrors` into
  TanStack field state.
- Reusable Zod helpers for common app rules.

The existing `components/ui/form.tsx` should be replaced or renamed during
implementation so the app does not carry both a React Hook Form wrapper and a
TanStack Form wrapper with the same conceptual role.

## Validation Behavior

Each form follows this lifecycle:

1. A fresh form does not show validation errors while the user is entering data.
2. On submit, clear previous form-level and field-level errors.
3. Run Zod validation against the current form values.
4. If validation fails, show field-level helper text, mark invalid controls with
   `aria-invalid`, and show the form-level message above the primary submit
   button.
5. After the first failed submit, validate live as users edit fields so errors
   update or disappear.
6. On a later submit attempt, clear the previous errors again and validate from
   the current values.
7. If client validation passes, call the existing server action or finance
   action.
8. If the action returns `fieldErrors`, map them back to fields and show the
   standard form-level message.
9. If the action returns only a message, render that message in the submit-area
   status slot.

The default form-level validation message is:

> Check the highlighted fields and try again.

More specific server or network failures should use the returned action message
in the same submit-area slot.

## Visual And Accessibility Standard

The form-level status message belongs below the main form fields and above the
primary submit button. It should use the existing calm status-message treatment:
a rounded tokenized container, destructive text and border for errors, and
`role="alert"` for error states.

Invalid fields must not rely on color alone. Each invalid field needs:

- `aria-invalid="true"` on the input, select trigger, date trigger, or equivalent
  control.
- `aria-describedby` pointing at the active helper or error text.
- A destructive border/focus state using existing tokens.
- A specific sentence-case helper message that tells the user what to fix.

Existing helper text remains muted when the field is valid. When the field is
invalid, the helper area is replaced by the validation message unless a component
needs to show both, such as a password rule or character count. In those cases,
both messages must be associated with the field and remain easy to scan.

## Form Coverage

The first implementation pass should migrate these surfaces:

- Login form.
- Sign-up form.
- Add and edit budget dialogs.
- Add and edit pot dialogs.
- Add and withdraw pot transfer dialogs.
- Add and edit transaction dialog.
- Quick-create category and contact panels inside the transaction dialog.
- Transaction library category and contact dialogs.
- Admin action cards or server-action status surfaces where form/status behavior
  applies.

Delete confirmations should keep using alert dialogs, but their status messages
should move to the shared status component when touched.

## Schema And Data Flow

Keep schemas close to the UI boundary while reusing shared schema helpers.
Suggested helpers include:

- Required trimmed string with a field-specific message.
- Currency string parser that validates positive dollar values and transforms to
  cents.
- Required select or UUID value.
- Theme color enum based on existing theme color tokens.
- Optional notes with trimming and maximum length.
- Optional future due date.
- Transaction amount and date rules.

On successful client validation, submit handlers map parsed values into the
existing auth or finance action payloads. Server-side validation remains the
final authority because it protects persisted data and handles stale client
state. Client-side validation exists to improve feedback and reduce avoidable
round trips.

## Dependency Direction

Add `@tanstack/react-form`.

Remove `react-hook-form` and `@hookform/resolvers` only after all imports of the
existing React Hook Form wrapper are gone. If the old shadcn form wrapper is no
longer used, replace it with the TanStack-oriented wrapper instead of leaving two
form patterns in the app.

## `DESIGN.md` Update

Update the `Forms and Dialogs` section in `DESIGN.md` with these principles:

- TanStack Form is the standard client form engine.
- Zod is the standard validation schema layer.
- Forms validate on submit first, then validate live after a failed submit.
- Submit attempts clear stale errors before re-validating.
- Field validation errors use destructive helper text and invalid control state.
- The form-level status message appears above the primary submit button and
  below the main form fields.
- Validation and error copy uses sentence case, explains what to fix, and avoids
  vague messages.

## Testing And Verification

Implementation should verify the shared form layer first, then representative
product flows.

If the repo has or gains a test setup, cover:

- Zod schema helpers, especially currency-to-cents parsing.
- Mapping Zod and server action `fieldErrors` into field errors.
- Submit-first validation followed by live validation after the first failed
  submit.
- Error reset and re-validation on repeated submit attempts.

Manual verification should cover:

- Login and sign-up.
- Add and edit budget.
- Add and edit pot.
- Add and withdraw pot money.
- Add and edit transaction.
- Quick-create category and contact inside the transaction dialog.
- Add and edit transaction library category/contact.
- Admin action-card status behavior.
- Keyboard navigation, focus states, labels, helper associations, and responsive
  layout in dialogs and auth pages.

Run `bun run format` after documentation and implementation edits. Run lint and
build during implementation planning or implementation to catch type and
integration issues.
