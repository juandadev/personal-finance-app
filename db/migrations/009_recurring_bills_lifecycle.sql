ALTER TABLE recurring_bills
  ADD COLUMN IF NOT EXISTS first_due_date date,
  ADD COLUMN IF NOT EXISTS total_payments integer,
  ADD COLUMN IF NOT EXISTS credit_card_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill schedule anchors from the legacy due day, clamped to the current
-- month's length so day 31 anchors stay valid in short months. Guarded so the
-- migration replays cleanly after due_day_of_month has been dropped.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recurring_bills'
      AND column_name = 'due_day_of_month'
  ) THEN
    UPDATE recurring_bills
    SET first_due_date = make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(
        due_day_of_month,
        EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int
      )
    )
    WHERE first_due_date IS NULL;
  END IF;
END
$$;

-- Backfill categories, preferring the user's Bills category.
UPDATE recurring_bills
SET category_id = (
  SELECT c.id
  FROM categories c
  WHERE c.user_id = recurring_bills.user_id OR c.user_id IS NULL
  ORDER BY
    (c.user_id = recurring_bills.user_id) DESC NULLS LAST,
    (c.slug = 'bills') DESC,
    c.id
  LIMIT 1
)
WHERE category_id IS NULL;

ALTER TABLE recurring_bills
  ALTER COLUMN first_due_date SET NOT NULL,
  ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_frequency_check,
  DROP CONSTRAINT IF EXISTS recurring_bills_due_day_check,
  DROP CONSTRAINT IF EXISTS recurring_bills_status_check,
  DROP CONSTRAINT IF EXISTS recurring_bills_total_payments_check,
  ADD CONSTRAINT recurring_bills_frequency_check CHECK (frequency IN ('monthly', 'yearly')),
  ADD CONSTRAINT recurring_bills_total_payments_check CHECK (
    total_payments IS NULL OR total_payments > 0
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recurring_bills_credit_card_fk'
  ) THEN
    ALTER TABLE recurring_bills
      ADD CONSTRAINT recurring_bills_credit_card_fk
      FOREIGN KEY (user_id, credit_card_id)
      REFERENCES credit_cards(user_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recurring_bills_category_fk'
  ) THEN
    ALTER TABLE recurring_bills
      ADD CONSTRAINT recurring_bills_category_fk
      FOREIGN KEY (category_id)
      REFERENCES categories(id);
  END IF;
END
$$;

DROP INDEX IF EXISTS recurring_bills_user_due_day_idx;

ALTER TABLE recurring_bills
  DROP COLUMN IF EXISTS due_day_of_month,
  DROP COLUMN IF EXISTS status;

CREATE INDEX IF NOT EXISTS recurring_bills_user_first_due_idx
  ON recurring_bills (user_id, first_due_date, id);

CREATE TABLE IF NOT EXISTS recurring_bill_payments (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recurring_bill_id uuid NOT NULL,
  due_date date NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL,
  transaction_id uuid,
  paid_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, recurring_bill_id, due_date),
  UNIQUE (user_id, transaction_id),
  FOREIGN KEY (user_id, recurring_bill_id)
    REFERENCES recurring_bills(user_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (user_id, transaction_id)
    REFERENCES transactions(user_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT recurring_bill_payments_amount_check CHECK (amount_cents > 0),
  CONSTRAINT recurring_bill_payments_status_check CHECK (status IN ('paid', 'skipped')),
  CONSTRAINT recurring_bill_payments_transaction_check CHECK (
    (status = 'paid' AND transaction_id IS NOT NULL)
    OR (status = 'skipped' AND transaction_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS recurring_bill_payments_user_bill_idx
  ON recurring_bill_payments (user_id, recurring_bill_id, due_date DESC);

DROP TRIGGER IF EXISTS recurring_bill_payments_touch_updated_at ON recurring_bill_payments;
CREATE TRIGGER recurring_bill_payments_touch_updated_at
  BEFORE UPDATE ON recurring_bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE recurring_bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bill_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_bill_payments_user_owns_data ON recurring_bill_payments;
CREATE POLICY recurring_bill_payments_user_owns_data ON recurring_bill_payments
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
