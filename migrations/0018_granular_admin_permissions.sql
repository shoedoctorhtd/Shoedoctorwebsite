-- Extend the existing product grants into one normalized access catalogue.
-- Apply before deploying the new guards. No accounts, passwords, or sessions
-- are removed. Super Admin access remains implicit in the server policy.
CREATE TABLE admin_permissions (
  admin_user_id TEXT NOT NULL,
  permission_key TEXT NOT NULL CHECK (permission_key IN (
    'dashboard', 'bookings', 'counter_booking', 'counter_inventory',
    'services', 'donations', 'notifications', 'audit_logs', 'admin_management',
    'view_products', 'manage_products', 'change_product_prices', 'manage_product_images',
    'view_inventory', 'adjust_inventory', 'record_offline_sales', 'view_product_orders',
    'manage_product_orders', 'cancel_product_orders', 'verify_product_payments'
  )),
  granted_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (admin_user_id, permission_key),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX admin_permissions_key_idx ON admin_permissions(permission_key, admin_user_id);

-- Preserve every fine-grained product grant exactly, including its grantor.
INSERT INTO admin_permissions
SELECT admin_user_id, permission, granted_by_admin_id, created_at, created_at
FROM admin_product_permissions;

-- These operations were already available to every normal Admin before 0018.
-- Record explicit compatibility grants once; new Admins start with no access.
-- NULL grantor denotes this migration, not an invented Super Admin actor.
INSERT OR IGNORE INTO admin_permissions
SELECT u.id, p.permission_key, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM admin_users u CROSS JOIN (
  SELECT 'dashboard' AS permission_key UNION ALL SELECT 'bookings'
  UNION ALL SELECT 'counter_booking' UNION ALL SELECT 'counter_inventory'
  UNION ALL SELECT 'record_offline_sales'
) p WHERE u.role = 'admin';

-- Keep legacy action grants usable through the corresponding guarded screens.
-- New actions require their parent module; no existing write grant is removed.
INSERT OR IGNORE INTO admin_permissions
SELECT DISTINCT admin_user_id,
  CASE
    WHEN permission_key IN ('manage_products', 'change_product_prices', 'manage_product_images') THEN 'view_products'
    WHEN permission_key = 'adjust_inventory' THEN 'view_inventory'
    ELSE 'view_product_orders'
  END,
  NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM admin_permissions WHERE permission_key IN (
  'manage_products', 'change_product_prices', 'manage_product_images', 'adjust_inventory',
  'manage_product_orders', 'cancel_product_orders', 'verify_product_payments'
);

-- All readers/writers now use admin_permissions; there is no parallel grant store.
DROP TABLE admin_product_permissions;

-- Keep old deployed readers working during the migration/deployment window.
-- This is a read-only view of the same rows, not a second permission store.
CREATE VIEW admin_product_permissions AS
SELECT admin_user_id, permission_key AS permission, granted_by_admin_id, created_at
FROM admin_permissions WHERE permission_key IN (
  'view_products', 'manage_products', 'change_product_prices', 'manage_product_images',
  'view_inventory', 'adjust_inventory', 'record_offline_sales', 'view_product_orders',
  'manage_product_orders', 'cancel_product_orders', 'verify_product_payments'
);
