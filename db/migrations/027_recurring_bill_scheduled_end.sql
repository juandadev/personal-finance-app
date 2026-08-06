ALTER TABLE recurring_bills
  ADD COLUMN IF NOT EXISTS scheduled_end_date date,
  ADD COLUMN IF NOT EXISTS scheduled_end_mode text;

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_scheduled_end_paired;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_scheduled_end_paired CHECK (
    (scheduled_end_date IS NULL) = (scheduled_end_mode IS NULL)
  );

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_scheduled_end_mode_valid;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_scheduled_end_mode_valid CHECK (
    scheduled_end_mode IS NULL OR scheduled_end_mode IN ('pause', 'archive')
  );

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_scheduled_end_requires_active;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_scheduled_end_requires_active CHECK (
    scheduled_end_date IS NULL
    OR (paused_at IS NULL AND archived_at IS NULL)
  );
