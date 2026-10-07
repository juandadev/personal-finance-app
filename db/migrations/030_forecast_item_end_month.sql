ALTER TABLE cash_forecast_adjustments
  ADD COLUMN IF NOT EXISTS end_period text;

ALTER TABLE cash_forecast_adjustments
  DROP CONSTRAINT IF EXISTS cash_forecast_adjustments_end_period_check;

ALTER TABLE cash_forecast_adjustments
  ADD CONSTRAINT cash_forecast_adjustments_end_period_check CHECK (
    end_period IS NULL OR end_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  );

ALTER TABLE cash_forecast_adjustments
  DROP CONSTRAINT IF EXISTS cash_forecast_adjustments_end_recurrence_check;

ALTER TABLE cash_forecast_adjustments
  ADD CONSTRAINT cash_forecast_adjustments_end_recurrence_check CHECK (
    recurrence = 'monthly' OR end_period IS NULL
  );

ALTER TABLE cash_forecast_adjustments
  DROP CONSTRAINT IF EXISTS cash_forecast_adjustments_end_after_start_check;

ALTER TABLE cash_forecast_adjustments
  ADD CONSTRAINT cash_forecast_adjustments_end_after_start_check CHECK (
    end_period IS NULL OR end_period >= start_period
  );
