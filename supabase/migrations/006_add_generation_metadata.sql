-- Migration: Add generation metadata columns
-- Purpose: Track which model and generation type was used for each image

-- Add new columns
ALTER TABLE drawing_images
ADD COLUMN model TEXT,
ADD COLUMN generation_type TEXT;

-- Set constraints
ALTER TABLE drawing_images
ADD CONSTRAINT check_generation_type CHECK (generation_type IN ('text-to-image', 'image-to-image'));

-- Create index for querying by model
CREATE INDEX IF NOT EXISTS idx_drawing_images_model ON drawing_images(model);
CREATE INDEX IF NOT EXISTS idx_drawing_images_generation_type ON drawing_images(generation_type);

-- Migrate existing data: all current images were generated with ideogram-v3-turbo via text-to-image
UPDATE drawing_images
SET
  model = 'ideogram-ai/ideogram-v3-turbo',
  generation_type = 'text-to-image'
WHERE model IS NULL;

-- Now make the columns required
ALTER TABLE drawing_images
ALTER COLUMN model SET NOT NULL,
ALTER COLUMN generation_type SET NOT NULL;
