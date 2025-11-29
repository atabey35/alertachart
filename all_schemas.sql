-- Push Notification System Database Schema
-- Neon PostgreSQL

-- Devices table - stores registered mobile devices
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  expo_push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price alerts table - stores user-defined price proximity alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  proximity_delta DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  last_price DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Alarm subscriptions table - tracks which devices want notifications for which alarms
CREATE TABLE IF NOT EXISTS alarm_subscriptions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  alarm_key VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, alarm_key),
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_device_id ON price_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alarm_subscriptions_device_id ON alarm_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_alarm_subscriptions_alarm_key ON alarm_subscriptions(alarm_key);

-- Comments
COMMENT ON TABLE devices IS 'Registered mobile devices for push notifications';
COMMENT ON TABLE price_alerts IS 'User-defined price proximity alerts';
COMMENT ON TABLE alarm_subscriptions IS 'Subscriptions to alert system notifications';

COMMENT ON COLUMN price_alerts.proximity_delta IS 'Distance from target price to start sending notifications';
COMMENT ON COLUMN price_alerts.direction IS 'up = approaching from below, down = approaching from above';
COMMENT ON COLUMN price_alerts.last_notified_at IS 'Last time notification was sent (for debouncing)';


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


-- Premium & Trial System Database Schema
-- Neon PostgreSQL

-- Trial attempts table - tracks trial attempts to prevent fraud
CREATE TABLE IF NOT EXISTS trial_attempts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL, -- Aynı device_id'den sadece 1 trial
  user_id INTEGER, -- Nullable: User silindikten sonra da kayıt kalmalı (fraud prevention)
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45), -- Aynı IP'den sadece 1 trial kontrolü için
  platform VARCHAR(20), -- 'ios' | 'android' | 'web' | 'capacitor'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP, -- 3 gün sonra
  converted_to_premium BOOLEAN DEFAULT false, -- Trial bitince premium'a geçti mi?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL -- Kullanıcı silinince user_id NULL olur, kayıt kalır
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_attempts_device_id ON trial_attempts(device_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_user_id ON trial_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_email ON trial_attempts(email);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_ip ON trial_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_started_at ON trial_attempts(started_at);

-- Update users table with trial fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_subscription_check TIMESTAMP;

-- Indexes for subscription checks
CREATE INDEX IF NOT EXISTS idx_users_trial_started ON users(trial_started_at) WHERE trial_started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_trial_ended ON users(trial_ended_at) WHERE trial_ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription_check ON users(last_subscription_check) WHERE plan = 'premium';

-- Comments
COMMENT ON TABLE trial_attempts IS 'Tracks trial attempts to prevent fraud (device_id, email, IP) - Records persist after user deletion';
COMMENT ON COLUMN trial_attempts.device_id IS 'Unique device identifier - prevents multiple trials from same device (PERMANENT RECORD)';
COMMENT ON COLUMN trial_attempts.user_id IS 'User ID (nullable after deletion) - SET NULL on user deletion to keep device_id record for fraud prevention';
COMMENT ON COLUMN trial_attempts.ip_address IS 'IP address for fraud prevention - same IP can only start 1 trial';
COMMENT ON COLUMN trial_attempts.email IS 'User email - same email can only start 1 trial';
COMMENT ON COLUMN trial_attempts.converted_to_premium IS 'Whether trial converted to premium after payment';

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  category VARCHAR(100) NOT NULL,
  author VARCHAR(255) NOT NULL,
  author_image TEXT,
  read_time INTEGER NOT NULL DEFAULT 5,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured DESC, published_at DESC);
-- News table
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  content TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('crypto', 'finance')),
  source VARCHAR(255) DEFAULT 'Alerta Chart',
  author VARCHAR(255),
  image_url TEXT,
  url TEXT,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

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

