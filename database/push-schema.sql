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


