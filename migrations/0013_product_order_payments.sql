-- QR and COD product payments. This migration deliberately rebuilds the
-- constrained product-order tables because SQLite cannot extend CHECK lists
-- in place. No receipt binary, object key, or public receipt URL is stored.

-- Wrangler executes each D1 migration atomically. Defer foreign-key checks
-- during this table rebuild instead of opening a nested SQL transaction, which
-- local Miniflare correctly rejects.
PRAGMA defer_foreign_keys = true;

DROP TRIGGER IF EXISTS product_order_items_prevent_update;
DROP TRIGGER IF EXISTS product_order_items_prevent_delete;
DROP TRIGGER IF EXISTS inventory_movements_prevent_update;
DROP TRIGGER IF EXISTS inventory_movements_prevent_delete;
DROP TRIGGER IF EXISTS product_order_returns_prevent_update;
DROP TRIGGER IF EXISTS product_order_returns_prevent_delete;

DROP INDEX IF EXISTS product_orders_created_idx;
DROP INDEX IF EXISTS product_orders_channel_status_created_idx;
DROP INDEX IF EXISTS product_orders_payment_created_idx;
DROP INDEX IF EXISTS product_orders_customer_phone_idx;
DROP INDEX IF EXISTS product_orders_customer_name_idx;
DROP INDEX IF EXISTS product_order_items_order_product_uniq;
DROP INDEX IF EXISTS product_order_items_order_idx;
DROP INDEX IF EXISTS product_order_items_product_idx;
DROP INDEX IF EXISTS inventory_movements_product_created_idx;
DROP INDEX IF EXISTS inventory_movements_order_created_idx;
DROP INDEX IF EXISTS inventory_movements_admin_created_idx;
DROP INDEX IF EXISTS product_order_returns_order_product_idx;
DROP INDEX IF EXISTS product_order_notifications_delivery_updated_idx;
DROP INDEX IF EXISTS admin_product_permissions_permission_idx;

ALTER TABLE product_order_items RENAME TO product_order_items_legacy;
ALTER TABLE inventory_movements RENAME TO inventory_movements_legacy;
ALTER TABLE product_order_returns RENAME TO product_order_returns_legacy;
ALTER TABLE product_order_notifications RENAME TO product_order_notifications_legacy;
ALTER TABLE admin_product_permissions RENAME TO admin_product_permissions_legacy;
ALTER TABLE product_orders RENAME TO product_orders_legacy;

