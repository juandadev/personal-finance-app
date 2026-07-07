ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_voucher_expense boolean NOT NULL DEFAULT false;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_voucher_expense_check,
  ADD CONSTRAINT transactions_voucher_expense_check CHECK (
    is_voucher_expense = false OR amount_cents < 0
  );
