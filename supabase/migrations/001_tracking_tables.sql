-- Migration: Create tracking tables for localStorage-first hybrid sync
-- This creates tables for music practice analytics
-- Note: Heatmap data is derived from chord_practice_sessions (no separate habit_sessions table)

-- Step 1: Create chord_practice_sessions table
-- Purpose: Detailed music practice analytics (one row per practice session)
CREATE TABLE IF NOT EXISTS chord_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_minutes INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chordTypes', 'scales')),
  chord_types TEXT[],          -- e.g., ['maj', 'min', 'dim']
  scales TEXT[],               -- e.g., ['C', 'D', 'Eb']

  -- Session results (summary)
  total_chords INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL,
  accuracy DECIMAL(5,2),           -- Percentage (0-100)
  avg_time_per_chord DECIMAL(6,2), -- Seconds
  fastest_time DECIMAL(6,2),       -- Seconds
  slowest_time DECIMAL(6,2),       -- Seconds

  -- Individual chord results (JSONB for flexibility)
  -- Example: [{"chord": "Cmaj", "attempts": 2, "correctTime": 3500, "totalTime": 3500}]
  chord_results JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chord_sessions_user_id
  ON chord_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chord_sessions_created_at
  ON chord_practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chord_sessions_user_date
  ON chord_practice_sessions(user_id, created_at DESC);

-- Step 2: Enable Row Level Security (RLS)
ALTER TABLE chord_practice_sessions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for chord_practice_sessions
-- Users can only view their own chord sessions
CREATE POLICY "Users can view their own chord sessions"
  ON chord_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own chord sessions
CREATE POLICY "Users can insert their own chord sessions"
  ON chord_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
