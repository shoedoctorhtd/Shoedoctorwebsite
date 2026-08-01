-- Existing installations already have their default services, so add the new
-- admin-editable service there. On a fresh empty database the application seed
-- supplies the complete service list (including this service) after migrations.
INSERT OR IGNORE INTO services (
  id,
  name,
  category,
  price_label,
  special_price_label,
  turnaround,
  description,
  features,
  badge,
  tone,
  icon,
  active,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'steam-assisted-deep-clean',
  'Steam-Assisted Deep Clean',
  'Cleaning',
  'Price after inspection',
  NULL,
  'After diagnosis',
  'A targeted steam-assisted treatment designed to help loosen embedded surface grime before material-safe brushing, cleaning, drying and finishing.',
  json_array(
    'Material inspection before treatment',
    'Controlled steam brush detailing',
    'Material-safe cleaning and drying',
    'Price confirmed after diagnosis'
  ),
  NULL,
  'blue',
  '≋',
  1,
  25,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE EXISTS (SELECT 1 FROM services LIMIT 1)
  AND NOT EXISTS (
    SELECT 1
    FROM services
    WHERE id = 'steam-assisted-deep-clean'
      OR lower(name) = lower('Steam-Assisted Deep Clean')
  );
