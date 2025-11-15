# Premium Notification Debug Guide

## 🔍 Sorun: Premium Kullanıcı Bildirim Alamıyor

Premium kullanıcı ile giriş yapmanıza rağmen bildirimleri göremiyorsanız, aşağıdaki adımları takip edin:

## 📋 Debug Adımları

### 1. Backend Loglarını Kontrol Et

Backend loglarında şu mesajları arayın:

**✅ Premium kullanıcı için beklenen log:**
```
🔍 Premium check for user X (email@example.com): {
  plan: 'premium',
  expiry_date: ...,
  isPremium: true,
  hasPremiumAccess: true
}
✅ Premium/Trial user X (email@example.com) - Sending notification
```

**❌ Sorun varsa görülebilecek loglar:**
```
⚠️ Device XXX not linked to user (user_id is null) - Cannot verify premium status, skipping notification
```
**Çözüm:** Cihaz kullanıcıya bağlanmamış. Login yapın ve cihazı bağlayın.

```
🚫 Free user X (email@example.com) - Skipping automatic price tracking notification
```
**Çözüm:** Kullanıcı free olarak görünüyor. Database'de `plan` değerini kontrol edin.

### 2. Test Scripti ile Kontrol Et

Backend'de test scripti çalıştırın:

```bash
cd alertachart-backend
node scripts/test-premium-check.js your-email@example.com
```

Bu script şunları gösterecek:
- Kullanıcı bilgileri (plan, expiry_date, trial dates)
- Cihazlar ve user_id durumu
- Premium/trial kontrol sonuçları
- Bildirim alıp alamayacağı

### 3. Database'de Kontrol Et

Premium kullanıcı için database'de şunları kontrol edin:

```sql
-- Kullanıcı bilgilerini kontrol et
SELECT id, email, plan, expiry_date, trial_started_at, trial_ended_at
FROM users
WHERE email = 'your-email@example.com';

-- Cihazların user_id'sini kontrol et
SELECT device_id, platform, user_id, is_active
FROM devices
WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com');
```

**Kontrol Edilecekler:**
1. ✅ `plan` = 'premium' olmalı
2. ✅ `expiry_date` NULL olmalı VEYA gelecekte bir tarih olmalı
3. ✅ `devices.user_id` NULL olmamalı (cihaz kullanıcıya bağlı olmalı)

### 4. Cihaz Link İşlemini Kontrol Et

Login sonrası cihaz otomatik olarak bağlanmalı. Kontrol etmek için:

**Capacitor App'te:**
- Login yapın
- Backend loglarında şunu arayın: `✅ Device XXX linked to user Y`

**Manuel Link (Gerekirse):**
```bash
curl -X POST http://localhost:3002/api/devices/link \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"deviceId": "your-device-id"}'
```

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun 1: `user_id` NULL
**Belirti:** Backend loglarında `⚠️ Device XXX not linked to user (user_id is null)`

**Çözüm:**
1. Login yapın (cihaz otomatik bağlanır)
2. Veya manuel olarak `/api/devices/link` çağırın

### Sorun 2: `plan` 'free' olarak görünüyor
**Belirti:** Backend loglarında `🚫 Free user X - Skipping automatic price tracking notification`

**Çözüm:**
1. Database'de `plan` değerini kontrol edin
2. Premium kullanıcı için `plan = 'premium'` olmalı
3. Gerekirse manuel olarak güncelleyin:
   ```sql
   UPDATE users SET plan = 'premium' WHERE email = 'your-email@example.com';
   ```

### Sorun 3: `expiry_date` geçmiş bir tarih
**Belirti:** Backend loglarında `isPremium: false` görünüyor

**Çözüm:**
1. Database'de `expiry_date` değerini kontrol edin
2. Geçmiş bir tarihse, NULL yapın (lifetime premium) veya gelecekte bir tarih yapın:
   ```sql
   UPDATE users SET expiry_date = NULL WHERE email = 'your-email@example.com';
   -- VEYA
   UPDATE users SET expiry_date = '2025-12-31' WHERE email = 'your-email@example.com';
   ```

### Sorun 4: Cihaz bulunamıyor
**Belirti:** Backend loglarında `❌ Device XXX not found or has no push token`

**Çözüm:**
1. Cihazın kayıtlı olduğundan emin olun
2. Push token'ın geçerli olduğundan emin olun
3. Cihazın `is_active = true` olduğundan emin olun

## 🔧 Hızlı Test

Premium kullanıcı için hızlı test:

1. **Login yapın** (cihaz otomatik bağlanır)
2. **Alarm kurun** (grafik üzerinde)
3. **Backend loglarını kontrol edin:**
   - `✅ Device XXX linked to user Y` görünmeli
   - `🔍 Premium check for user Y` görünmeli
   - `✅ Premium/Trial user Y - Sending notification` görünmeli
4. **Bildirim gelmeli**

## 📞 Destek

Eğer sorun devam ederse:
1. Backend loglarını paylaşın
2. Test script çıktısını paylaşın
3. Database sorgu sonuçlarını paylaşın

