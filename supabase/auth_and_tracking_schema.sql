-- Migration: Add user authentication for drawing_images
-- This adds Google OAuth support and multi-user capability
-- Note: Tracking tables moved to separate migration (001_tracking_tables.sql)

-- Note: Supabase Auth already provides auth.users table
-- We'll reference auth.users(id) for user_id

-- Add user_id to drawing_images (nullable = public images)
ALTER TABLE drawing_images
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_drawing_images_user_id ON drawing_images(user_id);

-- Enable RLS on drawing_images
ALTER TABLE drawing_images ENABLE ROW LEVEL SECURITY;

-- Drawing images policies
-- Public images (user_id IS NULL) are readable by everyone
-- Private images are only readable/writable by owner
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON drawing_images;
CREATE POLICY "Public images are viewable by everyone"
  ON drawing_images FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own images" ON drawing_images;
CREATE POLICY "Users can insert their own images"
  ON drawing_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own images" ON drawing_images;
CREATE POLICY "Users can update their own images"
  ON drawing_images FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own images" ON drawing_images;
CREATE POLICY "Users can delete their own images"
  ON drawing_images FOR DELETE
  USING (auth.uid() = user_id);
