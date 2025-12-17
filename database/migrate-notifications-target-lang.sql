-- Migration: Add target_lang column to notifications table
-- This migration adds the target_lang column for multilingual notification filtering

-- Add target_lang column if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_lang VARCHAR(10) DEFAULT 'all';

-- Update existing notifications to have 'all' as default target_lang
UPDATE notifications SET target_lang = 'all' WHERE target_lang IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_target_lang ON notifications(target_lang);

-- Add comment to column
COMMENT ON COLUMN notifications.target_lang IS 'Target language for notification filtering: all, tr, en, etc.';

