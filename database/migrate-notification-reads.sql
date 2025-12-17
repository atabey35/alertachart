-- Migration: Add notification_reads table for tracking read status of global notifications
-- This allows global notifications to have per-user read status

CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(notification_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_read_at ON notification_reads(read_at);

COMMENT ON TABLE notification_reads IS 'Tracks which users have read which global notifications';

