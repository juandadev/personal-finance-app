CREATE TABLE IF NOT EXISTS cash_forecast_settings (
  user_id text PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  default_monthly_income_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_forecast_settings_income_check CHECK (
    default_monthly_income_cents >= 0
  )
);

CREATE TABLE IF NOT EXISTS cash_forecast_adjustments (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  name text NOT NULL,
  amount_cents integer NOT NULL,
  start_period text NOT NULL,
  recurrence text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT cash_forecast_adjustments_kind_check CHECK (
    kind IN ('additional_income', 'planned_outflow')
  ),
  CONSTRAINT cash_forecast_adjustments_name_check CHECK (
    name = btrim(name) AND length(name) > 0 AND length(name) <= 80
  ),
  CONSTRAINT cash_forecast_adjustments_amount_check CHECK (amount_cents > 0),
  CONSTRAINT cash_forecast_adjustments_start_period_check CHECK (
    start_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT cash_forecast_adjustments_recurrence_check CHECK (
    recurrence IN ('once', 'monthly')
  ),
  CONSTRAINT cash_forecast_adjustments_kind_recurrence_check CHECK (
    kind = 'planned_outflow' OR recurrence = 'once'
  )
);

CREATE INDEX IF NOT EXISTS cash_forecast_adjustments_user_period_idx
  ON cash_forecast_adjustments (user_id, start_period, created_at, id);

DROP TRIGGER IF EXISTS cash_forecast_settings_touch_updated_at ON cash_forecast_settings;
CREATE TRIGGER cash_forecast_settings_touch_updated_at
  BEFORE UPDATE ON cash_forecast_settings
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS cash_forecast_adjustments_touch_updated_at ON cash_forecast_adjustments;
CREATE TRIGGER cash_forecast_adjustments_touch_updated_at
  BEFORE UPDATE ON cash_forecast_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE cash_forecast_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_forecast_adjustments ENABLE ROW LEVEL SECURITY;

ALTER TABLE cash_forecast_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE cash_forecast_adjustments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_forecast_settings_user_owns_data ON cash_forecast_settings;
CREATE POLICY cash_forecast_settings_user_owns_data ON cash_forecast_settings
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS cash_forecast_adjustments_user_owns_data ON cash_forecast_adjustments;
CREATE POLICY cash_forecast_adjustments_user_owns_data ON cash_forecast_adjustments
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
