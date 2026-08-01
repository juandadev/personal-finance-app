ALTER TABLE cash_forecast_exclusions
  DROP CONSTRAINT IF EXISTS cash_forecast_exclusions_source_type_check;

ALTER TABLE cash_forecast_exclusions
  ADD CONSTRAINT cash_forecast_exclusions_source_type_check CHECK (
    source_type IN (
      'budget_projection',
      'default_income',
      'recurring_bill',
      'additional_income',
      'planned_outflow'
    )
  );
