-- Product-image storage recovery: retain legacy R2 metadata for operator
-- review, but make all future product image bytes D1 BLOBs. R2 was never
-- enabled for this account, so no object bytes can be migrated.
-- Wrangler executes each D1 migration atomically. Defer foreign-key checks
-- during this table rebuild instead of opening a nested SQL transaction, which
-- local Miniflare correctly rejects.
PRAGMA defer_foreign_keys = true;

-- Renaming product_images would otherwise make these triggers point at the
-- legacy table. Recreate them below against the new BLOB table.
DROP TRIGGER IF EXISTS products_publish_requires_complete_insert;
DROP TRIGGER IF EXISTS products_publish_requires_complete_update;
DROP TRIGGER IF EXISTS product_images_keep_published_product_visible;

-- Keep the old rows intact. They may contain useful object-key and filename
-- metadata, but their external image bytes are intentionally not exposed.
ALTER TABLE product_images RENAME TO product_images_legacy_r2;
DROP INDEX IF EXISTS product_images_product_order_idx;
DROP INDEX IF EXISTS product_images_one_primary_per_product_idx;

CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_data BLOB NOT NULL
    CHECK (length(image_data) > 0 AND length(image_data) <= 512000),
  mime_type TEXT NOT NULL
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL
    CHECK (byte_size > 0 AND byte_size <= 512000 AND byte_size = length(image_data)),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  original_name TEXT,
  alt_text TEXT CHECK (alt_text IS NULL OR length(trim(alt_text)) BETWEEN 1 AND 240),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  uploaded_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX product_images_product_order_idx
ON product_images(product_id, sort_order, created_at);

CREATE UNIQUE INDEX product_images_one_primary_per_product_idx
ON product_images(product_id)
WHERE is_primary = 1;

-- The legacy rows cannot supply an image. Keep their metadata for review but
-- return any affected product to a safe draft state until an admin uploads a
-- real D1 BLOB and deliberately publishes it again.
UPDATE products
SET status = 'draft',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE status = 'published'
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_images.product_id = products.id);

-- Publication remains impossible until a real, local D1 image record exists.
CREATE TRIGGER products_publish_requires_complete_insert
BEFORE INSERT ON products
WHEN NEW.status = 'published' AND (
  length(trim(NEW.name)) < 2
  OR NEW.sku IS NULL OR length(trim(NEW.sku)) < 2
  OR NEW.slug IS NULL OR length(trim(NEW.slug)) < 2
  OR NEW.price_npr IS NULL OR NEW.price_npr <= 0
  OR NEW.stock_quantity IS NULL OR NEW.stock_quantity < 0
  OR NEW.short_description IS NULL OR length(trim(NEW.short_description)) < 2
  OR (SELECT COUNT(*) FROM product_images WHERE product_id = NEW.id) < 1
)
BEGIN
  SELECT RAISE(ABORT, 'published products require name, SKU, slug, price, stock, short description and image');
END;

CREATE TRIGGER products_publish_requires_complete_update
BEFORE UPDATE ON products
WHEN NEW.status = 'published' AND (
  length(trim(NEW.name)) < 2
  OR NEW.sku IS NULL OR length(trim(NEW.sku)) < 2
  OR NEW.slug IS NULL OR length(trim(NEW.slug)) < 2
  OR NEW.price_npr IS NULL OR NEW.price_npr <= 0
  OR NEW.stock_quantity IS NULL OR NEW.stock_quantity < 0
  OR NEW.short_description IS NULL OR length(trim(NEW.short_description)) < 2
  OR (SELECT COUNT(*) FROM product_images WHERE product_id = NEW.id) < 1
)
BEGIN
  SELECT RAISE(ABORT, 'published products require name, SKU, slug, price, stock, short description and image');
END;

CREATE TRIGGER product_images_keep_published_product_visible
BEFORE DELETE ON product_images
WHEN EXISTS (
  SELECT 1 FROM products
  WHERE products.id = OLD.product_id AND products.status = 'published'
) AND (
  SELECT COUNT(*) FROM product_images WHERE product_id = OLD.product_id
) <= 1
BEGIN
  SELECT RAISE(ABORT, 'a published product must retain at least one image');
END;

PRAGMA optimize;
