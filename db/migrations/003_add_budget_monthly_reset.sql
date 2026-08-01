CREATE OR REPLACE FUNCTION app.is_cron_job()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.cron_job', true) = 'true'
$$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mexico_City';

CREATE TABLE IF NOT EXISTS budget_transaction_assignments (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  assigned_amount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, transaction_id),
  FOREIGN KEY (user_id, budget_id)
    REFERENCES budgets(user_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id, transaction_id)
    REFERENCES transactions(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT budget_transaction_assignments_amount_check CHECK (assigned_amount_cents > 0)
);

CREATE TABLE IF NOT EXISTS monthly_report_runs (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  period text NOT NULL,
  module text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, module, period),
  CONSTRAINT monthly_report_runs_period_check CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT monthly_report_runs_module_check CHECK (module IN ('budgets')),
  CONSTRAINT monthly_report_runs_status_check CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS budget_monthly_snapshots (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  monthly_report_run_id uuid NOT NULL,
  period text NOT NULL,
  source_budget_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_name text NOT NULL,
  theme_color text NOT NULL,
  limit_cents integer NOT NULL,
  spent_cents integer NOT NULL,
  free_cents integer NOT NULL,
  assigned_transaction_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, period, source_budget_id),
  FOREIGN KEY (user_id, monthly_report_run_id)
    REFERENCES monthly_report_runs(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT budget_monthly_snapshots_period_check CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT budget_monthly_snapshots_limit_check CHECK (limit_cents > 0),
  CONSTRAINT budget_monthly_snapshots_spent_check CHECK (spent_cents >= 0),
  CONSTRAINT budget_monthly_snapshots_free_check CHECK (free_cents >= 0),
  CONSTRAINT budget_monthly_snapshots_count_check CHECK (assigned_transaction_count >= 0)
);

CREATE INDEX IF NOT EXISTS budget_assignments_user_budget_idx
  ON budget_transaction_assignments (user_id, budget_id, transaction_id);

CREATE INDEX IF NOT EXISTS monthly_report_runs_user_period_idx
  ON monthly_report_runs (user_id, period, module);

CREATE INDEX IF NOT EXISTS budget_monthly_snapshots_user_period_idx
  ON budget_monthly_snapshots (user_id, period);

DROP TRIGGER IF EXISTS budget_transaction_assignments_touch_updated_at ON budget_transaction_assignments;
CREATE TRIGGER budget_transaction_assignments_touch_updated_at
  BEFORE UPDATE ON budget_transaction_assignments
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE budget_transaction_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_monthly_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE budget_transaction_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE monthly_report_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_monthly_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_cron_job ON profiles;
CREATE POLICY profiles_cron_job ON profiles
  FOR ALL
  USING (app.is_cron_job())
  WITH CHECK (app.is_cron_job());

DROP POLICY IF EXISTS budgets_cron_job ON budgets;
CREATE POLICY budgets_cron_job ON budgets
  FOR ALL
  USING (app.is_cron_job())
  WITH CHECK (app.is_cron_job());

DROP POLICY IF EXISTS budget_transaction_assignments_user_owns_data ON budget_transaction_assignments;
CREATE POLICY budget_transaction_assignments_user_owns_data ON budget_transaction_assignments
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS budget_transaction_assignments_cron_job ON budget_transaction_assignments;
CREATE POLICY budget_transaction_assignments_cron_job ON budget_transaction_assignments
  FOR ALL
  USING (app.is_cron_job())
  WITH CHECK (app.is_cron_job());

DROP POLICY IF EXISTS monthly_report_runs_user_owns_data ON monthly_report_runs;
CREATE POLICY monthly_report_runs_user_owns_data ON monthly_report_runs
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS monthly_report_runs_cron_job ON monthly_report_runs;
CREATE POLICY monthly_report_runs_cron_job ON monthly_report_runs
  FOR ALL
  USING (app.is_cron_job())
  WITH CHECK (app.is_cron_job());

DROP POLICY IF EXISTS budget_monthly_snapshots_user_owns_data ON budget_monthly_snapshots;
CREATE POLICY budget_monthly_snapshots_user_owns_data ON budget_monthly_snapshots
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS budget_monthly_snapshots_cron_job ON budget_monthly_snapshots;
CREATE POLICY budget_monthly_snapshots_cron_job ON budget_monthly_snapshots
  FOR ALL
  USING (app.is_cron_job())
  WITH CHECK (app.is_cron_job());
