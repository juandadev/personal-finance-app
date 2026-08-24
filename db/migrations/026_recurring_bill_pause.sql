ALTER TABLE recurring_bills
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_pause_archive_exclusive;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_pause_archive_exclusive CHECK (
    paused_at IS NULL OR archived_at IS NULL
  );
