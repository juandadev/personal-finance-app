# Incident Response

## Purpose

Use this runbook for suspected unauthorized access, cross-tenant exposure, account takeover, destructive or incorrect monthly close, data loss, malicious dependency, leaked credential, or unavailable security-critical service. Preserve confidentiality while responding: Production Data must not be copied into non-production systems or unapproved communication channels.

## Roles

- **Incident lead:** owns severity, decisions, timeline, and handoffs.
- **Technical lead:** contains the issue, preserves evidence, remediates, and validates recovery.
- **Privacy lead:** determines affected people and data with qualified Mexican legal counsel.
- **Communications lead:** prepares accurate Operator and user communications.

One person may hold multiple roles during the closed beta, but every decision and action must identify its owner and time. Maintain an offline-accessible contact list for the application owner, Operators, Neon support, hosting support, and legal counsel.

## Severity

- **SEV-1:** confirmed or likely cross-tenant/large-scale disclosure, destructive compromise, active privileged intrusion, or unrecoverable critical data loss.
- **SEV-2:** contained disclosure, single-account takeover, recoverable corruption, leaked limited credential, or material security-control failure.
- **SEV-3:** suspicious activity or vulnerability without evidence of exploitation or Production Data impact.

When uncertain, start at the higher severity and downgrade only when evidence supports it.

## Response procedure

### 1. Declare and preserve

1. Open an incident record with UTC timestamps, reporter, symptoms, systems, initial severity, and role assignments.
2. Preserve relevant application, authentication, database, RLS, export, deletion, scheduler, and Operator audit records.
3. Limit evidence access and record who collected or accessed it. Do not put Production Data or credentials in tickets or chat.

### 2. Contain

1. Revoke exposed sessions, invitations, tokens, and credentials; rotate secrets through their managed stores.
2. Disable only the affected route, account, integration, scheduled job, or Operator capability when possible.
3. For suspected tenant-isolation failure, stop the affected data path until deny-other tests pass.
4. Contact Neon or another processor promptly when its service or evidence is involved.

Neon Managed Better Auth has no MFA during the closed beta. For suspected identity compromise, revoke all affected sessions, re-verify the identity through a known channel, and inspect account, export, deletion, and identity-change activity.

### 3. Determine impact

Record:

- earliest and latest known exposure;
- affected Closed Beta Users and tenants;
- data viewed, changed, exported, deleted, or made unavailable;
- whether credentials, backups, audit records, or Operator access were involved;
- attacker capability and remaining access;
- confidence level and evidence gaps.

Do not claim that an incident had no impact solely because logs contain no evidence; account for logging coverage and retention.

### 4. Eradicate and recover

1. Remove the cause, patch the vulnerable path, rotate affected credentials, and add a regression check.
2. Validate authentication, authorization, RLS, exports, deletion, and scheduled-close boundaries before reopening.
3. Recover with seven-day PITR or a daily snapshot retained for 30 days when necessary.
4. Reapply and verify Account Deletion requests and other security-sensitive changes made after the selected restore point.
5. Monitor for recurrence and close temporary access granted during response.

### 5. Communicate and assess obligations

- Give Closed Beta Users factual, actionable notices when their data or account may be affected; state what happened, what information was involved, what was done, and what they should do.
- Coordinate timing and content with qualified counsel. LFPDPPP and related notification or authority obligations require case-specific legal review.
- Do not delay technical containment while awaiting communications approval.
- Do not describe the service as legally compliant without completed legal review.

### 6. Close and improve

Within five business days of containment, record the root cause, timeline, impact, control gaps, follow-up owners, and due dates. Verify remediation, revisit the threat model and relevant ADRs, and evaluate migration from Neon Managed Better Auth when an incident meets an ADR 0002 trigger.

## Readiness checks

At least quarterly during the closed beta:

- verify contacts and role coverage;
- test session and credential revocation;
- verify RLS denial and Operator audit visibility;
- verify PITR and snapshot availability and exercise recovery safely;
- rehearse a cross-tenant disclosure and an auth-provider outage.
