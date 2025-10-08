-- Migration: Make legacy body_type, race, pose fields nullable
-- Purpose: These fields are now stored in the attributes JSONB column,
--          and some categories (hands, feet) don't use all attributes

-- Make legacy columns nullable
ALTER TABLE drawing_images
ALTER COLUMN body_type DROP NOT NULL,
ALTER COLUMN race DROP NOT NULL,
ALTER COLUMN pose DROP NOT NULL;

-- Set empty strings to NULL for cleaner data
UPDATE drawing_images
SET
  body_type = NULLIF(body_type, ''),
  race = NULLIF(race, ''),
  pose = NULLIF(pose, '');

-- Note: The attributes JSONB column is the source of truth.
-- Legacy columns are kept for backward compatibility but may be removed in the future.
