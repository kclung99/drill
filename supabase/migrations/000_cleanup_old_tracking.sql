-- Cleanup script: Remove old tracking tables from previous schema
-- Run this FIRST before running 001_tracking_tables.sql

-- Drop old tables if they exist
DROP TABLE IF EXISTS chord_sessions CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS habit_sessions CASCADE;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_user_settings(UUID);
