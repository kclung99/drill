-- Migration: Create drawing practice sessions table
-- Purpose: Track drawing session completion for heatmap and analytics

CREATE TABLE IF NOT EXISTS drawing_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_seconds INTEGER,           -- NULL = infinite mode
  image_count INTEGER NOT NULL,
  category TEXT,                      -- 'full-body', 'hands', 'feet', 'portraits'
  gender TEXT,                        -- 'female', 'male', 'any'
  clothing TEXT,                      -- 'minimal', 'clothed', 'any'
  always_generate_new BOOLEAN DEFAULT FALSE,

  -- Session results
  images_completed INTEGER NOT NULL,
  total_time_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_user_id
  ON drawing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_created_at
  ON drawing_practice_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE drawing_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own drawing sessions"
  ON drawing_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drawing sessions"
  ON drawing_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
