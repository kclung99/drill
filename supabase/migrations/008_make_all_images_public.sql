-- Migration: Make all images public by setting user_id to NULL
-- Purpose: Admin is creating shared reference images for all users

-- Set all existing images to public (user_id = NULL)
UPDATE drawing_images
SET user_id = NULL;

-- Note: Future images can still be created with user_id if needed,
-- but for now all admin-generated images are shared publicly.
