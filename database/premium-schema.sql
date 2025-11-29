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

