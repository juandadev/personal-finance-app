CREATE TABLE IF NOT EXISTS cash_forecast_exclusions (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_key text NOT NULL,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT cash_forecast_exclusions_source_type_check CHECK (
    source_type IN (
      'budget_projection',
      'default_income',
      'recurring_bill'
    )
  ),
  CONSTRAINT cash_forecast_exclusions_source_key_check CHECK (
    source_key = btrim(source_key) AND length(source_key) > 0
  ),
  CONSTRAINT cash_forecast_exclusions_period_check CHECK (
    period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT cash_forecast_exclusions_unique_key UNIQUE (
    user_id,
    source_type,
    source_key,
    period
  )
);

CREATE INDEX IF NOT EXISTS cash_forecast_exclusions_user_period_idx
  ON cash_forecast_exclusions (user_id, period, source_type, source_key);

ALTER TABLE cash_forecast_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_forecast_exclusions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_forecast_exclusions_user_owns_data ON cash_forecast_exclusions;
CREATE POLICY cash_forecast_exclusions_user_owns_data ON cash_forecast_exclusions
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
