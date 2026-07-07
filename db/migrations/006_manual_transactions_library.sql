ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS user_id text REFERENCES profiles(user_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT 'chart-1',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_name_check,
  DROP CONSTRAINT IF EXISTS categories_name_key,
  DROP CONSTRAINT IF EXISTS categories_slug_key,
  DROP CONSTRAINT IF EXISTS categories_slug_check,
  DROP CONSTRAINT IF EXISTS categories_theme_color_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_name_check CHECK (length(trim(name)) > 0 AND length(name) <= 40),
  ADD CONSTRAINT categories_slug_check CHECK (length(trim(slug)) > 0 AND length(slug) <= 60),
  ADD CONSTRAINT categories_theme_color_check CHECK (
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
  );

WITH first_profile AS (
  SELECT user_id
  FROM profiles
  ORDER BY created_at, user_id
  LIMIT 1
)
UPDATE categories
SET user_id = first_profile.user_id
FROM first_profile
WHERE categories.user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_unique
  ON categories (user_id, lower(name))
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_slug_unique
  ON categories (user_id, lower(slug))
  WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS categories_touch_updated_at ON categories;
CREATE TRIGGER categories_touch_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_user_owns_data ON categories;
CREATE POLICY categories_user_owns_data ON categories
  FOR ALL
  USING (user_id = app.current_user_id() OR user_id IS NULL)
  WITH CHECK (user_id = app.current_user_id() OR user_id IS NULL);

ALTER TABLE counterparties
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT 'chart-3',
  ADD COLUMN IF NOT EXISTS notes text,
  ALTER COLUMN avatar_url DROP NOT NULL;

ALTER TABLE counterparties
  DROP CONSTRAINT IF EXISTS counterparties_theme_color_check,
  DROP CONSTRAINT IF EXISTS counterparties_display_name_check;

ALTER TABLE counterparties
  ADD CONSTRAINT counterparties_display_name_check CHECK (length(trim(display_name)) > 0 AND length(display_name) <= 60),
  ADD CONSTRAINT counterparties_theme_color_check CHECK (
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
  );

CREATE UNIQUE INDEX IF NOT EXISTS counterparties_user_display_name_unique
  ON counterparties (user_id, lower(display_name));

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS concept text;

UPDATE transactions
SET concept = COALESCE(
  NULLIF(trim(transactions.description), ''),
  categories.name,
  counterparties.display_name,
  'Manual transaction'
)
FROM categories, counterparties
WHERE transactions.category_id = categories.id
  AND transactions.user_id = counterparties.user_id
  AND transactions.counterparty_id = counterparties.id
  AND (transactions.concept IS NULL OR length(trim(transactions.concept)) = 0);

UPDATE transactions
SET concept = 'Manual transaction'
WHERE concept IS NULL OR length(trim(concept)) = 0;

ALTER TABLE transactions
  ALTER COLUMN concept SET NOT NULL,
  DROP CONSTRAINT IF EXISTS transactions_concept_check,
  ADD CONSTRAINT transactions_concept_check CHECK (length(trim(concept)) > 0 AND length(concept) <= 80);
