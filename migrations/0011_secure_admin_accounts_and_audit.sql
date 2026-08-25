-- Individual administrator accounts, revocable opaque sessions, and an
-- append-only audit trail.  This migration is deliberately additive: existing
-- bookings, pairs, status history, notifications, customer records, and CSR
-- records remain untouched and legacy rows retain NULL actor attribution.

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by_admin_id TEXT,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  last_mutation_id TEXT,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS admin_users_active_role_idx
ON admin_users(active, role);

-- This is a database-level guard as well as an application guard. It closes
-- the race where two concurrent requests both try to remove the last active
-- Super Admin.
CREATE TRIGGER IF NOT EXISTS admin_users_prevent_final_super_deactivation
BEFORE UPDATE OF active ON admin_users
WHEN OLD.active = 1
  AND OLD.role = 'super_admin'
  AND NEW.active = 0
  AND (SELECT COUNT(*) FROM admin_users WHERE active = 1 AND role = 'super_admin') <= 1
BEGIN
  SELECT RAISE(ABORT, 'the final active Super Admin cannot be deactivated');
END;

CREATE TRIGGER IF NOT EXISTS admin_users_prevent_final_super_demotion
BEFORE UPDATE OF role ON admin_users
WHEN OLD.active = 1
  AND OLD.role = 'super_admin'
  AND NEW.role <> 'super_admin'
  AND (SELECT COUNT(*) FROM admin_users WHERE active = 1 AND role = 'super_admin') <= 1
BEGIN
  SELECT RAISE(ABORT, 'the final active Super Admin cannot be demoted');
END;

CREATE TRIGGER IF NOT EXISTS admin_users_prevent_final_super_delete
BEFORE DELETE ON admin_users
WHEN OLD.active = 1
  AND OLD.role = 'super_admin'
  AND (SELECT COUNT(*) FROM admin_users WHERE active = 1 AND role = 'super_admin') <= 1
BEGIN
  SELECT RAISE(ABORT, 'the final active Super Admin cannot be deleted');
