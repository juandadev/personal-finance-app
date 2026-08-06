# Production Readiness Runbook

The application must not admit beta users until every release gate below is
verified against the production deployment.

## Neon topology and recovery

- Production is the default, protected root branch.
- Development and preview branches contain synthetic fixtures only.
- Instant restore retains seven days of history.
- A daily snapshot schedule retains restore points for 30 days.
- A restore into a new branch has been exercised and validated without exposing
  the restored branch to application traffic.
- Production connection strings use `sslmode=verify-full`.

For the initial closed beta, ADR 0005 records a temporary exception: the
`free_v2` project has a six-hour history window and cannot enable branch
protection or scheduled snapshots. Treat the three recovery checks above as a
known waiver, not as verified controls. Upgrade and remove the waiver before
widening enrollment.

The current project was originally created with production as a child of
development. Build a clean production root rather than copying production data
back into development. Migrate with `pg_dump`/`pg_restore` during a scheduled
maintenance window, validate row counts and RLS, then rotate all old branch
credentials.

## Credentials and roles

- `DATABASE_URL` authenticates as the non-owner web role and cannot bypass RLS,
  create objects, create roles, or set the scheduler role.
- `DATABASE_DIRECT_URL` authenticates as the migration owner and is available
  only to the migration job.
- `AUTH_DATABASE_URL` authenticates as the invitation-gate role and can execute
  only invitation functions.
- `SCHEDULER_DATABASE_URL` authenticates as the scheduler role and can execute
  only the scheduled-close entry point.
- `CRON_SECRET` and `NEON_AUTH_COOKIE_SECRET` contain at least 32 random bytes.
- Every credential has an owner, storage location, rotation date, and tested
  rotation procedure.

Never use an owner connection string in the web or cron deployment.

## Neon Auth

- Only the exact production origin is trusted.
- Localhost access is disabled on the production Auth branch.
- Email ownership verification is required.
- Google uses application-owned production OAuth credentials.
- Transactional email uses application-owned SMTP credentials.
- The blocking `user.before_create` webhook is enabled and monitored.
- Direct email and OAuth signups without a valid invitation fail closed.
- Password reset, verification, invitation retry, and session revocation have
  been tested.

## Vercel

- Production and preview projects use separate environment variables.
- Preview deployments never point to production data or production Auth.
- Firewall rules rate-limit Auth, webhook, export, deletion, and cron routes.
- Stable egress or Secure Compute is required before enabling a Neon IP
  allowlist. Do not allowlist broad Vercel address ranges.
- Logs and Analytics contain no financial values, request bodies, passwords,
  invite tokens, or database connection strings.

## Release verification

Run:

```bash
bun run format:check
bun run typecheck
bun run lint
bun run test
bun run build
bun audit --audit-level=high
```

Then complete the security test matrix in `docs/security/verification.md` and
record the tested deployment, database branch, reviewer, and date.
