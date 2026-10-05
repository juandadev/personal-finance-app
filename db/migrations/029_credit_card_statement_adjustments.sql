ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check,
  DROP CONSTRAINT IF EXISTS transactions_credit_card_method_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_payment_method_check CHECK (
    payment_method IN (
      'bank_account',
      'credit_card',
      'voucher',
      'credit_card_payment',
      'credit_card_statement_adjustment'
    )
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
      payment_method = 'credit_card_statement_adjustment'
      AND amount_cents <> 0
      AND credit_card_id IS NOT NULL
      AND credit_card_statement_id IS NOT NULL
    )
    OR (
      payment_method IN ('bank_account', 'voucher')
      AND credit_card_id IS NULL
      AND credit_card_statement_id IS NULL
    )
  );
