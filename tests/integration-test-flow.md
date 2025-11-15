# 🔄 Premium System - Integration Test Flow

## Senaryo 1: Free User → Trial → Premium

### Adım 1: Free User Olarak Kayıt
```bash
# 1. Yeni kullanıcı oluştur (email: test@example.com)
# 2. Login yap
# 3. Plan kontrolü
curl http://localhost:3000/api/user/plan \
  -H "Cookie: next-auth.session-token=..."
```

**Beklenen:**
```json
{
  "plan": "free",
  "isTrial": false,
  "trialRemainingDays": 0
}
```

### Adım 2: AGGR Menüsüne Erişim Denemesi
1. Free kullanıcı olarak giriş yap
2. AGGR butonuna tıkla
3. **Beklenen:** "Pro Üye Gerekli" mesajı + Upgrade modal

### Adım 3: Trial Başlatma
```bash
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "deviceId": "test-device-123",
    "platform": "web"
  }'
```

**Beklenen:**
```json
{
  "success": true,
  "trialStartedAt": "2025-01-XX...",
  "trialEndsAt": "2025-01-XX...",
  "trialDaysRemaining": 3
}
```

### Adım 4: Trial Aktifken Premium Özelliklere Erişim
1. AGGR menüsüne tıkla → **Beklenen:** İçerik görünmeli
2. 4-9 layout'ları seç → **Beklenen:** Çalışmalı
3. 10s ve 30s timeframe'leri seç → **Beklenen:** Çalışmalı
4. Settings'te trial indicator görünmeli

### Adım 5: Trial Status Kontrolü
```bash
curl http://localhost:3000/api/subscription/trial-status \
  -H "Cookie: next-auth.session-token=..."
```

**Beklenen:**
```json
{
  "isTrial": true,
  "trialRemainingDays": 2
}
```

### Adım 6: Premium'a Geçiş (Webhook)
```bash
curl -X POST http://localhost:3000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "test-sub-123",
    "platform": "ios",
    "event_type": "subscribed",
    "user_id": 1,
    "expiry_date": "2025-02-01T00:00:00Z"
  }'
```

**Beklenen:**
- User plan: `premium`
- Trial aktif kalmalı (3 gün)
- Expiry date set edilmeli

---

## Senaryo 2: Premium User → Cancel → Free

### Adım 1: Premium User Kontrolü
```bash
curl http://localhost:3000/api/user/plan \
  -H "Cookie: next-auth.session-token=..."
```

**Beklenen:**
```json
{
  "plan": "premium",
  "isTrial": false,
  "trialRemainingDays": 0,
  "expiryDate": "2025-02-01T00:00:00Z"
}
```

### Adım 2: Premium Özelliklere Erişim
1. AGGR menüsü → **Beklenen:** İçerik görünmeli
2. 4-9 layout'lar → **Beklenen:** Çalışmalı
3. 10s ve 30s timeframe'ler → **Beklenen:** Çalışmalı

### Adım 3: Subscription İptal (Webhook)
```bash
curl -X POST http://localhost:3000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "test-sub-123",
    "platform": "ios",
    "event_type": "cancelled",
    "user_id": 1
  }'
```

**Beklenen:**
- User plan: `free`
- Expiry date: `null`
- Subscription ID: `null`

### Adım 4: Free'ye Düşünce Premium Özellikler Kilitlenmeli
1. AGGR menüsü → **Beklenen:** "Pro Üye Gerekli" mesajı
2. 4-9 layout'lar → **Beklenen:** Kilitli
3. 10s ve 30s timeframe'ler → **Beklenen:** Kilitli

---

## Senaryo 3: Fraud Prevention

### Test 3.1: Device ID Kontrolü
```bash
# İlk trial
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "deviceId": "same-device-123",
    "platform": "web"
  }'

# İkinci trial (aynı device ID)
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "deviceId": "same-device-123",
    "platform": "web"
  }'
```

**Beklenen (2. istek):**
```json
{
  "error": "Trial already used on this device",
  "code": "DEVICE_TRIAL_USED"
}
```

### Test 3.2: Email Kontrolü
```bash
# Farklı device ID, aynı email
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "deviceId": "different-device-456",
    "platform": "web"
  }'
```

**Beklenen:**
```json
{
  "error": "Trial already used with this email",
  "code": "EMAIL_TRIAL_USED"
}
```

### Test 3.3: IP Kontrolü
```bash
# Aynı IP'den farklı email/device ile trial
# (IP kontrolü backend'de yapılıyor)
```

**Beklenen:**
```json
{
  "error": "Trial already used from this IP address",
  "code": "IP_TRIAL_USED"
}
```

---

## Senaryo 4: Backend Premium Kontrolü

### Test 4.1: Free User - Otomatik Bildirim Engelleme
1. Free kullanıcı olarak alarm kur
2. Backend'e bildirim isteği gönder
3. **Beklenen:** Bildirim gönderilmemeli, log: "Free user - automatic notifications disabled"

### Test 4.2: Premium User - Otomatik Bildirim
1. Premium kullanıcı olarak alarm kur
2. Backend'e bildirim isteği gönder
3. **Beklenen:** Bildirim gönderilmeli

### Test 4.3: Local Alarm Bildirimleri (Free User)
1. Free kullanıcı olarak grafik üzerinde alarm kur
2. Alarm tetiklendiğinde
3. **Beklenen:** Local notification gösterilmeli (Capacitor LocalNotifications)

---

## Test Sonuçları

**Test Tarihi:** _______________

**Test Eden:** _______________

### Senaryo 1: Free → Trial → Premium
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Senaryo 2: Premium → Cancel → Free
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Senaryo 3: Fraud Prevention
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Senaryo 4: Backend Premium Kontrolü
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

