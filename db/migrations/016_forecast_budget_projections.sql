ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS monthly_voucher_coverage_cents integer NOT NULL DEFAULT 0;

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_monthly_voucher_coverage_nonnegative_check,
  ADD CONSTRAINT budgets_monthly_voucher_coverage_nonnegative_check CHECK (
    monthly_voucher_coverage_cents >= 0
  );

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_monthly_voucher_coverage_limit_check,
  ADD CONSTRAINT budgets_monthly_voucher_coverage_limit_check CHECK (
    monthly_voucher_coverage_cents <= limit_cents
  );

ALTER TABLE cash_forecast_settings
  ADD COLUMN IF NOT EXISTS included_budget_category_ids uuid[] NOT NULL DEFAULT '{}';
