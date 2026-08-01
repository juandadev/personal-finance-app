# Admin Dashboard Design

## Overview

The app will include a provisional admin dashboard for manual operational tasks
before production launch. The first admin tool will let the configured admin user
manually run the monthly budget close/reset process that production Vercel Cron
will normally trigger.

This design is intentionally narrow. It does not introduce a full role system,
admin user management, or a general operations framework. It adds a temporary
server-side email allowlist through an environment variable and keeps the first
visible dashboard tool focused on resetting budgets.

## Approved Scope

- Add an `/admin` route inside the authenticated app.
- Show an `Admin` navigation item only when the signed-in user's email matches a
  server-only admin email environment variable.
- Use a temporary environment variable named `ADMIN_EMAIL_PRIVILEGES` for the
  privileged email.
- Return `notFound()` when a signed-in non-admin user directly visits `/admin`.
- Start with one visible admin tool: manual monthly budget reset.
- Confirm the reset with a destructive `AlertDialog` before executing it.
- Run the reset through an admin-only Server Action that calls the existing
  `closeMonthlyBudgets()` service.
- Keep the UI reset-only while structuring the code so more manual tools can be
  added later.

Out of scope:

- Database-backed roles or permissions.
- Multiple admin users.
- Admin audit logs.
- Placeholder UI for future admin tools.
- Replacing the existing production cron endpoint.
- Exposing `CRON_SECRET` to the browser or relying on client-side authorization.

## Access Model

Admin access is derived from the authenticated server session. The app already
loads the session in `app/(app)/layout.tsx`, so that layout should determine
whether the current user is an admin by comparing `session.user.email` with
`process.env.ADMIN_EMAIL_PRIVILEGES`.

Comparison should normalize both values by trimming and lowercasing. If the
environment variable is missing or the session email is missing, the user is not
an admin.

The access check should be centralized in a small server-only helper so the app
layout, admin page, and admin Server Actions all share the same rule. Client
components may receive an `isAdmin` boolean for rendering, but they must not be
the source of authority.

## Navigation

The app shell will receive an `isAdmin` flag from `app/(app)/layout.tsx`.
`components/providers/finance-app-shell.tsx` will pass an admin-aware navigation
list to both desktop and mobile navigation.

The admin nav item should:

- Use the label `Admin`.
- Link to `/admin`.
- Appear in both the desktop sidebar and mobile bottom navigation for the admin
  user.
- Be absent for every non-admin user.
- Follow the current active-route behavior used by the other nav items.

The existing `navItems` list can remain the base navigation. The admin item
should be appended only for admin users so the main product navigation stays
unchanged for everyone else.

## Admin Page

The `/admin` page should perform its own server-side admin check and call
`notFound()` when access is denied. This protects direct route visits even if a
client shell bug accidentally renders a link.

The page should use the existing product page structure:

1. `PageHeading` with the title `Admin`.
2. A primary card for `Monthly Budget Reset`.
3. A short explanation of what the reset does and why it is manual before
   production cron is available.
4. A destructive `Reset Budgets` action.

The visible dashboard should not include placeholder cards for future tools.
Future admin actions can be added as additional cards when they are actually
needed.

## Monthly Budget Reset Flow

The reset card should explain that the action runs the same monthly budget
close/reset process as the scheduled production cron job.

Clicking `Reset Budgets` opens a shadcn `AlertDialog`. The dialog should state
that the action will:

- Close the previous budget period.
- Create monthly budget snapshots.
- Copy the previous period's budgets into the next period.

The destructive confirmation action should be labeled `Reset Budgets Now`. The
cancel action should be labeled `Keep Budgets`.

When the admin confirms, the client calls an admin Server Action. The action
must re-check admin access before calling `closeMonthlyBudgets()`. On success,
it returns a structured result with a concise message and the close result
counts. On failure, it returns a normal `{ ok: false, message }` result without
exposing raw database errors.

The dialog should:

- Disable the destructive action while the reset is running.
- Change the action label to `Resetting...` while pending.
- Keep the dialog open on failure and show an inline error message.
- Show a concise success message after a successful run.

Because `closeMonthlyBudgets()` is already idempotent for completed monthly
closes, repeated manual runs should not duplicate completed work. The UI can
surface skipped users in the success details.

## Component Boundaries

Recommended boundaries:

- `lib/admin/access.ts` for server-only admin email comparison and session access
  helpers.
- `app/(app)/admin/page.tsx` for the route-level access guard and page layout.
- `app/(app)/admin/actions.ts` for admin-only Server Actions.
- `components/admin/monthly-budget-reset-card.tsx` for the visible tool card and
  confirmation dialog.
- A small nav helper or filtered nav list so sidebar and bottom navigation share
  the same admin-aware items.

The admin helper should be the only place that knows the environment variable
name. UI components should only receive booleans, action results, and display
data.

## Data Flow

Admin navigation visibility:

1. `app/(app)/layout.tsx` loads the authenticated session.
2. The layout checks admin access from the session email.
3. `FinanceAppShell` receives `isAdmin`.
4. The shell renders sidebar and bottom nav with the admin item only when
   `isAdmin` is true.

Admin route access:

1. `/admin/page.tsx` loads the current authenticated session on the server.
2. The page checks admin access on the server.
3. Non-admin users receive `notFound()`.
4. Admin users see the dashboard.

Manual reset:

1. Admin clicks `Reset Budgets`.
2. Confirmation dialog opens.
3. Admin clicks `Reset Budgets Now`.
4. Server Action re-checks admin access.
5. Server Action calls `closeMonthlyBudgets()`.
6. UI renders success or error feedback in the dialog.

## Error Handling

Unauthorized admin actions should not perform any mutation. If a non-admin user
somehow calls the Server Action, it should return a generic `{ ok: false,
message: "Unauthorized." }` result. The response must not include the configured
admin email or other sensitive details.

Expected reset failures should use inline status feedback near the destructive
action. The UI should not close the dialog on failure.

Unexpected service errors should be logged on the server and returned to the
client as a concise failure message, such as `Monthly budget reset failed. Try
again or check the server logs.`

## Testing And Verification

Focused automated coverage should include:

- Admin email comparison normalizes case and whitespace.
- Missing `ADMIN_EMAIL_PRIVILEGES` denies admin access.
- Missing session email denies admin access.
- Non-admin `/admin` access returns not found.
- The admin Server Action does not call `closeMonthlyBudgets()` for non-admin
  users.
- Successful reset results are formatted into user-facing status copy.
- Reset failures keep the dialog open and show an inline error.

Manual checks:

- Without `ADMIN_EMAIL_PRIVILEGES`, no `Admin` nav item appears.
- With `ADMIN_EMAIL_PRIVILEGES` set to the signed-in user's email, `Admin`
  appears in desktop and mobile navigation.
- A non-admin signed-in user manually visiting `/admin` sees not found.
- The reset confirmation opens from the admin dashboard.
- Canceling the dialog does not run the reset.
- Confirming the dialog runs the monthly budget close and shows result counts.

## Implementation Notes

The existing monthly budget close service is the source of truth for reset
behavior. The admin dashboard should call that service directly from a Server
Action instead of duplicating reset logic or proxying the cron endpoint.

This feature is provisional, but the access helper and component boundaries
should still be clear enough to replace later with database-backed roles without
rewriting the admin page.
