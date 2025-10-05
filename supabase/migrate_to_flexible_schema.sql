-- Migration: Migrate to flexible schema while preserving existing data
-- This transforms the rigid column structure to the new flexible design

-- Step 1: Add new columns
ALTER TABLE drawing_images
ADD COLUMN category TEXT,
ADD COLUMN subject_type TEXT,
ADD COLUMN clothing_state TEXT,
ADD COLUMN attributes JSONB,
ADD COLUMN base_image_id UUID;

-- Step 2: Migrate existing data to new structure
UPDATE drawing_images SET
  category = 'full-body',
  subject_type = 'female',
  clothing_state = 'minimal',
  attributes = jsonb_build_object(
    'body_type', body_type,
    'race', race,
    'pose', pose,
    'angle', COALESCE(angle, '')
  ),
  base_image_id = NULL;

-- Step 3: Set constraints and defaults for new columns
ALTER TABLE drawing_images
ALTER COLUMN category SET NOT NULL,
ALTER COLUMN subject_type SET NOT NULL,
ALTER COLUMN clothing_state SET NOT NULL,
ALTER COLUMN attributes SET NOT NULL,
ALTER COLUMN attributes SET DEFAULT '{}'::jsonb;

-- Step 4: Add check constraints for the new structured columns
ALTER TABLE drawing_images
ADD CONSTRAINT check_category CHECK (category IN ('full-body', 'feet', 'hands', 'portraits', 'clothing')),
ADD CONSTRAINT check_subject_type CHECK (subject_type IN ('male', 'female', 'neutral')),
ADD CONSTRAINT check_clothing_state CHECK (clothing_state IN ('minimal', 'clothed', 'nude', 'partial'));

-- Step 5: Add foreign key constraint for base_image_id
ALTER TABLE drawing_images
ADD CONSTRAINT fk_base_image FOREIGN KEY (base_image_id) REFERENCES drawing_images(id);

-- Step 6: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_drawing_images_category ON drawing_images(category);
CREATE INDEX IF NOT EXISTS idx_drawing_images_subject_type ON drawing_images(subject_type);
CREATE INDEX IF NOT EXISTS idx_drawing_images_clothing_state ON drawing_images(clothing_state);
CREATE INDEX IF NOT EXISTS idx_drawing_images_base_image_id ON drawing_images(base_image_id);

-- Step 7: Drop old columns (optional - uncomment if you want to remove them)
-- ALTER TABLE drawing_images
-- DROP COLUMN body_type,
-- DROP COLUMN race,
-- DROP COLUMN pose,
-- DROP COLUMN angle;

-- Verify the migration
SELECT
  category,
  subject_type,
  clothing_state,
  attributes,
  COUNT(*) as count
FROM drawing_images
GROUP BY category, subject_type, clothing_state, attributes
ORDER BY count DESC;

-- Show a sample of migrated data
SELECT
  id,
  category,
  subject_type,
  clothing_state,
  attributes,
  base_image_id,
  prompt
FROM drawing_images
LIMIT 5;