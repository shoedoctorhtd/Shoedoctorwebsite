-- Keep the UUID `id` and legacy long `reference` intact for existing
-- relationships and operations. The short public reference is a separate,
-- customer/staff-facing identifier.
ALTER TABLE bookings ADD COLUMN public_reference TEXT;

-- SQLite permits multiple NULLs here while legacy rows are safely backfilled
-- by the application. Every assigned complete public reference is unique;
-- the random suffix itself is deliberately not indexed or constrained.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_reference_unique
ON bookings(public_reference);
