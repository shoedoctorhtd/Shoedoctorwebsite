ALTER TABLE bookings ADD COLUMN pair_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN service_subtotal INTEGER;
ALTER TABLE bookings ADD COLUMN express_fee INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN total_amount INTEGER;
ALTER TABLE bookings ADD COLUMN free_delivery_applied INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN free_delivery_reason TEXT;

CREATE TABLE IF NOT EXISTS booking_items (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  pair_number INTEGER NOT NULL CHECK (pair_number >= 1),
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_price_label TEXT NOT NULL,
  service_price INTEGER CHECK (service_price IS NULL OR service_price >= 0),
  footwear_type TEXT NOT NULL,
  brand TEXT,
  special_request TEXT,
  status TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE(booking_id, pair_number)
);

CREATE INDEX IF NOT EXISTS booking_items_booking_pair_idx
ON booking_items(booking_id, pair_number);
