ALTER TABLE recurring_bills
  ADD COLUMN IF NOT EXISTS concept text;

UPDATE recurring_bills rb
SET concept = COALESCE(NULLIF(trim(c.display_name), ''), 'Recurring bill')
FROM counterparties c
WHERE c.user_id = rb.user_id
  AND c.id = rb.counterparty_id
  AND (rb.concept IS NULL OR length(trim(rb.concept)) = 0);

UPDATE recurring_bills
SET concept = 'Recurring bill'
WHERE concept IS NULL OR length(trim(concept)) = 0;

ALTER TABLE recurring_bills
  ALTER COLUMN concept SET NOT NULL,
  DROP CONSTRAINT IF EXISTS recurring_bills_concept_check,
  ADD CONSTRAINT recurring_bills_concept_check CHECK (
    length(trim(concept)) > 0 AND length(concept) <= 80
  );
