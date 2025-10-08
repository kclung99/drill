-- Migration: Add user roles
-- Purpose: Add role column to user_settings for admin access control

-- Add role column with default 'user'
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_user_settings_role ON user_settings(role);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: After running this migration, manually set your admin role:
-- UPDATE user_settings SET role = 'admin' WHERE user_id = 'your-user-id';
