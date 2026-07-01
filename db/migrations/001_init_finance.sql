CREATE SCHEMA IF NOT EXISTS app;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY,
  display_name text,
  default_currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_default_currency_check CHECK (default_currency IN ('USD', 'MXN'))
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_check CHECK (
    name IN (
      'Entertainment',
      'Bills',
      'Groceries',
      'Dining Out',
      'Transportation',
      'Personal Care',
      'Emergency Fund',
      'Education',
      'Lifestyle',
      'Shopping',
      'General'
    )
  )
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  current_balance_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT accounts_type_check CHECK (type IN ('checking', 'savings', 'credit')),
  CONSTRAINT accounts_currency_check CHECK (currency IN ('USD', 'MXN'))
);

CREATE TABLE IF NOT EXISTS account_summaries (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  period text NOT NULL,
  income_cents integer NOT NULL DEFAULT 0,
  expense_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, account_id, period),
  FOREIGN KEY (user_id, account_id)
    REFERENCES accounts(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT account_summaries_period_check CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT account_summaries_income_check CHECK (income_cents >= 0),
  CONSTRAINT account_summaries_expense_check CHECK (expense_cents >= 0)
);

CREATE TABLE IF NOT EXISTS counterparties (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  avatar_url text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT counterparties_type_check CHECK (type IN ('person', 'merchant'))
);

CREATE TABLE IF NOT EXISTS transactions (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  counterparty_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id),
  amount_cents integer NOT NULL,
  posted_at date NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, account_id)
    REFERENCES accounts(user_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id, counterparty_id)
    REFERENCES counterparties(user_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS budgets (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id),
  period text NOT NULL,
  limit_cents integer NOT NULL,
  theme_color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, category_id, period),
  CONSTRAINT budgets_period_check CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT budgets_limit_check CHECK (limit_cents > 0),
  CONSTRAINT budgets_theme_color_check CHECK (
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

CREATE TABLE IF NOT EXISTS budget_summaries (
  user_id text NOT NULL,
  budget_id uuid NOT NULL,
  spent_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, budget_id),
  FOREIGN KEY (user_id, budget_id)
    REFERENCES budgets(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT budget_summaries_spent_check CHECK (spent_cents >= 0)
);

CREATE TABLE IF NOT EXISTS pots (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  balance_cents integer NOT NULL DEFAULT 0,
  target_cents integer NOT NULL,
  theme_color text NOT NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT pots_name_check CHECK (length(trim(name)) > 0 AND length(name) <= 30),
  CONSTRAINT pots_balance_check CHECK (balance_cents >= 0),
  CONSTRAINT pots_target_check CHECK (target_cents > 0),
  CONSTRAINT pots_theme_color_check CHECK (
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

CREATE UNIQUE INDEX IF NOT EXISTS pots_user_name_unique
  ON pots (user_id, lower(name));

CREATE TABLE IF NOT EXISTS recurring_bills (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  counterparty_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  frequency text NOT NULL,
  due_day_of_month integer NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, counterparty_id)
    REFERENCES counterparties(user_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT recurring_bills_amount_check CHECK (amount_cents > 0),
  CONSTRAINT recurring_bills_currency_check CHECK (currency IN ('USD', 'MXN')),
  CONSTRAINT recurring_bills_frequency_check CHECK (frequency = 'monthly'),
  CONSTRAINT recurring_bills_due_day_check CHECK (due_day_of_month BETWEEN 1 AND 31),
  CONSTRAINT recurring_bills_status_check CHECK (status IN ('paid', 'upcoming', 'due-soon'))
);

CREATE INDEX IF NOT EXISTS transactions_user_posted_at_idx
  ON transactions (user_id, posted_at DESC, id);

CREATE INDEX IF NOT EXISTS budgets_user_period_idx
  ON budgets (user_id, period, category_id);

CREATE INDEX IF NOT EXISTS recurring_bills_user_due_day_idx
  ON recurring_bills (user_id, due_day_of_month, id);

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS accounts_touch_updated_at ON accounts;
CREATE TRIGGER accounts_touch_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS account_summaries_touch_updated_at ON account_summaries;
CREATE TRIGGER account_summaries_touch_updated_at
  BEFORE UPDATE ON account_summaries
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS counterparties_touch_updated_at ON counterparties;
CREATE TRIGGER counterparties_touch_updated_at
  BEFORE UPDATE ON counterparties
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS transactions_touch_updated_at ON transactions;
CREATE TRIGGER transactions_touch_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS budgets_touch_updated_at ON budgets;
CREATE TRIGGER budgets_touch_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS budget_summaries_touch_updated_at ON budget_summaries;
CREATE TRIGGER budget_summaries_touch_updated_at
  BEFORE UPDATE ON budget_summaries
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS pots_touch_updated_at ON pots;
CREATE TRIGGER pots_touch_updated_at
  BEFORE UPDATE ON pots
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS recurring_bills_touch_updated_at ON recurring_bills;
CREATE TRIGGER recurring_bills_touch_updated_at
  BEFORE UPDATE ON recurring_bills
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;

ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE account_summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE counterparties FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE pots FORCE ROW LEVEL SECURITY;
ALTER TABLE recurring_bills FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_user_owns_data ON profiles;
CREATE POLICY profiles_user_owns_data ON profiles
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS accounts_user_owns_data ON accounts;
CREATE POLICY accounts_user_owns_data ON accounts
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS account_summaries_user_owns_data ON account_summaries;
CREATE POLICY account_summaries_user_owns_data ON account_summaries
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS counterparties_user_owns_data ON counterparties;
CREATE POLICY counterparties_user_owns_data ON counterparties
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS transactions_user_owns_data ON transactions;
CREATE POLICY transactions_user_owns_data ON transactions
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS budgets_user_owns_data ON budgets;
CREATE POLICY budgets_user_owns_data ON budgets
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS budget_summaries_user_owns_data ON budget_summaries;
CREATE POLICY budget_summaries_user_owns_data ON budget_summaries
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS pots_user_owns_data ON pots;
CREATE POLICY pots_user_owns_data ON pots
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS recurring_bills_user_owns_data ON recurring_bills;
CREATE POLICY recurring_bills_user_owns_data ON recurring_bills
  FOR ALL
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
