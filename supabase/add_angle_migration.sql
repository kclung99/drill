-- Migration: Add angle column to drawing_images table
-- This preserves all existing data

-- Add the angle column with a default value
ALTER TABLE drawing_images
ADD COLUMN angle TEXT DEFAULT 'front view';

-- Update existing records to have a default angle
UPDATE drawing_images
SET angle = 'front view'
WHERE angle IS NULL OR angle = '';

-- Make the column required (NOT NULL) after setting defaults
ALTER TABLE drawing_images
ALTER COLUMN angle SET NOT NULL;

-- Create index for the new angle column for efficient querying
CREATE INDEX IF NOT EXISTS idx_drawing_images_angle ON drawing_images(angle);

-- Optional: Update some existing records with varied angles for better diversity
-- (This gives existing images some random angles instead of all being 'front view')
UPDATE drawing_images
SET angle = CASE
  WHEN random() < 0.15 THEN 'back view'
  WHEN random() < 0.3 THEN 'side view'
  WHEN random() < 0.45 THEN 'three-quarter view'
  WHEN random() < 0.55 THEN 'profile view'
  WHEN random() < 0.65 THEN 'slight side angle'
  WHEN random() < 0.75 THEN 'low angle view'
  WHEN random() < 0.85 THEN 'high angle view'
  WHEN random() < 0.95 THEN 'over-the-shoulder view'
  ELSE 'front view'
END
WHERE angle = 'front view';

-- Verify the migration
SELECT angle, COUNT(*) as count
FROM drawing_images
GROUP BY angle
ORDER BY count DESC;