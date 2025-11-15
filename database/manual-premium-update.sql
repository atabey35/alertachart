-- Manual Premium Update SQL Queries
-- Kullanıcıyı manuel olarak premium'a geçirmek için kullanılır

-- ============================================
-- 1. EMAIL İLE PREMIUM'A GEÇİR (LIFETIME)
-- ============================================
-- expiry_date NULL = Lifetime premium (süresiz)
UPDATE users 
SET 
  plan = 'premium',
  expiry_date = NULL,
  subscription_started_at = NOW(),
  subscription_platform = 'web',
  subscription_id = 'manual-premium-' || id,
  updated_at = NOW()
WHERE email = 'kullanici@example.com';

-- ============================================
-- 2. EMAIL İLE PREMIUM'A GEÇİR (1 AY)
-- ============================================
-- 1 ay sonra bitecek premium
UPDATE users 
SET 
  plan = 'premium',
  expiry_date = NOW() + INTERVAL '1 month',
  subscription_started_at = NOW(),
  subscription_platform = 'web',
  subscription_id = 'manual-premium-' || id,
  updated_at = NOW()
WHERE email = 'kullanici@example.com';

-- ============================================
-- 3. EMAIL İLE PREMIUM'A GEÇİR (ÖZEL TARİH)
-- ============================================
-- Belirli bir tarihe kadar premium
UPDATE users 
SET 
  plan = 'premium',
  expiry_date = '2025-12-31 23:59:59',
  subscription_started_at = NOW(),
  subscription_platform = 'web',
  subscription_id = 'manual-premium-' || id,
  updated_at = NOW()
WHERE email = 'kullanici@example.com';

-- ============================================
-- 4. USER ID İLE PREMIUM'A GEÇİR (LIFETIME)
-- ============================================
UPDATE users 
SET 
  plan = 'premium',
  expiry_date = NULL,
  subscription_started_at = NOW(),
  subscription_platform = 'web',
  subscription_id = 'manual-premium-' || id,
  updated_at = NOW()
WHERE id = 1;

-- ============================================
-- 5. TÜM KULLANICILARI PREMIUM YAP (DİKKAT!)
-- ============================================
-- Sadece test ortamında kullanın!
-- UPDATE users 
-- SET 
--   plan = 'premium',
--   expiry_date = NULL,
--   subscription_started_at = NOW(),
--   subscription_platform = 'web',
--   subscription_id = 'manual-premium-' || id,
--   updated_at = NOW();

-- ============================================
-- 6. PREMIUM'DAN FREE'YE GERİ DÖNDÜR
-- ============================================
UPDATE users 
SET 
  plan = 'free',
  expiry_date = NULL,
  subscription_started_at = NULL,
  subscription_platform = NULL,
  subscription_id = NULL,
  trial_started_at = NULL,
  trial_ended_at = NULL,
  updated_at = NOW()
WHERE email = 'kullanici@example.com';

-- ============================================
-- 7. KULLANICI DURUMUNU KONTROL ET
-- ============================================
SELECT 
  id,
  email,
  name,
  plan,
  expiry_date,
  subscription_started_at,
  subscription_platform,
  subscription_id,
  trial_started_at,
  trial_ended_at,
  created_at,
  updated_at
FROM users
WHERE email = 'kullanici@example.com';

-- ============================================
-- 8. TÜM PREMIUM KULLANICILARI LİSTELE
-- ============================================
SELECT 
  id,
  email,
  name,
  plan,
  expiry_date,
  subscription_started_at,
  subscription_platform
FROM users
WHERE plan = 'premium'
ORDER BY subscription_started_at DESC;

-- ============================================
-- 9. SÜRESİ GEÇMİŞ PREMIUM KULLANICILARI
-- ============================================
SELECT 
  id,
  email,
  name,
  plan,
  expiry_date,
  subscription_started_at
FROM users
WHERE plan = 'premium' 
  AND expiry_date IS NOT NULL
  AND expiry_date < NOW()
ORDER BY expiry_date DESC;

