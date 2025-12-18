-- Audit Logs Database Schema
-- Tracks admin actions, security events, and critical operations
-- Railway PostgreSQL

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,                       -- User who performed the action (nullable for system actions)
  user_email VARCHAR(255),               -- User email for quick reference
  action VARCHAR(100) NOT NULL,          -- Action type (e.g., 'admin_login', 'webhook_received', 'user_downgrade')
  category VARCHAR(50) NOT NULL,         -- Category: 'auth', 'subscription', 'admin', 'webhook', 'security'
  details JSONB,                         -- Additional details (JSON format)
  ip_address VARCHAR(45),                -- Client IP address
  user_agent TEXT,                       -- User agent string
  severity VARCHAR(20) DEFAULT 'info',   -- 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for admin actions, security events, and critical operations';
COMMENT ON COLUMN audit_logs.action IS 'Action type: admin_login, webhook_received, user_upgraded, user_downgraded, etc.';
COMMENT ON COLUMN audit_logs.category IS 'Category: auth, subscription, admin, webhook, security';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info (normal), warning (attention needed), error (failed), critical (security issue)';
