UPDATE services
SET
  description = 'Inside-and-out care with detailed treatment for pairs that need a proper reset.',
  features = CASE
    WHEN json_valid(features) = 1
      AND EXISTS (
        SELECT 1
        FROM json_each(features)
        WHERE value = 'Steam brush detailing on suitable areas when required'
      ) THEN features
    WHEN json_valid(features) = 1 THEN json_insert(
      features,
      '$[#]',
      'Steam brush detailing on suitable areas when required'
    )
    ELSE json_array(
      features,
      'Steam brush detailing on suitable areas when required'
    )
  END
WHERE id = 'deep-clean';

UPDATE services
SET
  features = CASE
    WHEN json_valid(features) = 1
      AND EXISTS (
        SELECT 1
        FROM json_each(features)
        WHERE value = 'Precision steam brush detailing where suitable'
      ) THEN features
    WHEN json_valid(features) = 1 THEN json_insert(
      features,
      '$[#]',
      'Precision steam brush detailing where suitable'
    )
    ELSE json_array(
      features,
      'Precision steam brush detailing where suitable'
    )
  END
WHERE id = 'premium-care';
