# Admin Dashboard Implementation Plan

## Goal

Implement the approved provisional admin dashboard from
`docs/superpowers/specs/2026-07-05-admin-dashboard-design.md`.

The first version should expose one admin-only manual operation: run the existing
monthly budget close/reset flow through a confirmed admin action.

## Constraints

- Keep the feature reset-only in the visible UI.
- Use `ADMIN_EMAIL_PRIVILEGES` as the temporary server-only admin email setting.
- Never expose `ADMIN_EMAIL_PRIVILEGES` or `CRON_SECRET` to the browser.
- Do not add a database role system or placeholder admin tools.
- Reuse existing app shell, page heading, shadcn/Radix primitives, and finance
  action feedback patterns.
- Preserve the existing cron endpoint and `closeMonthlyBudgets()` behavior.

## Phase 1: Admin Access Helper

Create `lib/admin/access.ts`.

Responsibilities:

- Mark the module as server-only.
- Normalize email values with trim and lowercase.
- Read `process.env.ADMIN_EMAIL_PRIVILEGES`.
- Export a pure comparison helper for testable email checks.
- Export a session-user helper that returns `true` only when the session email
  matches the configured admin email.

Expected behavior:

- Missing environment variable means no admin access.
- Missing session email means no admin access.
- Case and surrounding whitespace should not affect a valid match.

## Phase 2: Admin-Aware Navigation

Update navigation data flow without changing the base product nav for
non-admins.

Implementation steps:

1. Add an `Admin` nav item with `href: "/admin"` and a short icon.
2. Keep the existing `navItems` export as the base list, or add a helper such as
   `getNavItems({ isAdmin })` that appends the admin item.
3. Update `FinanceAppShell` to accept `isAdmin`.
4. Pass the computed nav list into `AppSidebar` and `BottomNav`.
5. Update `AppSidebar` and `BottomNav` props so both render the same
   admin-aware list.
6. Update `app/(app)/layout.tsx` to compute `isAdmin` from the authenticated
   session and pass it into `FinanceAppShell`.

Verification:

- Non-admin users see the current nav unchanged.
- Admin users see `Admin` in desktop sidebar and mobile bottom nav.
- The active nav treatment works when the admin page is open.

## Phase 3: Admin Route And Server Action

Add `app/(app)/admin/page.tsx`.

Responsibilities:

- Load the current authenticated session on the server.
- Reuse the admin access helper.
- Call `notFound()` for non-admin users.
- Render `PageHeading` with title `Admin`.
- Render the monthly budget reset card.

Add `app/(app)/admin/actions.ts`.

Responsibilities:

- Define a server action for manual budget reset.
- Re-check the authenticated session and admin access before mutating.
- Return `{ ok: false, message: "Unauthorized." }` for unauthorized calls.
- Call `closeMonthlyBudgets()` for authorized calls.
- Return a concise success message plus result counts.
- Catch unexpected errors, log them server-side, and return a generic failure
  message.

The action should call `closeMonthlyBudgets()` directly. It should not call the
cron HTTP route or reuse `CRON_SECRET`.

## Phase 4: Reset Card And Confirmation Dialog

Add `components/admin/monthly-budget-reset-card.tsx`.

UI structure:

- A card-style surface that follows `DESIGN.md` spacing, typography, and
  destructive-action rules.
- Title: `Monthly Budget Reset`.
- Body copy explaining that this manually runs the same reset process that
  production cron will handle.
- Button: `Reset Budgets`.
- Confirmation dialog title and copy that explain the action will close the
  previous period, create snapshots, and copy budgets into the next period.
- Destructive confirmation label: `Reset Budgets Now`.
- Cancel label: `Keep Budgets`.

Interaction behavior:

- Disable the destructive action while pending.
- Show `Resetting...` while pending.
- Keep the dialog open on failure.
- Show inline error copy near the action on failure.
- Show concise success copy with result counts on success.

## Phase 5: Focused Verification

Run formatting after implementation.

Run the project checks that are available and relevant:

- `bun run format`
- `bun run lint`

Manual verification checklist:

- With no `ADMIN_EMAIL_PRIVILEGES`, the `Admin` nav item is hidden.
- With `ADMIN_EMAIL_PRIVILEGES` set to the signed-in user's email, the `Admin`
  nav item appears on desktop and mobile.
- Direct `/admin` access as a non-admin returns not found.
- The reset confirmation opens from the admin dashboard.
- Canceling the dialog does not run the reset.
- Confirming the dialog calls the server action and shows result counts.
- A server action failure stays in the dialog and shows an inline error.

## Implementation Order

1. Add the admin access helper.
2. Thread `isAdmin` and admin-aware nav through the app shell.
3. Add the admin page and server action.
4. Add the reset card/dialog component.
5. Run formatting and linting.
6. Perform the manual verification checklist where environment/session setup is
   available.
