ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_frequency_check,
  ADD CONSTRAINT recurring_bills_frequency_check CHECK (
    frequency IN ('monthly', 'yearly', 'one_time')
  );

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_one_time_card_check,
  ADD CONSTRAINT recurring_bills_one_time_card_check CHECK (
    frequency <> 'one_time'
    OR (credit_card_id IS NOT NULL AND total_payments = 1)
  );
