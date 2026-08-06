# Security Verification Matrix

Record evidence for each check against a disposable branch created from the
production schema. Tests must use synthetic users and data.

## Authentication

- An invited email can create exactly one identity.
- An expired, revoked, consumed, or unknown invitation is rejected.
- Calling the Neon Auth signup endpoint directly cannot bypass the blocking
  webhook.
- Google and email/password signup enforce the same normalized-email decision.
- A malformed, replayed, stale, or incorrectly signed webhook fails closed.
- Unverified email identities cannot enter authenticated routes.
- Signing out and account deletion invalidate the active session.

## Tenant isolation

- The runtime reports a role with `rolbypassrls = false`.
- User A cannot select, insert, update, or delete User B's rows in any finance
  table, even when a forged record ID is supplied.
- A transaction-local user context cannot leak through the connection pool.
- Missing user context returns no rows and permits no writes.
- The web role cannot create objects, change policies, set roles, or execute the
  scheduler function.

## Scheduled processing

- The scheduler role cannot query finance tables directly.
- The scheduler can execute only the fixed month-close entry point.
- Re-running the same period is idempotent.
- Responses and logs contain aggregate counts, not user IDs or raw errors.
- An invalid cron secret returns `401`; a missing secret fails closed.

## Data minimization and lifecycle

- The root authenticated layout does not serialize complete transaction
  history.
- Transaction filters, ordering, and pagination execute in PostgreSQL.
- Export returns only the authenticated user's finance records with `no-store`
  and attachment headers.
- Account deletion rejects an incorrect confirmation and cannot target a
  supplied user ID.
- Retrying a partially completed deletion is safe.

## Browser and operations

- CSP, HSTS, frame, MIME, referrer, and permissions headers are present.
- State-changing cross-origin requests are rejected.
- Auth, export, deletion, webhook, and cron limits are active.
- Production logs contain no finance payloads, passwords, tokens, or connection
  strings.
- A seven-day point-in-time restore and a daily snapshot restore have each been
  tested.
