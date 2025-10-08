-- Migration: Add RLS policies for drawing_images table
-- Purpose: Enable proper access control for image management

-- Enable Row Level Security
ALTER TABLE drawing_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all images
CREATE POLICY "Public can view all images"
  ON drawing_images FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert images
CREATE POLICY "Authenticated users can insert images"
  ON drawing_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can delete any image
CREATE POLICY "Admins can delete images"
  ON drawing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update any image
CREATE POLICY "Admins can update images"
  ON drawing_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
