CREATE OR REPLACE FUNCTION app.inherit_profile_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  SELECT profiles.default_currency
  INTO NEW.currency
  FROM public.profiles
  WHERE profiles.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %.', NEW.user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app.inherit_profile_currency() FROM PUBLIC;

CREATE OR REPLACE FUNCTION app.propagate_profile_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.default_currency IS DISTINCT FROM OLD.default_currency THEN
    UPDATE public.accounts
    SET currency = NEW.default_currency
    WHERE user_id = NEW.user_id
      AND currency IS DISTINCT FROM NEW.default_currency;

    UPDATE public.recurring_bills
    SET currency = NEW.default_currency
    WHERE user_id = NEW.user_id
      AND currency IS DISTINCT FROM NEW.default_currency;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app.propagate_profile_currency() FROM PUBLIC;

DROP TRIGGER IF EXISTS accounts_inherit_profile_currency ON accounts;
CREATE TRIGGER accounts_inherit_profile_currency
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION app.inherit_profile_currency();

DROP TRIGGER IF EXISTS recurring_bills_inherit_profile_currency ON recurring_bills;
CREATE TRIGGER recurring_bills_inherit_profile_currency
  BEFORE INSERT OR UPDATE ON recurring_bills
  FOR EACH ROW
  EXECUTE FUNCTION app.inherit_profile_currency();

DROP TRIGGER IF EXISTS profiles_propagate_profile_currency ON profiles;
CREATE TRIGGER profiles_propagate_profile_currency
  AFTER UPDATE OF default_currency ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION app.propagate_profile_currency();

ALTER TABLE accounts
  ALTER COLUMN currency DROP DEFAULT;

ALTER TABLE recurring_bills
  ALTER COLUMN currency DROP DEFAULT;
