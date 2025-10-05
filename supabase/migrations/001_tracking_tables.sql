-- Migration: Create tracking tables for localStorage-first hybrid sync
-- This creates tables for habit tracking and music practice analytics

-- Step 1: Create habit_sessions table
-- Purpose: Simple session logging for heatmap (one row per completed session)
CREATE TABLE IF NOT EXISTS habit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('music', 'drawing')),
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_habit_sessions_user_date
  ON habit_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_habit_sessions_user_type_date
  ON habit_sessions(user_id, session_type, session_date);

-- Step 2: Create chord_practice_sessions table
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

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE habit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chord_practice_sessions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for habit_sessions
-- Users can only view their own habit sessions
CREATE POLICY "Users can view their own habit sessions"
  ON habit_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own habit sessions
CREATE POLICY "Users can insert their own habit sessions"
  ON habit_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Create RLS policies for chord_practice_sessions
-- Users can only view their own chord sessions
CREATE POLICY "Users can view their own chord sessions"
  ON chord_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own chord sessions
CREATE POLICY "Users can insert their own chord sessions"
  ON chord_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
