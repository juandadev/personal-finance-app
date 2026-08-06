-- Convert legacy global categories into user-owned categories without dropping
-- any category that is still referenced by finance data.
LOCK TABLE
  categories,
  transactions,
  budgets,
  recurring_bills,
  budget_monthly_snapshots
IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE category_migration_map (
  user_id text NOT NULL,
  source_category_id uuid NOT NULL,
  target_category_id uuid,
  PRIMARY KEY (user_id, source_category_id)
) ON COMMIT DROP;

INSERT INTO category_migration_map (user_id, source_category_id)
SELECT references_to_global_categories.user_id, references_to_global_categories.category_id
FROM (
  SELECT user_id, category_id FROM transactions
  UNION
  SELECT user_id, category_id FROM budgets
  UNION
  SELECT user_id, category_id FROM recurring_bills
  UNION
  SELECT user_id, category_id FROM budget_monthly_snapshots
) AS references_to_global_categories
JOIN categories
  ON categories.id = references_to_global_categories.category_id
WHERE categories.user_id IS NULL;

-- Reuse an equivalent owned category when one exists. Otherwise clone the
-- global category for each user that references it.
INSERT INTO categories (
  id,
  name,
  slug,
  created_at,
  user_id,
  theme_color,
  updated_at
)
SELECT
  gen_random_uuid(),
  global_category.name,
  global_category.slug,
  global_category.created_at,
  category_migration_map.user_id,
  global_category.theme_color,
  global_category.updated_at
FROM category_migration_map
JOIN categories AS global_category
  ON global_category.id = category_migration_map.source_category_id
WHERE NOT EXISTS (
  SELECT 1
  FROM categories AS owned_category
  WHERE owned_category.user_id = category_migration_map.user_id
    AND (
      lower(owned_category.name) = lower(global_category.name)
      OR lower(owned_category.slug) = lower(global_category.slug)
    )
);

UPDATE category_migration_map AS migration_map
SET target_category_id = (
  SELECT owned_category.id
  FROM categories AS global_category
  JOIN categories AS owned_category
    ON owned_category.user_id = migration_map.user_id
    AND (
      lower(owned_category.name) = lower(global_category.name)
      OR lower(owned_category.slug) = lower(global_category.slug)
    )
  WHERE global_category.id = migration_map.source_category_id
  ORDER BY
    (
      lower(owned_category.name) = lower(global_category.name)
      AND lower(owned_category.slug) = lower(global_category.slug)
    ) DESC,
    owned_category.created_at,
    owned_category.id
  LIMIT 1
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM category_migration_map
    WHERE target_category_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Could not create a user-owned replacement for every referenced global category.';
  END IF;
END
$$;

UPDATE transactions
SET category_id = category_migration_map.target_category_id
FROM category_migration_map
WHERE transactions.user_id = category_migration_map.user_id
  AND transactions.category_id = category_migration_map.source_category_id;

UPDATE budgets
SET category_id = category_migration_map.target_category_id
FROM category_migration_map
WHERE budgets.user_id = category_migration_map.user_id
  AND budgets.category_id = category_migration_map.source_category_id;

UPDATE recurring_bills
SET category_id = category_migration_map.target_category_id
FROM category_migration_map
WHERE recurring_bills.user_id = category_migration_map.user_id
  AND recurring_bills.category_id = category_migration_map.source_category_id;

UPDATE budget_monthly_snapshots
SET category_id = category_migration_map.target_category_id
FROM category_migration_map
WHERE budget_monthly_snapshots.user_id = category_migration_map.user_id
  AND budget_monthly_snapshots.category_id = category_migration_map.source_category_id;

DELETE FROM categories AS global_category
WHERE global_category.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM transactions
    WHERE transactions.category_id = global_category.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM budgets
    WHERE budgets.category_id = global_category.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM recurring_bills
    WHERE recurring_bills.category_id = global_category.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM budget_monthly_snapshots
    WHERE budget_monthly_snapshots.category_id = global_category.id
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM categories WHERE user_id IS NULL) THEN
    RAISE EXCEPTION
      'Referenced global categories remain; refusing to enforce user ownership.';
  END IF;
END
$$;

ALTER TABLE categories
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE categories
  ADD CONSTRAINT categories_user_id_id_key UNIQUE (user_id, id);

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_category_fk
  FOREIGN KEY (user_id, category_id)
  REFERENCES categories(user_id, id)
  ON DELETE RESTRICT;

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_user_category_fk
  FOREIGN KEY (user_id, category_id)
  REFERENCES categories(user_id, id)
  ON DELETE RESTRICT;

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_category_fk;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_user_category_fk
  FOREIGN KEY (user_id, category_id)
  REFERENCES categories(user_id, id)
  ON DELETE RESTRICT;

DROP POLICY IF EXISTS categories_user_owns_data ON categories;
CREATE POLICY categories_user_owns_data ON categories
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

-- These are group roles only. Deployment-specific login roles and passwords
-- are created outside migrations, then granted membership explicitly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'personal_finance_app'
  ) THEN
    CREATE ROLE personal_finance_app
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  ELSIF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'personal_finance_app'
      AND rolcanlogin
  ) THEN
    RAISE EXCEPTION 'personal_finance_app must be a NOLOGIN role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'personal_finance_scheduler'
  ) THEN
    CREATE ROLE personal_finance_scheduler
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  ELSIF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'personal_finance_scheduler'
      AND rolcanlogin
  ) THEN
    RAISE EXCEPTION 'personal_finance_scheduler must be a NOLOGIN role';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO personal_finance_app, personal_finance_scheduler',
    current_database()
  );
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT USAGE ON SCHEMA public, app TO personal_finance_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO personal_finance_app;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO personal_finance_app;
REVOKE ALL ON TABLE public.schema_migrations
  FROM personal_finance_app, personal_finance_scheduler;

GRANT USAGE ON SCHEMA public, app TO personal_finance_scheduler;
GRANT SELECT ON TABLE
  profiles,
  categories,
  budget_transaction_assignments
  TO personal_finance_scheduler;
GRANT SELECT, INSERT ON TABLE
  budget_monthly_snapshots
  TO personal_finance_scheduler;
GRANT SELECT, INSERT, UPDATE ON TABLE
  budgets,
  monthly_report_runs
  TO personal_finance_scheduler;

-- Keep the legacy GUC protocol safe during the transition to migration 024.
-- Possession of a connection string is insufficient unless the login is an
-- explicit member of the scheduler group.
CREATE OR REPLACE FUNCTION app.is_cron_job()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    current_setting('app.cron_job', true) = 'true'
    AND pg_has_role(
      session_user,
      'personal_finance_scheduler',
      'member'
    )
$$;

REVOKE ALL ON FUNCTION app.is_cron_job() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.current_user_id()
  TO personal_finance_app, personal_finance_scheduler;
GRANT EXECUTE ON FUNCTION app.is_cron_job()
  TO personal_finance_app, personal_finance_scheduler;

DROP POLICY IF EXISTS categories_monthly_close ON categories;
CREATE POLICY categories_monthly_close ON categories
  FOR SELECT
  USING (app.is_cron_job());
