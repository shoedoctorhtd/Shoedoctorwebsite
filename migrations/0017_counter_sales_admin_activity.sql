-- Counter sales reuse product_orders (channel = 'offline'), order items, and
-- inventory_movements. No second stock balance or transaction ledger.
CREATE INDEX IF NOT EXISTS product_orders_channel_created_idx
ON product_orders(channel, created_at DESC);
ALTER TABLE product_orders ADD COLUMN checkout_request_fingerprint TEXT;

-- Every important authenticated business audit atomically creates its durable
-- management outbox event. Existing explicit alert builders adopt this event.
-- Read/search/login/retry audits do not generate activity mail.
CREATE TRIGGER IF NOT EXISTS audit_logs_queue_admin_activity
AFTER INSERT ON audit_logs
WHEN NEW.actor_type = 'admin'
  AND NEW.action NOT IN ('PRODUCT_STOCK_RESTORED')
  AND (
    NEW.action GLOB '*_CREATED' OR NEW.action GLOB '*_UPDATED'
    OR NEW.action GLOB '*_CHANGED' OR NEW.action GLOB '*_DELETED'
    OR NEW.action GLOB '*_ARCHIVED' OR NEW.action GLOB '*_RESTORED'
    OR NEW.action GLOB '*_PUBLISHED' OR NEW.action GLOB '*_UNPUBLISHED'
    OR NEW.action GLOB '*_REVERSED' OR NEW.action GLOB '*_CANCELLED'
    OR NEW.action GLOB '*_CORRECTED'
    OR NEW.action GLOB '*_RESTOCKED' OR NEW.action GLOB '*_NOT_RESTOCKED'
    OR NEW.action GLOB '*_RECORDED' OR NEW.action GLOB '*_APPROVED'
    OR NEW.action GLOB '*_UPLOADED' OR NEW.action GLOB '*_REPLACED'
    OR NEW.action GLOB '*_REJECTED' OR NEW.action GLOB '*_COLLECTED'
    OR NEW.action GLOB '*_ACTIVATED' OR NEW.action GLOB '*_DEACTIVATED'
    OR NEW.action IN ('PRODUCT_INITIAL_STOCK_SET', 'ADMIN_ACCESS_RESET',
      'PRODUCT_STOCK_ADDED', 'PRODUCT_STOCK_DAMAGED', 'PRODUCT_STOCK_MISSING',
      'PRODUCT_STOCK_CORRECTED', 'BOOKING_OPERATIONAL_NOTE_ADDED')
  )
BEGIN
  INSERT INTO owner_alert_events (
    id, audit_log_id, event_key, alert_type, delivery_status, attempt_count,
    created_at, updated_at
  ) VALUES (
    'activity:' || NEW.id, NEW.id, 'audit:' || NEW.id, NEW.action,
    'pending', 1, NEW.created_at, NEW.created_at
  );
END;
