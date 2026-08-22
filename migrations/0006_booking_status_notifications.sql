ALTER TABLE bookings ADD COLUMN last_status_history_id TEXT;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS booking_status_history_booking_created_idx
ON booking_status_history(booking_id, created_at);

CREATE TABLE IF NOT EXISTS booking_notifications (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  status_history_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email')),
  recipient TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('status_update')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (status_history_id) REFERENCES booking_status_history(id) ON DELETE CASCADE,
  UNIQUE(status_history_id, channel, notification_type)
);

CREATE INDEX IF NOT EXISTS booking_notifications_booking_status_idx
ON booking_notifications(booking_id, status, updated_at);

CREATE INDEX IF NOT EXISTS booking_notifications_history_idx
ON booking_notifications(status_history_id);
