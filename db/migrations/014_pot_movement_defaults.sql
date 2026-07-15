ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_primary_cash_check,
  ADD CONSTRAINT accounts_primary_cash_check CHECK (
    NOT is_primary OR type IN ('checking', 'savings')
  );

WITH primary_cash_accounts AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM accounts
  WHERE type IN ('checking', 'savings')
  ORDER BY user_id, id
)
UPDATE accounts
SET is_primary = true
FROM primary_cash_accounts
WHERE accounts.user_id = primary_cash_accounts.user_id
  AND accounts.id = primary_cash_accounts.id
  AND NOT accounts.is_primary;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_primary_cash_unique
  ON accounts (user_id)
  WHERE is_primary;

ALTER TABLE counterparties
  ADD COLUMN IF NOT EXISTS is_account_owner boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS counterparties_user_account_owner_unique
  ON counterparties (user_id)
  WHERE is_account_owner;

INSERT INTO counterparties (
  user_id,
  display_name,
  avatar_url,
  type,
  theme_color,
  notes,
  is_account_owner
)
SELECT
  profiles.user_id,
  'Juan Martinez',
  NULL,
  'person',
  'finance-grey',
  'Account owner',
  true
FROM profiles
WHERE NOT EXISTS (
  SELECT 1
  FROM counterparties
  WHERE counterparties.user_id = profiles.user_id
    AND counterparties.is_account_owner
)
ON CONFLICT (user_id, lower(display_name))
DO UPDATE SET is_account_owner = true;
