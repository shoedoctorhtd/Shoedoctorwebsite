-- Backward-compatible product-content foundation. These nullable fields do not
-- modify any existing product, publication state, inventory, image, order, or
-- payment data. Product facts remain optional and are validated in application
-- code before an administrator can save them.

ALTER TABLE products ADD COLUMN category TEXT
  CHECK (category IS NULL OR category IN (
    'quick_clean', 'cleaning_kits', 'suede_nubuck', 'protection',
    'storage', 'restoration', 'accessories'
  ));

ALTER TABLE products ADD COLUMN compare_at_price_npr INTEGER
  CHECK (compare_at_price_npr IS NULL OR (
    price_npr IS NOT NULL AND compare_at_price_npr > price_npr
  ));

ALTER TABLE products ADD COLUMN details_json TEXT
  CHECK (details_json IS NULL OR json_valid(details_json));

ALTER TABLE products ADD COLUMN badge TEXT
  CHECK (badge IS NULL OR badge IN ('doctors_pick'));

CREATE INDEX IF NOT EXISTS products_status_category_updated_idx
ON products(status, category, updated_at DESC);

PRAGMA optimize;
