ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_name_check;

INSERT INTO categories (id, name, slug)
VALUES (
  'e61dfd83-bef1-4b8a-bdb0-9d3ba30f4f5f',
  'Emergency Fund',
  'emergency-fund'
)
ON CONFLICT (id)
DO UPDATE SET
  name = excluded.name,
  slug = excluded.slug;
