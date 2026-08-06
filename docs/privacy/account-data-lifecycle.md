# Account and Data Lifecycle

> **Legal review required:** The controller identity, addresses, rights process,
> processor and transfer disclosures, retention schedule, and Spanish privacy
> notice must be approved by qualified Mexican counsel before production use.

## Self-service export

An authenticated user can download a versioned JSON document containing only
finance rows selected under that user's RLS scope. The export names every source
table explicitly, records its generation time, is not cached, and excludes
authentication secrets and session tokens. The closed beta uses a 10 MiB
response limit; larger requests require support.

## Self-service deletion

Deletion derives identity from the active server session. It revokes other
sessions, removes finance rows in foreign-key order inside one RLS-scoped
transaction, and then calls Neon Auth's supported `deleteUser` method. Email and
password accounts must provide and verify the current password.

Postgres and Neon Auth cannot participate in one atomic transaction. If finance
deletion succeeds but Neon Auth deletion fails, the finance purge remains
complete and a retry safely repeats the empty purge before retrying auth
deletion. The UI must tell the user to retry without claiming full completion.
Successful auth deletion invalidates the account and sessions; sign-out is also
attempted to clear any remaining local cookie.

Deleted values may remain in protected recovery copies for no more than 30 days.
They must not be restored to active use without reapplying completed deletion
requests.