END;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  last_mutation_id TEXT,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_active_idx
ON admin_sessions(admin_user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx
ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_auth_settings (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  bootstrap_completed_at TEXT,
  shared_login_disabled_at TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_auth_settings (singleton, updated_at)
VALUES (1, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS admin_login_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  blocked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS admin_login_rate_limits_blocked_idx
ON admin_login_rate_limits(blocked_until);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'customer', 'system', 'legacy')),
  admin_user_id TEXT,
  administrator_name_snapshot TEXT,
  administrator_email_snapshot TEXT,
  administrator_role_snapshot TEXT CHECK (administrator_role_snapshot IS NULL OR administrator_role_snapshot IN ('super_admin', 'admin')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  booking_reference TEXT,
  pair_reference TEXT,
  previous_values TEXT,
  new_values TEXT,
  changed_fields TEXT NOT NULL DEFAULT '[]',
  reason TEXT,
  session_id TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES admin_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_admin_created_idx
ON audit_logs(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_idx
ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_booking_reference_created_idx
ON audit_logs(booking_reference, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_request_id_created_idx
ON audit_logs(request_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs are immutable');
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs are immutable');
END;

-- High-risk owner alerts use their own durable outbox.  Do not overload
-- booking_notifications, which is exclusively for customer status emails.
CREATE TABLE IF NOT EXISTS owner_alert_events (
  id TEXT PRIMARY KEY,
  audit_log_id TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL UNIQUE,
  alert_type TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_summary TEXT,
  sent_at TEXT,
  lease_token TEXT,
  lease_expires_at TEXT,
  last_mutation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS owner_alert_events_delivery_updated_idx
ON owner_alert_events(delivery_status, updated_at DESC);

ALTER TABLE bookings ADD COLUMN created_source TEXT
  CHECK (created_source IS NULL OR created_source IN ('customer', 'admin', 'system', 'legacy'));
ALTER TABLE bookings ADD COLUMN created_by_admin_id TEXT;
ALTER TABLE bookings ADD COLUMN created_by_admin_name_snapshot TEXT;
ALTER TABLE bookings ADD COLUMN updated_by_admin_id TEXT;
ALTER TABLE bookings ADD COLUMN updated_by_admin_name_snapshot TEXT;
ALTER TABLE bookings ADD COLUMN deleted_at TEXT;
ALTER TABLE bookings ADD COLUMN deleted_by_admin_id TEXT;
ALTER TABLE bookings ADD COLUMN deleted_by_admin_name_snapshot TEXT;
ALTER TABLE bookings ADD COLUMN deletion_reason TEXT;
ALTER TABLE bookings ADD COLUMN restored_at TEXT;
ALTER TABLE bookings ADD COLUMN restored_by_admin_id TEXT;
ALTER TABLE bookings ADD COLUMN restored_by_admin_name_snapshot TEXT;
ALTER TABLE bookings ADD COLUMN restoration_reason TEXT;
ALTER TABLE bookings ADD COLUMN record_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN last_admin_mutation_id TEXT;
ALTER TABLE bookings ADD COLUMN discount_amount INTEGER;
ALTER TABLE bookings ADD COLUMN payment_amount INTEGER;
ALTER TABLE bookings ADD COLUMN payment_status TEXT
  CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'partial', 'paid', 'refunded'));

ALTER TABLE services ADD COLUMN last_mutation_id TEXT;
ALTER TABLE booking_notifications ADD COLUMN last_mutation_id TEXT;

CREATE INDEX IF NOT EXISTS bookings_active_created_idx
ON bookings(deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS bookings_deleted_by_idx
ON bookings(deleted_by_admin_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS bookings_created_by_admin_idx
ON bookings(created_by_admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bookings_updated_by_admin_idx
ON bookings(updated_by_admin_id, updated_at DESC);

ALTER TABLE booking_status_history ADD COLUMN admin_user_id TEXT;
ALTER TABLE booking_status_history ADD COLUMN administrator_name_snapshot TEXT;
ALTER TABLE booking_status_history ADD COLUMN administrator_role_snapshot TEXT
  CHECK (administrator_role_snapshot IS NULL OR administrator_role_snapshot IN ('super_admin', 'admin'));
ALTER TABLE booking_status_history ADD COLUMN pair_id TEXT;
ALTER TABLE booking_status_history ADD COLUMN pair_reference TEXT;

CREATE INDEX IF NOT EXISTS booking_status_history_admin_created_idx
ON booking_status_history(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_status_history_pair_created_idx
ON booking_status_history(pair_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS booking_status_history_prevent_update
BEFORE UPDATE ON booking_status_history
BEGIN
  SELECT RAISE(ABORT, 'booking status history is immutable');
END;

CREATE TRIGGER IF NOT EXISTS booking_status_history_prevent_delete
BEFORE DELETE ON booking_status_history
BEGIN
  SELECT RAISE(ABORT, 'booking status history is immutable');
END;

CREATE TABLE IF NOT EXISTS booking_operational_notes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  note TEXT NOT NULL,
  admin_user_id TEXT,
  administrator_name_snapshot TEXT,
  administrator_role_snapshot TEXT CHECK (administrator_role_snapshot IS NULL OR administrator_role_snapshot IN ('super_admin', 'admin')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS booking_operational_notes_booking_created_idx
ON booking_operational_notes(booking_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS booking_operational_notes_prevent_update
BEFORE UPDATE ON booking_operational_notes
BEGIN
  SELECT RAISE(ABORT, 'booking operational notes are immutable');
END;

CREATE TRIGGER IF NOT EXISTS booking_operational_notes_prevent_delete
BEFORE DELETE ON booking_operational_notes
BEGIN
  SELECT RAISE(ABORT, 'booking operational notes are immutable');
END;

PRAGMA optimize;
