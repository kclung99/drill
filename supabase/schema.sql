-- Drop existing objects first
DROP TABLE IF EXISTS drawing_images CASCADE;
DROP FUNCTION IF EXISTS increment_image_usage(UUID);

-- Create the drawing_images table to store metadata about generated images
CREATE TABLE drawing_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  body_type TEXT NOT NULL,
  race TEXT NOT NULL,
  pose TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX idx_drawing_images_created_at ON drawing_images(created_at);
CREATE INDEX idx_drawing_images_used_count ON drawing_images(used_count);
CREATE INDEX idx_drawing_images_body_type ON drawing_images(body_type);
CREATE INDEX idx_drawing_images_race ON drawing_images(race);
CREATE INDEX idx_drawing_images_pose ON drawing_images(pose);

-- Create function to increment image usage
CREATE OR REPLACE FUNCTION increment_image_usage(image_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE drawing_images
  SET used_count = used_count + 1,
      last_used_at = NOW()
  WHERE id = image_id;
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket (skip if exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('drawing-images', 'drawing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies first
DROP POLICY IF EXISTS "Public read access for drawing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload drawing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete drawing images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload for drawing images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete for drawing images" ON storage.objects;

-- Create policy to allow public read access to drawing images
CREATE POLICY "Public read access for drawing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'drawing-images');

-- Create policy to allow public upload for drawing images (for AI generation)
CREATE POLICY "Public upload for drawing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'drawing-images');

-- Create policy to allow public delete for drawing images
CREATE POLICY "Public delete for drawing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'drawing-images');