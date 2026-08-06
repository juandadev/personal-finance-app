# Database migrations

`bun run db:migrate` applies `db/migrations/*.sql` in filename order. The
runner:

- takes a PostgreSQL advisory lock so only one runner can migrate a database;
- records each migration and its SHA-256 checksum in `schema_migrations`;
- applies each pending migration in its own transaction; and
- refuses to continue if an applied file changed or disappeared.

Applied SQL files are immutable. Add a new sequential migration to make later
changes.

## Existing database baseline

Databases created before `schema_migrations` already have migrations `001`
through `021` applied. The runner detects the existing `profiles` table and
refuses to replay those files.

Before the first run with the new runner:

1. Take or verify a restorable database backup.
2. Confirm the database has the expected `021_credit_card_annuality.sql`
   columns and table. In particular, `credit_cards.annuality_enabled` and
   `credit_card_annuality_overrides` must exist.
3. Baseline only the legacy migration range and apply pending migrations:

   ```bash
   bun run db:migrate --baseline-through=021_credit_card_annuality.sql
   ```

The baseline transaction records the checksums for migrations `001` through
`021` without executing their SQL. The runner only permits this fixed legacy
endpoint, requires an existing `profiles` table, and requires an empty
`schema_migrations` table. Migration `022` is then applied normally.

Do not baseline a partially migrated database. Repair or restore it first.

## Database role activation

Migration `022_database_security.sql` creates two passwordless group roles:

- `personal_finance_app`: normal application table access under RLS.
- `personal_finance_scheduler`: execution access to the single
  `app.close_monthly_budgets(text, text)` entry point added by migration `024`.

The migration does not create login credentials, embed passwords, grant either
role to a login, or change `DATABASE_URL`. The current migration owner keeps
working during the deployment transition.

Activate the roles explicitly:

1. Run migrations with the existing direct owner credential.
2. Create separate deployment login roles using Neon role management or an
   administrator session. Do not put passwords in migration SQL.
3. Grant group membership:

   ```sql
   GRANT personal_finance_app TO personal_finance_app_login
     WITH INHERIT TRUE, SET FALSE;
   GRANT personal_finance_scheduler TO personal_finance_scheduler_login
     WITH INHERIT TRUE, SET FALSE;
   ```

4. Test both login roles on a non-production branch.
5. Switch the normal application `DATABASE_URL` to the app login.
6. Set `SCHEDULER_DATABASE_URL` to the scheduler login and verify that it can
   execute `app.close_monthly_budgets(text, text)` but cannot select from any
   finance table.
7. After verification, retire the old owner credential from application
   runtime use.

Migration `024_scheduler_entrypoint.sql` removes the legacy cron RLS policies
and revokes direct scheduler table access. The TypeScript cron path uses a
separate scheduler pool and invokes only the fixed-search-path security-definer
function. Do not grant the scheduler group to the normal app login.

Default privileges apply to objects created later by the role that ran the
migration. If a different owner creates future tables or functions, configure
equivalent default privileges for that owner.
