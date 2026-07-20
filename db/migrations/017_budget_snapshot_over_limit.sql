ALTER TABLE budget_monthly_snapshots
  ADD COLUMN IF NOT EXISTS over_cents integer NOT NULL DEFAULT 0;

ALTER TABLE budget_monthly_snapshots
  ADD CONSTRAINT budget_monthly_snapshots_over_cents_check
  CHECK (over_cents >= 0);

ALTER TABLE budget_monthly_snapshots
  ADD COLUMN IF NOT EXISTS status text;

UPDATE budget_monthly_snapshots
SET status = 'within_budget'
WHERE status IS NULL;

ALTER TABLE budget_monthly_snapshots
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE budget_monthly_snapshots
  ADD CONSTRAINT budget_monthly_snapshots_status_check
  CHECK (status IN ('within_budget', 'over_budget'));

ALTER TABLE budget_monthly_snapshots
  ADD CONSTRAINT budget_monthly_snapshots_status_over_cents_check
  CHECK (
    (status = 'within_budget' AND over_cents = 0)
    OR (status = 'over_budget' AND over_cents > 0)
  );
