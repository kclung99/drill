-- Migration: Add user authentication and tracking tables
-- This adds Google OAuth support and multi-user capability

-- Note: Supabase Auth already provides auth.users table
-- We'll reference auth.users(id) for user_id

-- Step 1: Add user_id to drawing_images (nullable = public)
ALTER TABLE drawing_images
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for user queries
CREATE INDEX idx_drawing_images_user_id ON drawing_images(user_id);

-- Step 2: Create habit_sessions table
CREATE TABLE habit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('music', 'drawing')),
  session_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for habit queries
CREATE INDEX idx_habit_sessions_user_date ON habit_sessions(user_id, session_date);
CREATE INDEX idx_habit_sessions_user_type ON habit_sessions(user_id, session_type);

-- Step 3: Create chord_sessions table for detailed practice tracking
CREATE TABLE chord_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_minutes INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chordTypes', 'scales')),
  chord_types TEXT[], -- Array of chord type ids
  scales TEXT[], -- Array of scale ids

  -- Session results
  total_chords INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL,
  accuracy DECIMAL(5,2), -- Percentage
  avg_time_per_chord DECIMAL(6,2), -- Seconds
  fastest_time DECIMAL(6,2), -- Seconds
  slowest_time DECIMAL(6,2), -- Seconds

  -- Individual chord results (stored as JSONB for flexibility)
  chord_results JSONB, -- Array of {chord, attempts, correctTime, totalTime}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chord session queries
CREATE INDEX idx_chord_sessions_user_id ON chord_sessions(user_id);
CREATE INDEX idx_chord_sessions_created_at ON chord_sessions(created_at);
CREATE INDEX idx_chord_sessions_user_date ON chord_sessions(user_id, created_at);

-- Step 4: Create settings table for user preferences
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  music_daily_target INTEGER DEFAULT 2,
  drawing_daily_target INTEGER DEFAULT 2,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get or create user settings
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS user_settings AS $$
DECLARE
  settings user_settings;
BEGIN
  SELECT * INTO settings FROM user_settings WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO settings;
  END IF;

  RETURN settings;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE drawing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chord_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drawing images policies
-- Public images (user_id IS NULL) are readable by everyone
-- Private images are only readable/writable by owner
CREATE POLICY "Public images are viewable by everyone"
  ON drawing_images FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON drawing_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON drawing_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON drawing_images FOR DELETE
  USING (auth.uid() = user_id);

-- Habit sessions policies (private to user)
CREATE POLICY "Users can view their own habit sessions"
  ON habit_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit sessions"
  ON habit_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chord sessions policies (private to user)
CREATE POLICY "Users can view their own chord sessions"
  ON chord_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chord sessions"
  ON chord_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User settings policies (private to user)
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
