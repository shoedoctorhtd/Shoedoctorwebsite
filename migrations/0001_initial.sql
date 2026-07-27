CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_label TEXT NOT NULL,
  special_price_label TEXT,
  turnaround TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT NOT NULL DEFAULT '[]',
  badge TEXT,
  tone TEXT NOT NULL DEFAULT 'lime',
  icon TEXT NOT NULL DEFAULT '+',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS services_category_sort_idx
ON services(category, sort_order);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  shoe_type TEXT NOT NULL,
  shoe_brand TEXT,
  preferred_date TEXT,
  fulfillment_method TEXT NOT NULL DEFAULT 'self_dropoff',
  pickup_address TEXT,
  location_url TEXT,
  notes TEXT,
  express_requested INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bookings_status_created_idx
ON bookings(status, created_at);
