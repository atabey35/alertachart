-- Purchase Logs Database Schema
-- Real-time purchase tracking for admin panel
-- Neon PostgreSQL

-- Purchase logs table - tracks all purchase attempts and results
CREATE TABLE IF NOT EXISTS purchase_logs (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255),              -- User email (nullable for guest users)
  user_id INTEGER,                      -- User ID (nullable)
  platform VARCHAR(50) NOT NULL,        -- 'ios' or 'android'
  transaction_id VARCHAR(255),          -- Transaction/receipt ID
  product_id VARCHAR(255),              -- Product ID (e.g., 'premium_monthly')
  action_type VARCHAR(50) NOT NULL,     -- 'initial_buy', 'restore', 'renewal', 'entitlement_sync'
  status VARCHAR(50) NOT NULL,          -- 'success', 'failed', 'expired_downgrade'
  error_message TEXT,                   -- Error message if failed
  details TEXT,                         -- Additional details (JSON or text)
  device_id VARCHAR(255),               -- Device ID for tracking
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_logs_user_email ON purchase_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_user_id ON purchase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_platform ON purchase_logs(platform);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_status ON purchase_logs(status);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_action_type ON purchase_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_created_at ON purchase_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_transaction_id ON purchase_logs(transaction_id);

-- Foreign key to users table (optional, nullable)
ALTER TABLE purchase_logs 
  ADD CONSTRAINT fk_purchase_logs_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE purchase_logs IS 'Real-time purchase tracking logs for admin panel - tracks all purchase attempts and results';
COMMENT ON COLUMN purchase_logs.user_email IS 'User email (nullable for guest users)';
COMMENT ON COLUMN purchase_logs.user_id IS 'User ID (nullable, set to NULL if user is deleted)';
COMMENT ON COLUMN purchase_logs.platform IS 'Platform: ios or android';
COMMENT ON COLUMN purchase_logs.transaction_id IS 'Transaction/receipt ID from Apple/Google';
COMMENT ON COLUMN purchase_logs.product_id IS 'Product ID (e.g., premium_monthly, premium_yearly)';
COMMENT ON COLUMN purchase_logs.action_type IS 'Action type: initial_buy, restore, renewal, entitlement_sync';
COMMENT ON COLUMN purchase_logs.status IS 'Status: success, failed, expired_downgrade';
COMMENT ON COLUMN purchase_logs.error_message IS 'Error message if status is failed';
COMMENT ON COLUMN purchase_logs.details IS 'Additional details (can be JSON or text)';
COMMENT ON COLUMN purchase_logs.device_id IS 'Device ID for tracking';
