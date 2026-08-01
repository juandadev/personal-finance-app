ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'USD';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_default_currency_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_default_currency_check
  CHECK (default_currency IN ('USD', 'MXN'));

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_currency_check;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_currency_check
  CHECK (currency IN ('USD', 'MXN'));

ALTER TABLE recurring_bills
  DROP CONSTRAINT IF EXISTS recurring_bills_currency_check;

ALTER TABLE recurring_bills
  ADD CONSTRAINT recurring_bills_currency_check
  CHECK (currency IN ('USD', 'MXN'));

DO $$
DECLARE
  fallback_user_id text := 'b2ff9df5-5d66-4614-a31f-8911d124bd78';
  target_user_id text;
  target_display_name text;
BEGIN
  SELECT id::text, COALESCE(name, email)
  INTO target_user_id, target_display_name
  FROM neon_auth."user"
  WHERE email = 'juan@test.com';

  target_user_id := COALESCE(target_user_id, fallback_user_id);
  target_display_name := COALESCE(target_display_name, 'juan@test.com');

  IF target_user_id IS NOT NULL THEN
    PERFORM set_config('app.current_user_id', target_user_id, true);

    INSERT INTO profiles (user_id, display_name, default_currency)
    VALUES (target_user_id, target_display_name, 'MXN')
    ON CONFLICT (user_id)
    DO UPDATE SET default_currency = excluded.default_currency;
  END IF;
END $$;
