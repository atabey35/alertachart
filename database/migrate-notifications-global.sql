-- Migration: Make notifications global (user_id nullable)
-- This allows single notification record to be visible to all users

-- Make user_id nullable for global notifications
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN notifications.user_id IS 'User ID for personal notifications, NULL for global/admin broadcast notifications';

