-- Keep the original operational `status` column and its CHECK constraint in
-- place. `workflow_status` is the donor-facing lifecycle used by notification
-- delivery, so existing D1 installations can upgrade without rebuilding the
-- donation_requests table.
ALTER TABLE donation_requests ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'submitted'
  CHECK (workflow_status IN (
    'submitted',
    'received',
    'cleaning_restoration',
    'ready_for_donation',
    'donated',
    'cancelled'
  ));

-- A per-transition token lets the status update and its durable email event
-- prove they were created by the same conditional write.
ALTER TABLE donation_requests ADD COLUMN last_workflow_event_id TEXT;

ALTER TABLE donation_requests ADD COLUMN email_update_consent INTEGER NOT NULL DEFAULT 0
  CHECK (email_update_consent IN (0, 1));

ALTER TABLE donation_requests ADD COLUMN distribution_location TEXT;
ALTER TABLE donation_requests ADD COLUMN distribution_campaign TEXT;
ALTER TABLE donation_requests ADD COLUMN distribution_date TEXT;
ALTER TABLE donation_requests ADD COLUMN pairs_distributed INTEGER
  CHECK (pairs_distributed IS NULL OR pairs_distributed >= 0);
ALTER TABLE donation_requests ADD COLUMN impact_note TEXT;

-- Backfill the donor-facing lifecycle from the legacy operational statuses.
-- Historical donors intentionally default to no optional email updates.
UPDATE donation_requests
SET workflow_status = CASE status
  WHEN 'collected' THEN 'received'
  WHEN 'under_restoration' THEN 'cleaning_restoration'
  WHEN 'ready_for_donation' THEN 'ready_for_donation'
  WHEN 'donated' THEN 'donated'
  WHEN 'rejected' THEN 'cancelled'
  ELSE 'submitted'
END;

CREATE INDEX IF NOT EXISTS donation_requests_workflow_status_submitted_idx
ON donation_requests(workflow_status, submitted_at);

CREATE TABLE IF NOT EXISTS donation_email_events (
  id TEXT PRIMARY KEY,
  donation_id TEXT NOT NULL,
  donation_reference TEXT NOT NULL,
  recipient_email TEXT,
  email_type TEXT NOT NULL,
  workflow_status TEXT NOT NULL
    CHECK (workflow_status IN (
      'submitted',
      'received',
      'cleaning_restoration',
      'ready_for_donation',
      'donated',
      'cancelled'
    )),
  event_key TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_summary TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (donation_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
  UNIQUE(donation_id, event_key)
);

CREATE INDEX IF NOT EXISTS donation_email_events_donation_created_idx
ON donation_email_events(donation_id, created_at);

CREATE INDEX IF NOT EXISTS donation_email_events_delivery_updated_idx
ON donation_email_events(delivery_status, updated_at);
