-- Drill Database Setup
-- Personal toolkit for music and drawing training
-- Run this file to set up all required tables, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- User Settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  music_daily_target INTEGER NOT NULL DEFAULT 2,
  drawing_daily_target INTEGER NOT NULL DEFAULT 2,
  min_music_duration_minutes INTEGER NOT NULL DEFAULT 10,
  min_drawing_refs INTEGER NOT NULL DEFAULT 10,
  min_drawing_duration_seconds INTEGER NOT NULL DEFAULT 60,
  timezone_offset INTEGER NOT NULL DEFAULT -6,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chord Practice Sessions
CREATE TABLE IF NOT EXISTS public.chord_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  duration_minutes INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chordTypes', 'scales')),
  chord_types TEXT[],
  scales TEXT[],
  total_chords INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL,
  accuracy NUMERIC,
  avg_time_per_chord NUMERIC,
  fastest_time NUMERIC,
  slowest_time NUMERIC,
  chord_results JSONB,
  include_inversions BOOLEAN DEFAULT false,
  effective_chords NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Reference Images
CREATE TABLE IF NOT EXISTS public.drawing_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  source_url TEXT NOT NULL,
  page_url TEXT,
  platform TEXT DEFAULT 'pinterest',
  body_part TEXT,
  gender TEXT,
  clothing_state TEXT DEFAULT 'clothed' CHECK (clothing_state IN ('minimal', 'clothed')),
  attributes JSONB DEFAULT '{}'::jsonb,
  used_for_generation BOOLEAN DEFAULT false,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'success', 'failed', 'blocked')),
  generation_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  used_count INTEGER DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.drawing_refs.clothing_state IS 'Clothing level (minimal, clothed)';
COMMENT ON COLUMN public.drawing_refs.attributes IS 'Optional attributes like body_type, race, pose - can be tagged by extension';
COMMENT ON COLUMN public.drawing_refs.used_count IS 'Number of times used in drawing sessions (for rotation)';

-- Drawing Practice Sessions
CREATE TABLE IF NOT EXISTS public.drawing_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  duration_seconds INTEGER,
  image_count INTEGER NOT NULL,
  category TEXT,
  gender TEXT,
  clothing TEXT,
  always_generate_new BOOLEAN DEFAULT false,
  images_completed INTEGER NOT NULL,
  total_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Images (AI Generated - archived but schema preserved)
CREATE TABLE IF NOT EXISTS public.drawing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('full-body', 'feet', 'hands', 'portraits', 'clothing')),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('male', 'female', 'neutral')),
  clothing_state TEXT NOT NULL CHECK (clothing_state IN ('minimal', 'clothed', 'nude', 'partial')),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('text-to-image', 'image-to-image')),
  ref_image_id UUID REFERENCES public.drawing_refs(id),
  base_image_id UUID REFERENCES public.drawing_images(id),
  user_id UUID REFERENCES auth.users(id),
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment reference image usage count
CREATE OR REPLACE FUNCTION public.increment_ref_usage(ref_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.drawing_refs
  SET used_count = used_count + 1
  WHERE id = ref_id;
END;
$$ LANGUAGE plpgsql;

-- Increment generated image usage count
CREATE OR REPLACE FUNCTION public.increment_image_usage(image_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE drawing_images
  SET used_count = used_count + 1,
      last_used_at = NOW()
  WHERE id = image_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_images ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Chord Practice Sessions Policies
CREATE POLICY "Users can view their own chord sessions"
  ON public.chord_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chord sessions"
  ON public.chord_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drawing Reference Images Policies
CREATE POLICY "Authenticated users can read drawing_refs"
  ON public.drawing_refs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drawing_refs"
  ON public.drawing_refs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drawing_refs"
  ON public.drawing_refs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drawing_refs"
  ON public.drawing_refs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access"
  ON public.drawing_refs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drawing Practice Sessions Policies
CREATE POLICY "Users can view their own drawing sessions"
  ON public.drawing_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drawing sessions"
  ON public.drawing_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drawing Images Policies (archived feature, but policies preserved)
CREATE POLICY "Public can view all images"
  ON public.drawing_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public images are viewable by everyone"
  ON public.drawing_images FOR SELECT
  TO public
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON public.drawing_images FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert images"
  ON public.drawing_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own images"
  ON public.drawing_images FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.drawing_images FOR DELETE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update images"
  ON public.drawing_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = auth.uid()
        AND user_settings.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete images"
  ON public.drawing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = auth.uid()
        AND user_settings.role = 'admin'
    )
  );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for drawing references
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawing-refs', 'drawing-refs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for drawing-refs bucket
CREATE POLICY "Public read access to drawing-refs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'drawing-refs');

CREATE POLICY "Authenticated users can upload to drawing-refs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drawing-refs');

CREATE POLICY "Authenticated users can delete from drawing-refs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'drawing-refs');
