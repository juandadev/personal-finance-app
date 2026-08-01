CREATE TABLE IF NOT EXISTS credit_cards (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  issuer text NOT NULL,
  network text NOT NULL,
  last_four text NOT NULL,
  expiration_month integer NOT NULL,
  expiration_year integer NOT NULL,
  credit_limit_cents integer NOT NULL,
  closing_day_of_month integer NOT NULL,
  payment_due_day_of_month integer NOT NULL,
  theme_color text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT credit_cards_nickname_check CHECK (length(trim(nickname)) > 0 AND length(nickname) <= 40),
  CONSTRAINT credit_cards_issuer_check CHECK (length(trim(issuer)) > 0 AND length(issuer) <= 40),
  CONSTRAINT credit_cards_network_check CHECK (length(trim(network)) > 0 AND length(network) <= 30),
  CONSTRAINT credit_cards_last_four_check CHECK (last_four ~ '^[0-9]{4}$'),
  CONSTRAINT credit_cards_expiration_month_check CHECK (expiration_month BETWEEN 1 AND 12),
  CONSTRAINT credit_cards_expiration_year_check CHECK (expiration_year BETWEEN 2020 AND 2100),
  CONSTRAINT credit_cards_credit_limit_check CHECK (credit_limit_cents > 0),
  CONSTRAINT credit_cards_closing_day_check CHECK (closing_day_of_month BETWEEN 1 AND 31),
  CONSTRAINT credit_cards_payment_due_day_check CHECK (payment_due_day_of_month BETWEEN 1 AND 31),
  CONSTRAINT credit_cards_theme_color_check CHECK (
    theme_color IN (
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
      'destructive',
      'finance-purple',
      'finance-turquoise',
      'finance-brown',
      'finance-magenta',
      'finance-blue',
      'finance-grey',
      'finance-army',
      'finance-pink',
      'finance-yellow',
      'finance-orange'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_cards_user_nickname_unique
  ON credit_cards (user_id, lower(nickname));

CREATE TABLE IF NOT EXISTS credit_card_statements (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_card_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_due_date date NOT NULL,
  statement_amount_cents integer NOT NULL DEFAULT 0,
  lifecycle_status text NOT NULL DEFAULT 'open',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, credit_card_id, period_start, period_end),
  FOREIGN KEY (user_id, credit_card_id)
    REFERENCES credit_cards(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT credit_card_statements_period_check CHECK (period_start <= period_end),
  CONSTRAINT credit_card_statements_amount_check CHECK (statement_amount_cents >= 0),
  CONSTRAINT credit_card_statements_lifecycle_status_check CHECK (lifecycle_status IN ('open', 'closed', 'paid')),
  CONSTRAINT credit_card_statements_paid_check CHECK (
    (lifecycle_status = 'paid' AND paid_at IS NOT NULL)
    OR (lifecycle_status <> 'paid' AND paid_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS credit_card_statements_user_due_date_idx
  ON credit_card_statements (user_id, payment_due_date, id);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank_account',
  ADD COLUMN IF NOT EXISTS credit_card_id uuid,
  ADD COLUMN IF NOT EXISTS credit_card_statement_id uuid;

UPDATE transactions
SET payment_method = CASE
  WHEN is_voucher_expense THEN 'voucher'
  ELSE 'bank_account'
END
WHERE payment_method = 'bank_account';

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check,
  DROP CONSTRAINT IF EXISTS transactions_credit_card_method_check,
  ADD CONSTRAINT transactions_payment_method_check CHECK (
    payment_method IN ('bank_account', 'credit_card', 'voucher', 'credit_card_payment')
  ),
  ADD CONSTRAINT transactions_credit_card_method_check CHECK (
    (
      payment_method = 'credit_card'
      AND amount_cents < 0
      AND credit_card_id IS NOT NULL
      AND credit_card_statement_id IS NOT NULL
    )
    OR (
      payment_method = 'credit_card_payment'
      AND amount_cents < 0
      AND credit_card_id IS NOT NULL
      AND credit_card_statement_id IS NOT NULL
    )
    OR (
      payment_method IN ('bank_account', 'voucher')
      AND credit_card_id IS NULL
      AND credit_card_statement_id IS NULL
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_credit_card_fk'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_credit_card_fk
      FOREIGN KEY (user_id, credit_card_id)
      REFERENCES credit_cards(user_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_credit_card_statement_fk'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_credit_card_statement_fk
      FOREIGN KEY (user_id, credit_card_statement_id)
      REFERENCES credit_card_statements(user_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS credit_card_payments (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_card_id uuid NOT NULL,
  statement_id uuid NOT NULL,
  source_account_id uuid NOT NULL,
  cashflow_transaction_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  paid_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, statement_id),
  UNIQUE (user_id, cashflow_transaction_id),
  FOREIGN KEY (user_id, credit_card_id)
    REFERENCES credit_cards(user_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (user_id, statement_id)
    REFERENCES credit_card_statements(user_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (user_id, source_account_id)
    REFERENCES accounts(user_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (user_id, cashflow_transaction_id)
    REFERENCES transactions(user_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT credit_card_payments_amount_check CHECK (amount_cents > 0)
);

DROP TRIGGER IF EXISTS credit_cards_touch_updated_at ON credit_cards;
CREATE TRIGGER credit_cards_touch_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS credit_card_statements_touch_updated_at ON credit_card_statements;
CREATE TRIGGER credit_card_statements_touch_updated_at
  BEFORE UPDATE ON credit_card_statements
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE credit_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_card_statements FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_card_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_cards_user_owns_data ON credit_cards;
CREATE POLICY credit_cards_user_owns_data ON credit_cards
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS credit_card_statements_user_owns_data ON credit_card_statements;
CREATE POLICY credit_card_statements_user_owns_data ON credit_card_statements
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS credit_card_payments_user_owns_data ON credit_card_payments;
CREATE POLICY credit_card_payments_user_owns_data ON credit_card_payments
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
