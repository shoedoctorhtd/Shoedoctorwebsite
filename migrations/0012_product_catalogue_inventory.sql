-- Product catalogue, immutable order snapshots, and append-only inventory.
-- This is intentionally additive: booking, donation, admin, and notification
-- records remain independent from shop orders.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  price_npr INTEGER CHECK (price_npr IS NULL OR price_npr > 0),
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  last_inventory_mutation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS products_status_featured_updated_idx
ON products(status, featured, updated_at DESC);

CREATE INDEX IF NOT EXISTS products_stock_status_idx
ON products(status, stock_quantity, low_stock_threshold);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE
    CHECK (object_key NOT LIKE '/%' AND object_key NOT LIKE '%..%'),
  original_name TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_images_product_order_idx
ON product_images(product_id, sort_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product_idx
ON product_images(product_id)
WHERE is_primary = 1;

-- Publication must remain safe even if a privileged caller bypasses the UI.
CREATE TRIGGER IF NOT EXISTS products_publish_requires_complete_insert
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

CREATE TRIGGER IF NOT EXISTS products_publish_requires_complete_update
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

CREATE TRIGGER IF NOT EXISTS product_images_keep_published_product_visible
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

CREATE TABLE IF NOT EXISTS product_orders (
  id TEXT PRIMARY KEY,
  public_reference TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('online', 'offline')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  fulfillment_method TEXT NOT NULL CHECK (fulfillment_method IN ('delivery', 'collection')),
  delivery_address TEXT,
  customer_note TEXT,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  delivery_charge INTEGER NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'unpaid', 'partial', 'paid', 'refunded')),
  checkout_idempotency_token TEXT UNIQUE,
  created_by_admin_id TEXT,
  cancellation_reason TEXT,
  cancelled_at TEXT,
  cancelled_by_admin_id TEXT,
  stock_restored_at TEXT,
  stock_restored_by_admin_id TEXT,
  last_inventory_mutation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (cancelled_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_restored_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_orders_created_idx
ON product_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS product_orders_channel_status_created_idx
ON product_orders(channel, status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_orders_payment_created_idx
ON product_orders(payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_orders_customer_phone_idx
ON product_orders(customer_phone);

CREATE INDEX IF NOT EXISTS product_orders_customer_name_idx
ON product_orders(customer_name);

CREATE TABLE IF NOT EXISTS product_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_price_npr INTEGER NOT NULL CHECK (unit_price_npr > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  line_total_npr INTEGER NOT NULL CHECK (line_total_npr = unit_price_npr * quantity),
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES product_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE(order_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_order_items_order_idx
ON product_order_items(order_id);

CREATE INDEX IF NOT EXISTS product_order_items_product_idx
ON product_order_items(product_id, created_at);

CREATE TRIGGER IF NOT EXISTS product_order_items_prevent_update
BEFORE UPDATE ON product_order_items
BEGIN
  SELECT RAISE(ABORT, 'product order item snapshots are immutable');
END;

CREATE TRIGGER IF NOT EXISTS product_order_items_prevent_delete
BEFORE DELETE ON product_order_items
BEGIN
  SELECT RAISE(ABORT, 'product order item snapshots are immutable');
END;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  stock_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
  resulting_stock INTEGER NOT NULL CHECK (resulting_stock >= 0),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'initial_stock', 'restock', 'damaged', 'missing', 'count_correction',
    'online_sale', 'offline_sale', 'order_cancellation_restore',
    'customer_return_restock', 'customer_return_not_restock'
  )),
  related_order_id TEXT,
  source_id TEXT,
  admin_user_id TEXT,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (related_order_id) REFERENCES product_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CHECK (resulting_stock = previous_stock + stock_change),
  CHECK (stock_change <> 0 OR movement_type = 'customer_return_not_restock')
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx
ON inventory_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_movements_order_created_idx
ON inventory_movements(related_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_movements_admin_created_idx
ON inventory_movements(admin_user_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS inventory_movements_prevent_update
BEFORE UPDATE ON inventory_movements
BEGIN
  SELECT RAISE(ABORT, 'inventory movements are immutable');
END;

CREATE TRIGGER IF NOT EXISTS inventory_movements_prevent_delete
BEFORE DELETE ON inventory_movements
BEGIN
  SELECT RAISE(ABORT, 'inventory movements are immutable');
END;

CREATE TABLE IF NOT EXISTS product_order_returns (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  restock INTEGER NOT NULL CHECK (restock IN (0, 1)),
  reason TEXT NOT NULL,
  admin_user_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES product_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_order_returns_order_product_idx
ON product_order_returns(order_id, product_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS product_order_returns_prevent_update
BEFORE UPDATE ON product_order_returns
BEGIN
  SELECT RAISE(ABORT, 'product returns are immutable');
END;

CREATE TRIGGER IF NOT EXISTS product_order_returns_prevent_delete
BEFORE DELETE ON product_order_returns
BEGIN
  SELECT RAISE(ABORT, 'product returns are immutable');
END;

-- Separate from booking_notifications: each product-order recipient/type has
-- its own durable, idempotent outbox record.
CREATE TABLE IF NOT EXISTS product_order_notifications (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  recipient_kind TEXT NOT NULL CHECK (recipient_kind IN ('owner', 'customer')),
  recipient_email TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('order_created')),
  event_key TEXT NOT NULL UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_summary TEXT,
  sent_at TEXT,
  lease_token TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES product_orders(id) ON DELETE RESTRICT,
  UNIQUE(order_id, recipient_kind, notification_type)
);

CREATE INDEX IF NOT EXISTS product_order_notifications_delivery_updated_idx
ON product_order_notifications(delivery_status, updated_at DESC);

-- Granular shop permissions are additive to the existing role/session model.
-- Super Admins receive every product permission in application code; normal
-- Admins need one explicit row for every capability.
CREATE TABLE IF NOT EXISTS admin_product_permissions (
  admin_user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN (
    'view_products', 'manage_products', 'change_product_prices',
    'manage_product_images', 'view_inventory', 'adjust_inventory',
    'record_offline_sales', 'view_product_orders', 'manage_product_orders',
    'cancel_product_orders'
  )),
  granted_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (admin_user_id, permission),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS admin_product_permissions_permission_idx
ON admin_product_permissions(permission, admin_user_id);

-- Idempotent starter draft records. No price, stock, description, or image is
-- invented; an administrator completes those fields before publication.
INSERT OR IGNORE INTO products (
  id, name, stock_quantity, low_stock_threshold, status, featured, created_at, updated_at
) VALUES
  ('starter-suede-eraser', 'Suede Eraser', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-shoe-cleaning-kit', 'Shoe Cleaning Kit', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-shoe-cover', 'Shoe Cover', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-crease-protector', 'Crease Protector', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-shoe-bag', 'Shoe Bag', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-white-paint-filler', 'White Paint/Filler', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('starter-shoe-unyellow', 'Shoe Unyellow', NULL, 0, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

PRAGMA optimize;
