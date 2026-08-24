# Threat Model

## Scope and assumptions

This model covers the Mexico-only, invitation-based closed beta: the web application, server-side application boundary, Neon production database, Neon Managed Better Auth, scheduled monthly close, Data Export, Account Deletion, backups, and Operator access.

- Neon Managed Better Auth is a beta dependency and does not provide MFA. This is an accepted closed-beta risk, not a permanent security posture.
- Operators are trusted, but their production access is least-privilege, purpose-limited, and audited.
- Production Data is permitted only in production. Development, test, preview, and demonstration environments use synthetic data.
- Database recovery consists of seven-day point-in-time recovery (PITR) plus daily snapshots retained for 30 days.
- Application-level field encryption is out of scope for version 1. See ADR 0001.

## Assets and boundaries

Protect Financial Records, identity and contact data, invitations, sessions, exports, deletion requests, audit records, credentials, and backups.

The public browser and external integrations are untrusted. The authenticated server and managed production database form the confidentiality boundary. Tenant separation is enforced at the database with row-level security (RLS), reinforced by server authorization. Scheduled jobs and Operator tooling are privileged boundaries and must not reuse normal user privileges.

## Principal threats and required controls

### Account or invitation takeover

- Make invitations single-purpose, time-bounded, and unusable after acceptance or revocation.
- Require a Verified Identity before account access and protect sessions with secure cookie settings, rotation, expiry, and revocation.
- Rate-limit invitation acceptance, authentication, recovery, export, and deletion flows.
- Require recent re-verification for Data Export, Account Deletion, or identity changes.
- Track the lack of MFA as residual risk and apply ADR 0002 migration triggers.

### Cross-tenant disclosure or mutation

- Apply default-deny RLS to every table, view, and operation containing tenant-owned data.
- Derive tenant identity from the verified server-side session, never a client-supplied owner identifier.
- Keep privileged database credentials out of browser code and ordinary request paths.
- Add automated allow-own/deny-other tests for each schema or policy change.

### Server, query, or dependency compromise

- Validate input, use parameterized database access, apply least-privilege credentials, and keep secrets outside source control and logs.
- Patch supported dependencies promptly and review changes to authentication, authorization, exports, deletion, and scheduled jobs.
- Do not place Financial Record values, session tokens, exports, or credentials in telemetry.
- Treat compromise of an authorized server as potential plaintext disclosure because version 1 has no field encryption.

### Operator misuse or credential compromise

- Grant named Operator access only for an approved operational purpose and remove it when no longer needed.
- Separate Operator actions from ordinary user flows and record actor, time, target, action, and outcome in tamper-resistant audit logs.
- Review privileged access and audit records regularly; investigate unexplained reads, exports, policy changes, or deletions.
- Never copy Production Data into a non-production environment for diagnosis.

### Export or deletion abuse

- Scope every self-service export and deletion to the current Verified Identity and prevent cross-tenant identifiers in requests.
- Generate exports in a private, short-lived location; prevent shared caching and log access without logging contents.
- Confirm deletion explicitly, revoke active sessions, remove active Production Data, and record only the minimum proof needed to resolve disputes.
- Document that deleted data may remain recoverable until PITR and retained snapshots age out; do not restore a deleted account unintentionally during recovery.

### Scheduled monthly close abuse or failure

- Use a dedicated idempotent operation scoped to one tenant and month with bounded retries and duplicate-run protection.
- Give the scheduler no arbitrary query capability and no authority beyond eligible close operations.
- Audit each attempt and alert on repeated failures, unexpected volume, or out-of-scope changes.

### Data loss, corruption, or backup exposure

- Restrict and audit recovery access; encrypt backup transport and storage through the managed platform.
- Test restoration without moving Production Data to non-production, or use a sanitized/synthetic restoration test.
- Verify that seven-day PITR and daily 30-day snapshots are operating as intended.
- During restoration, reconcile Account Deletion requests received after the restore point before reopening access.

## Review triggers

Review this model before broader availability, after a material incident, when adding a new data processor or privileged path, when auth/MFA capabilities change, or when legal review changes privacy or retention requirements.
