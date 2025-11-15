# 🚀 Premium System - Hızlı Test Rehberi

## ⚡ Hızlı Başlangıç

### 1. Development Server'ı Başlat
```bash
npm run dev
```

### 2. API Test Suite'i Çalıştır
```bash
# Yeni bir terminal aç
npm run test:api
```

---

## 📋 Manuel Test Senaryoları

### Test 1: User Plan API
```bash
# Unauthenticated request (should return free plan)
curl http://localhost:3000/api/user/plan

# Expected response:
# {
#   "plan": "free",
#   "isTrial": false,
#   "trialRemainingDays": 0
# }
```

### Test 2: Trial Başlatma (Authenticated)
```bash
# 1. Login yap (browser'da)
# 2. Cookie'yi al
# 3. Trial başlat

curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "deviceId": "test-device-123",
    "platform": "web"
  }'

# Expected response:
# {
#   "success": true,
#   "trialStartedAt": "2025-01-XX...",
#   "trialEndsAt": "2025-01-XX...",
#   "trialDaysRemaining": 3
# }
```

### Test 3: Subscription Webhook
```bash
# Test subscribed event
curl -X POST http://localhost:3000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "test-sub-123",
    "platform": "ios",
    "event_type": "subscribed",
    "user_id": 1,
    "expiry_date": "2025-02-01T00:00:00Z"
  }'

# Expected response:
# {
#   "success": true,
#   "user_id": 1,
#   "event_type": "subscribed",
#   "message": "Subscription subscribed processed successfully"
# }
```

### Test 4: Trial Status
```bash
# Authenticated request
curl http://localhost:3000/api/subscription/trial-status \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected response (if trial active):
# {
#   "isTrial": true,
#   "trialRemainingDays": 2
# }
```

---

## 🎯 UI Test Senaryoları

### Test 1: Free User - AGGR Menü
1. Free kullanıcı olarak giriş yap
2. AGGR butonuna tıkla
3. **Beklenen:** "Pro Üye Gerekli" mesajı + Upgrade modal

### Test 2: Free User - Layout Restriction
1. Free kullanıcı olarak giriş yap
2. Layout seçiciye bak (Desktop toolbar)
3. **Beklenen:** 2x2 ve 3x3 layout'larda 🔒 ikonu
4. Tıklayınca upgrade modal açılmalı

### Test 3: Free User - Timeframe Restriction
1. Free kullanıcı olarak giriş yap
2. Timeframe seçiciye bak
3. **Beklenen:** 10s ve 30s'de 🔒 ikonu
4. Tıklayınca upgrade modal açılmalı

### Test 4: Premium User - Full Access
1. Premium kullanıcı olarak giriş yap
2. AGGR menüsü → İçerik görünmeli
3. 4-9 layout'lar → Çalışmalı
4. 10s ve 30s timeframe'ler → Çalışmalı
5. Settings'te Premium badge görünmeli

### Test 5: Trial User - Full Access
1. Trial başlat (3 gün)
2. AGGR menüsü → İçerik görünmeli
3. 4-9 layout'lar → Çalışmalı
4. 10s ve 30s timeframe'ler → Çalışmalı
5. Settings'te Trial indicator görünmeli

---

## 🔒 Fraud Prevention Testleri

### Test 1: Device ID Kontrolü
```bash
# İlk trial
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"deviceId": "same-device-123", "platform": "web"}'

# İkinci trial (aynı device ID)
curl -X POST http://localhost:3000/api/subscription/start-trial \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"deviceId": "same-device-123", "platform": "web"}'

# Expected: Error - "Trial already used on this device"
```

### Test 2: Email Kontrolü
- Aynı email ile farklı device ID'den trial başlatma denemesi
- **Beklenen:** Error - "Trial already used with this email"

### Test 3: IP Kontrolü
- Aynı IP'den farklı email/device ile trial başlatma denemesi
- **Beklenen:** Error - "Trial already used from this IP address"

---

## 🎨 UI/UX Testleri

### Test 1: Upgrade Modal
- [ ] Modal açılıyor mu?
- [ ] Premium özellikler listeleniyor mu?
- [ ] "3 Gün Ücretsiz Dene" butonu çalışıyor mu?
- [ ] Platform algılama doğru mu?
- [ ] Error mesajları görünüyor mu?

### Test 2: Premium Badge
- [ ] Premium kullanıcılarda görünüyor mu?
- [ ] Stilleri doğru mu?
- [ ] Responsive mi?

### Test 3: Trial Indicator
- [ ] Trial aktifken görünüyor mu?
- [ ] Kalan gün sayısı doğru mu?
- [ ] Stilleri doğru mu?

---

## ✅ Test Checklist

### Phase 1: Database & Core
- [ ] Migration çalıştırıldı mı?
- [ ] Trial attempts tablosu var mı?
- [ ] User plan API çalışıyor mu?

### Phase 2: UI Components
- [ ] Upgrade modal çalışıyor mu?
- [ ] Premium badge görünüyor mu?
- [ ] Trial indicator çalışıyor mu?

### Phase 3: Feature Restrictions
- [ ] AGGR menü kilitli mi? (free)
- [ ] Layout 4-9 kilitli mi? (free)
- [ ] Timeframe 10s/30s kilitli mi? (free)

### Phase 4: Backend Integration
- [ ] Webhook çalışıyor mu?
- [ ] Backend premium kontrolü çalışıyor mu?
- [ ] Free kullanıcılar için otomatik bildirimler engelleniyor mu?

---

## 📝 Test Sonuçları

**Test Tarihi:** _______________

**Test Eden:** _______________

**Sonuç:**
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız
- [ ] ❌ Kritik hatalar var

**Notlar:**
_________________________________________________

