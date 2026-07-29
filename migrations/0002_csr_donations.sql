CREATE TABLE IF NOT EXISTS donation_media (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  original_filename TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS donation_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  donor_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT NOT NULL,
  number_of_pairs INTEGER NOT NULL CHECK (number_of_pairs > 0),
  shoe_type TEXT,
  shoe_condition TEXT NOT NULL,
  donation_method TEXT NOT NULL DEFAULT 'self_dropoff'
    CHECK (donation_method IN ('self_dropoff', 'pickup_support')),
  pickup_address TEXT,
  preferred_pickup_date TEXT,
  donor_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new',
      'contacted',
      'pickup_scheduled',
      'collected',
      'under_restoration',
      'ready_for_donation',
      'donated',
      'rejected'
    )),
  internal_notes TEXT,
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS donation_requests_status_submitted_idx
ON donation_requests(status, submitted_at);

CREATE INDEX IF NOT EXISTS donation_requests_submitted_at_idx
ON donation_requests(submitted_at);

CREATE INDEX IF NOT EXISTS donation_requests_donor_name_idx
ON donation_requests(donor_name);

CREATE INDEX IF NOT EXISTS donation_requests_phone_idx
ON donation_requests(phone);

CREATE INDEX IF NOT EXISTS donation_requests_location_idx
ON donation_requests(location);

CREATE TABLE IF NOT EXISTS donation_drives (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_story TEXT NOT NULL,
  cover_image_id TEXT,
  drive_date TEXT NOT NULL,
  location TEXT NOT NULL,
  partner_organization TEXT,
  goal_pairs INTEGER NOT NULL DEFAULT 0 CHECK (goal_pairs >= 0),
  pairs_collected INTEGER NOT NULL DEFAULT 0 CHECK (pairs_collected >= 0),
  pairs_restored INTEGER NOT NULL DEFAULT 0 CHECK (pairs_restored >= 0),
  pairs_donated INTEGER NOT NULL DEFAULT 0 CHECK (pairs_donated >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'upcoming', 'active', 'completed')),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  cta_text TEXT,
  cta_link TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS donation_drives_published_date_idx
ON donation_drives(is_published, drive_date);

CREATE INDEX IF NOT EXISTS donation_drives_status_date_idx
ON donation_drives(status, drive_date);

CREATE TABLE IF NOT EXISTS restoration_stories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN (
      'sneaker_restoration',
      'donated_shoe_restoration',
      'cleaning_repair',
      'community_impact'
    )),
  before_image_id TEXT,
  after_image_id TEXT,
  description TEXT NOT NULL,
  restoration_work TEXT NOT NULL,
  story_date TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS restoration_stories_published_date_idx
ON restoration_stories(is_published, story_date);

CREATE INDEX IF NOT EXISTS restoration_stories_category_date_idx
ON restoration_stories(category, story_date);

CREATE TABLE IF NOT EXISTS community_updates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cover_image_id TEXT,
  gallery_image_ids TEXT NOT NULL DEFAULT '[]',
  update_date TEXT NOT NULL,
  location TEXT NOT NULL,
  recipient_organization TEXT NOT NULL,
  shoes_donated INTEGER NOT NULL DEFAULT 0 CHECK (shoes_donated >= 0),
  story TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS community_updates_published_date_idx
ON community_updates(is_published, update_date);

CREATE INDEX IF NOT EXISTS community_updates_recipient_date_idx
ON community_updates(recipient_organization, update_date);

CREATE TABLE IF NOT EXISTS donation_impact_stats (
  id TEXT PRIMARY KEY,
  total_pairs_collected INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_collected >= 0),
  total_pairs_restored INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_restored >= 0),
  total_pairs_donated INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_donated >= 0),
  donation_drives_completed INTEGER NOT NULL DEFAULT 0 CHECK (donation_drives_completed >= 0),
  partner_organizations INTEGER NOT NULL DEFAULT 0 CHECK (partner_organizations >= 0),
  communities_reached INTEGER NOT NULL DEFAULT 0 CHECK (communities_reached >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
