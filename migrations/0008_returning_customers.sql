CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT,
  email_normalized TEXT,
  recovery_email TEXT,
  default_address TEXT,
  default_pickup_area TEXT,
  recovery_email_enabled_at TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS customers_phone_normalized_idx
ON customers(phone_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_email_identity_uniq
ON customers(phone_normalized, email_normalized);

ALTER TABLE bookings ADD COLUMN customer_id TEXT;

CREATE INDEX IF NOT EXISTS bookings_customer_id_idx
ON bookings(customer_id);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_sessions_token_hash_uniq
ON customer_sessions(token_hash);

CREATE INDEX IF NOT EXISTS customer_sessions_customer_active_idx
ON customer_sessions(customer_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS customer_sessions_expires_at_idx
ON customer_sessions(expires_at);

CREATE TABLE IF NOT EXISTS customer_verification_codes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  consumed_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS customer_verification_codes_customer_active_idx
ON customer_verification_codes(customer_id, consumed_at, expires_at, created_at);

CREATE INDEX IF NOT EXISTS customer_verification_codes_expires_at_idx
ON customer_verification_codes(expires_at);

CREATE TABLE IF NOT EXISTS customer_rate_limits (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_rate_limits_scope_key_uniq
ON customer_rate_limits(scope, key_hash);

CREATE INDEX IF NOT EXISTS customer_rate_limits_window_started_idx
ON customer_rate_limits(window_started_at);
