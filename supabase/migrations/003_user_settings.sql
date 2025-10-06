-- Migration: Create user settings table
-- Purpose: Store user preferences for heatmap targets, session validation, and timezone

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Heatmap daily targets
  music_daily_target INTEGER NOT NULL DEFAULT 2,
  drawing_daily_target INTEGER NOT NULL DEFAULT 2,

  -- Session validation thresholds (what counts as a valid session)
  min_music_duration_minutes INTEGER NOT NULL DEFAULT 10,
  min_drawing_refs INTEGER NOT NULL DEFAULT 10,
  min_drawing_duration_seconds INTEGER NOT NULL DEFAULT 60,

  -- Timezone (UTC offset in hours, e.g., -6 for Chicago)
  timezone_offset INTEGER NOT NULL DEFAULT -6,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