CREATE TABLE product_orders (
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'awaiting_payment', 'payment_review', 'confirmed',
    'processing', 'completed', 'cancelled'
  )),
  payment_method TEXT CHECK (payment_method IN ('qr', 'cod') OR payment_method IS NULL),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'unpaid', 'submitted', 'rejected', 'cod_pending',
    'partial', 'paid', 'refunded'
  )),
  payment_amount INTEGER NOT NULL DEFAULT 0 CHECK (payment_amount >= 0),
  payment_access_token_hash TEXT UNIQUE,
  payment_submitted_at TEXT,
  payment_verified_at TEXT,
  payment_verified_by_admin_id TEXT,
  payment_rejection_reason TEXT,
  cod_collected_at TEXT,
  cod_collected_by_admin_id TEXT,
  checkout_idempotency_token TEXT UNIQUE,
  created_by_admin_id TEXT,
  cancellation_reason TEXT,
  cancelled_at TEXT,
  cancelled_by_admin_id TEXT,
  stock_committed_at TEXT,
  stock_commit_operation_id TEXT,
  stock_restored_at TEXT,
  stock_restored_by_admin_id TEXT,
  last_inventory_mutation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (cancelled_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_restored_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_verified_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (cod_collected_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

INSERT INTO product_orders (
  id, public_reference, channel, customer_name, customer_phone, customer_email,
  fulfillment_method, delivery_address, customer_note, subtotal, delivery_charge,
  total, status, payment_method, payment_status, payment_amount,
  payment_access_token_hash, payment_submitted_at, payment_verified_at,
  payment_verified_by_admin_id, payment_rejection_reason, cod_collected_at,
  cod_collected_by_admin_id, checkout_idempotency_token, created_by_admin_id,
  cancellation_reason, cancelled_at, cancelled_by_admin_id, stock_committed_at,
  stock_commit_operation_id, stock_restored_at, stock_restored_by_admin_id,
  last_inventory_mutation_id, created_at, updated_at
)
SELECT
  id, public_reference, channel, customer_name, customer_phone, customer_email,
  fulfillment_method, delivery_address, customer_note, subtotal, delivery_charge,
  total, status, NULL, payment_status, total,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  checkout_idempotency_token, created_by_admin_id, cancellation_reason,
  cancelled_at, cancelled_by_admin_id, created_at, last_inventory_mutation_id,
  stock_restored_at, stock_restored_by_admin_id, last_inventory_mutation_id,
  created_at, updated_at
FROM product_orders_legacy;

CREATE INDEX product_orders_created_idx ON product_orders(created_at DESC);
CREATE INDEX product_orders_channel_status_created_idx ON product_orders(channel, status, created_at DESC);
CREATE INDEX product_orders_payment_created_idx ON product_orders(payment_status, created_at DESC);
CREATE INDEX product_orders_payment_method_status_created_idx ON product_orders(payment_method, payment_status, created_at DESC);
CREATE INDEX product_orders_customer_phone_idx ON product_orders(customer_phone);
CREATE INDEX product_orders_customer_name_idx ON product_orders(customer_name);

CREATE TABLE product_order_items (
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

INSERT INTO product_order_items SELECT * FROM product_order_items_legacy;
CREATE INDEX product_order_items_order_idx ON product_order_items(order_id);
CREATE INDEX product_order_items_product_idx ON product_order_items(product_id, created_at);
CREATE TRIGGER product_order_items_prevent_update BEFORE UPDATE ON product_order_items
BEGIN SELECT RAISE(ABORT, 'product order item snapshots are immutable'); END;
CREATE TRIGGER product_order_items_prevent_delete BEFORE DELETE ON product_order_items
BEGIN SELECT RAISE(ABORT, 'product order item snapshots are immutable'); END;

CREATE TABLE inventory_movements (
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

INSERT INTO inventory_movements SELECT * FROM inventory_movements_legacy;
CREATE INDEX inventory_movements_product_created_idx ON inventory_movements(product_id, created_at DESC);
CREATE INDEX inventory_movements_order_created_idx ON inventory_movements(related_order_id, created_at DESC);
CREATE INDEX inventory_movements_admin_created_idx ON inventory_movements(admin_user_id, created_at DESC);
CREATE TRIGGER inventory_movements_prevent_update BEFORE UPDATE ON inventory_movements
BEGIN SELECT RAISE(ABORT, 'inventory movements are immutable'); END;
CREATE TRIGGER inventory_movements_prevent_delete BEFORE DELETE ON inventory_movements
BEGIN SELECT RAISE(ABORT, 'inventory movements are immutable'); END;

CREATE TABLE product_order_returns (
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

INSERT INTO product_order_returns SELECT * FROM product_order_returns_legacy;
CREATE INDEX product_order_returns_order_product_idx ON product_order_returns(order_id, product_id, created_at DESC);
CREATE TRIGGER product_order_returns_prevent_update BEFORE UPDATE ON product_order_returns
BEGIN SELECT RAISE(ABORT, 'product returns are immutable'); END;
CREATE TRIGGER product_order_returns_prevent_delete BEFORE DELETE ON product_order_returns
BEGIN SELECT RAISE(ABORT, 'product returns are immutable'); END;

CREATE TABLE product_order_notifications (
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

INSERT INTO product_order_notifications SELECT * FROM product_order_notifications_legacy;
CREATE INDEX product_order_notifications_delivery_updated_idx ON product_order_notifications(delivery_status, updated_at DESC);

CREATE TABLE admin_product_permissions (
  admin_user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN (
    'view_products', 'manage_products', 'change_product_prices',
    'manage_product_images', 'view_inventory', 'adjust_inventory',
    'record_offline_sales', 'view_product_orders', 'manage_product_orders',
    'cancel_product_orders', 'verify_product_payments'
  )),
  granted_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (admin_user_id, permission),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

INSERT INTO admin_product_permissions SELECT * FROM admin_product_permissions_legacy;
CREATE INDEX admin_product_permissions_permission_idx ON admin_product_permissions(permission, admin_user_id);

CREATE TABLE product_payment_receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  original_display_filename TEXT NOT NULL,
  attachment_filename TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 3145728),
  sha256_checksum TEXT NOT NULL,
  transaction_reference TEXT,
  email_delivery_status TEXT NOT NULL CHECK (email_delivery_status IN ('sending', 'email_failed', 'emailed', 'verified', 'rejected')),
  gmail_message_id TEXT,
  submission_idempotency_key TEXT NOT NULL UNIQUE,
  submitted_at TEXT,
  verified_at TEXT,
  verifying_admin_id TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES product_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (verifying_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  UNIQUE(order_id, sha256_checksum)
);

CREATE INDEX product_payment_receipts_order_created_idx ON product_payment_receipts(order_id, created_at DESC);
CREATE INDEX product_payment_receipts_delivery_status_idx ON product_payment_receipts(email_delivery_status, updated_at DESC);

DROP TABLE product_order_items_legacy;
DROP TABLE inventory_movements_legacy;
DROP TABLE product_order_returns_legacy;
DROP TABLE product_order_notifications_legacy;
DROP TABLE admin_product_permissions_legacy;
DROP TABLE product_orders_legacy;

PRAGMA optimize;
