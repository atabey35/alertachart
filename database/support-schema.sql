-- Support Requests Database Schema
-- Neon PostgreSQL

-- Support requests table - stores user support requests
CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(255),
  topic VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

-- Comments
COMMENT ON TABLE support_requests IS 'User support requests from help center';
COMMENT ON COLUMN support_requests.topic IS 'Support topic: general, technical, billing, feature, bug, other';
COMMENT ON COLUMN support_requests.status IS 'Request status: pending, in_progress, resolved, closed';

