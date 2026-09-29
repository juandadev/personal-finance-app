ALTER TABLE recurring_bills
  ADD COLUMN IF NOT EXISTS pot_id uuid;

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_pot_or_card_check;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_pot_or_card_check CHECK (
    pot_id IS NULL OR credit_card_id IS NULL
  );

-- Pot deletion clears archived-bill links in the same transaction, so the
-- foreign key only has to reject links that the app did not clear first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recurring_bills_pot_fk'
  ) THEN
    ALTER TABLE recurring_bills
      ADD CONSTRAINT recurring_bills_pot_fk
      FOREIGN KEY (user_id, pot_id)
      REFERENCES pots(user_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS recurring_bills_user_pot_idx
  ON recurring_bills (user_id, pot_id)
  WHERE pot_id IS NOT NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_pot_movement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pot_id uuid;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_pot_requires_movement_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_pot_requires_movement_check CHECK (
    pot_id IS NULL OR is_pot_movement
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_pot_fk'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_pot_fk
      FOREIGN KEY (user_id, pot_id)
      REFERENCES pots(user_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS transactions_user_pot_idx
  ON transactions (user_id, pot_id)
  WHERE pot_id IS NOT NULL;
