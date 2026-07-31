ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS annuality_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS annuality_amount_cents integer,
  ADD COLUMN IF NOT EXISTS annuality_anniversary_month smallint,
  ADD COLUMN IF NOT EXISTS annuality_anniversary_day smallint,
  ADD COLUMN IF NOT EXISTS annuality_payment_count integer;

ALTER TABLE credit_cards
  DROP CONSTRAINT IF EXISTS credit_cards_annuality_check;

ALTER TABLE credit_cards
  ADD CONSTRAINT credit_cards_annuality_check CHECK (
    annuality_enabled = false
    OR (
      annuality_amount_cents IS NOT NULL
      AND annuality_amount_cents > 0
      AND annuality_anniversary_month BETWEEN 1 AND 12
      AND annuality_anniversary_day BETWEEN 1 AND 31
      AND annuality_payment_count BETWEEN 1 AND 12
    )
  );

CREATE TABLE IF NOT EXISTS credit_card_annuality_overrides (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_card_id uuid NOT NULL,
  anniversary_year integer NOT NULL,
  installment_index integer NOT NULL,
  amount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, credit_card_id)
    REFERENCES credit_cards(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT credit_card_annuality_overrides_year_check CHECK (
    anniversary_year BETWEEN 2000 AND 2100
  ),
  CONSTRAINT credit_card_annuality_overrides_index_check CHECK (
    installment_index BETWEEN 1 AND 12
  ),
  CONSTRAINT credit_card_annuality_overrides_amount_check CHECK (
    amount_cents > 0
  ),
  CONSTRAINT credit_card_annuality_overrides_unique_key UNIQUE (
    user_id,
    credit_card_id,
    anniversary_year,
    installment_index
  )
);

CREATE INDEX IF NOT EXISTS credit_card_annuality_overrides_card_year_idx
  ON credit_card_annuality_overrides (
    user_id,
    credit_card_id,
    anniversary_year,
    installment_index
  );

ALTER TABLE credit_card_annuality_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_annuality_overrides FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_card_annuality_overrides_user_owns_data
  ON credit_card_annuality_overrides;
CREATE POLICY credit_card_annuality_overrides_user_owns_data
  ON credit_card_annuality_overrides
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP TRIGGER IF EXISTS credit_card_annuality_overrides_touch_updated_at
  ON credit_card_annuality_overrides;
CREATE TRIGGER credit_card_annuality_overrides_touch_updated_at
  BEFORE UPDATE ON credit_card_annuality_overrides
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();
