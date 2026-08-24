# Mexico Closed Beta Privacy Contract

## Status and scope

This document defines the operating privacy contract for the invitation-only closed beta offered only to people in Mexico. It is not a privacy notice, legal opinion, or claim of compliance.

Qualified Mexican counsel must review the service, user-facing privacy notice, consent or other legal basis, processor terms, international data flows, rights-request procedure, retention, incident duties, and product copy under the LFPDPPP and other applicable rules before the beta processes Production Data. Launch approval and the date/version of that review must be recorded.

## Enrollment

- Only approved invitees in Mexico may join; an Invitation is not transferable and does not itself establish a Verified Identity.
- Explain the beta status, data practices, support channel, and material limitations before collection.
- Neon Managed Better Auth is a beta dependency and has no MFA. This limitation must be included in security review and must not be represented otherwise to users.
- Collect only the information necessary to operate and secure the beta. Do not collect official identification or sensitive personal data unless separately justified and approved by legal and security review.

## Data and purposes

Expected Production Data includes identity and contact information, Financial Records supplied or derived through use, invitation and account status, session/security records, user requests, and audit records.

Use Production Data only to:

- provide and support the personal-finance service;
- authenticate users and secure tenant boundaries;
- perform the constrained Scheduled Monthly Close;
- provide self-service Data Export and Account Deletion;
- recover from failures, investigate incidents, and meet obligations established by legal review.

New data categories, purposes, processors, analytics, or disclosures require privacy and security review before release. Production Data must never be used in development, test, preview, demonstrations, or training datasets; those environments are synthetic-only.

## Access and processors

- Limit user access to the current tenant through server authorization and least-privilege RLS.
- Permit Production Data access only to trusted Operators with a documented purpose, minimum necessary privilege, and an audit record.
- Maintain an inventory of processors, data locations, purposes, contracts, and deletion/incident contacts.
- Legal review must determine the disclosures, consent, contractual terms, and transfer mechanisms required for Neon, hosting, email, telemetry, or any other processor, including processing outside Mexico.

## User controls and requests

- Provide self-service Data Export scoped to the current Verified Identity in a portable, understandable format.
- Provide self-service Account Deletion with explicit confirmation, session revocation, and status visibility.
- Offer a human contact path for failed self-service requests, identity disputes, corrections, objections, or requests that cannot be completed automatically.
- Verify the requester without collecting disproportionate additional data and record request receipt, decisions, actions, and completion.
- Treat self-service features as product controls, not proof that all LFPDPPP access, rectification, cancellation, opposition, or consent-revocation requirements have been met. Counsel must approve the complete rights procedure and response deadlines.

## Retention and deletion

- Keep active Production Data only while needed for the documented beta purposes and the retention schedule approved through legal review.
- On Account Deletion, remove the user's active account and tenant data, revoke access, cancel pending exports and invitations, and retain only records specifically justified by the approved schedule or legal advice.
- Deleted data may remain recoverable through seven-day PITR and daily snapshots retained for 30 days. It must not be restored into active use; if recovery occurs, reapply deletion requests before access resumes.
- Backups must expire under that schedule rather than being retained indefinitely. Any exception requires a documented purpose, owner, expiry, and legal review.
- Keep audit evidence minimal and do not retain Financial Record contents merely to prove deletion.

## Transparency and incidents

The user-facing notice must accurately identify the responsible party and contact channel, collected data and purposes, user choices and rights process, processors or transfers required by legal review, retention approach, and material beta limitations. Keep the accepted notice version linked to each enrollment.

Handle suspected privacy or security incidents under `docs/security/incident-response.md`. Qualified counsel must assess any notification to affected people or authorities; neither this contract nor the runbook predetermines legal obligations.

## Release gates

Do not open or expand the beta until:

- LFPDPPP legal review is completed and recorded;
- the approved privacy notice and rights contact are live;
- self-service export and deletion pass own-tenant and deny-other tests;
- Operator access and privacy-sensitive actions are auditable;
- synthetic-only non-production controls and the recovery schedule are verified.

Repeat legal and privacy review before public availability, expansion outside Mexico, material purpose or processor changes, or adoption of new identity or MFA capabilities.
