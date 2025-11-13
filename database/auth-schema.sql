-- Authentication & User Management Schema
-- Neon PostgreSQL

-- Users table - stores user accounts
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- nullable for OAuth users
  name VARCHAR(255),
  
  -- OAuth fields
  provider VARCHAR(20), -- 'apple' | 'google' | 'email'
  provider_user_id VARCHAR(255), -- unique ID from Apple/Google
  
  -- Subscription fields
  plan VARCHAR(20) DEFAULT 'free', -- 'free' | 'premium'
  expiry_date TIMESTAMP, -- when premium expires
  subscription_platform VARCHAR(20), -- 'ios' | 'android' | 'web'
  subscription_id VARCHAR(255), -- Apple/Google subscription ID
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Unique constraint for OAuth users
  UNIQUE(provider, provider_user_id)
);

-- User sessions table - stores JWT refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update devices table to include user_id
ALTER TABLE devices ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE devices ADD CONSTRAINT fk_devices_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update price_alerts table to include user_id
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE price_alerts ADD CONSTRAINT fk_price_alerts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update alarm_subscriptions table to include user_id
ALTER TABLE alarm_subscriptions ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE alarm_subscriptions ADD CONSTRAINT fk_alarm_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- New alarms table - stores user-created price alarms (from frontend)
CREATE TABLE IF NOT EXISTS alarms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  alarm_key VARCHAR(255) NOT NULL,
  exchange VARCHAR(50) NOT NULL,
  pair VARCHAR(50) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('above', 'below')),
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, alarm_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_expiry ON users(expiry_date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_subscriptions_user_id ON alarm_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_user_id ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_alarm_key ON alarms(alarm_key);
CREATE INDEX IF NOT EXISTS idx_alarms_triggered ON alarms(is_triggered);

-- Comments
COMMENT ON TABLE users IS 'User accounts for authentication';
COMMENT ON TABLE user_sessions IS 'User sessions and refresh tokens';
COMMENT ON TABLE alarms IS 'User-created price alarms from frontend';
COMMENT ON COLUMN alarms.alarm_key IS 'Unique identifier for the alarm (frontend alert ID)';
COMMENT ON COLUMN alarms.direction IS 'above = price above target, below = price below target';


