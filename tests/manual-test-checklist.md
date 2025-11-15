# 🧪 Premium System - Manual Test Checklist

## 📋 Test Senaryoları

### Phase 1: Database & Core ✅

#### Test 1.1: Database Migration
- [ ] Migration script çalıştırıldı mı?
- [ ] `trial_attempts` tablosu oluşturuldu mu?
- [ ] `users` tablosuna trial fields eklendi mi?
- [ ] Index'ler oluşturuldu mu?

**Komut:**
```bash
npm run migrate:premium
```

---

### Phase 2: UI Components ✅

#### Test 2.1: Upgrade Modal
- [ ] Upgrade modal açılıyor mu?
- [ ] Premium özellikler listeleniyor mu?
- [ ] "3 Gün Ücretsiz Dene" butonu çalışıyor mu?
- [ ] Platform algılama doğru mu? (iOS/Android/Web)
- [ ] Error mesajları görünüyor mu? (Device/Email/IP trial used)

**Test Adımları:**
1. Free kullanıcı olarak giriş yap
2. AGGR menüsüne tıkla → Upgrade modal açılmalı
3. "3 Gün Ücretsiz Dene" butonuna tıkla
4. Trial başlatılmalı

#### Test 2.2: Premium Badge
- [ ] Premium kullanıcılarda badge görünüyor mu?
- [ ] Settings tab'ında badge var mı?
- [ ] Badge stilleri doğru mu?

#### Test 2.3: Trial Indicator
- [ ] Trial aktifken indicator görünüyor mu?
- [ ] Kalan gün sayısı doğru mu?
- [ ] Trial bitince indicator kayboluyor mu?

---

### Phase 3: Feature Restrictions ✅

#### Test 3.1: AGGR Menü Restriction
- [ ] Free kullanıcı AGGR butonunu görüyor mu?
- [ ] Free kullanıcı AGGR içeriğine erişemiyor mu?
- [ ] Upgrade modal gösteriliyor mu?
- [ ] Premium kullanıcı AGGR içeriğine erişebiliyor mu?

**Test Adımları:**
1. Free kullanıcı olarak giriş yap
2. AGGR butonuna tıkla
3. "Pro Üye Gerekli" mesajı görünmeli
4. Premium'a geç
5. AGGR içeriği görünmeli

#### Test 3.2: Layout Restriction (4-9 Charts)
- [ ] Free kullanıcı 4-9 layout'ları görebiliyor mu?
- [ ] 4-9 layout'lara tıklayınca upgrade modal açılıyor mu?
- [ ] Kilit ikonu (🔒) görünüyor mu?
- [ ] Premium kullanıcı 4-9 layout'ları kullanabiliyor mu?

**Test Adımları:**
1. Free kullanıcı olarak giriş yap
2. Layout seçiciye bak (Desktop)
3. 2x2 ve 3x3 layout'larda kilit ikonu olmalı
4. Tıklayınca upgrade modal açılmalı
5. Premium'a geç
6. 4-9 layout'ları kullanabilmeli

#### Test 3.3: Timeframe Restriction (10s, 30s)
- [ ] Free kullanıcı 10s ve 30s timeframe'leri görebiliyor mu?
- [ ] 10s ve 30s timeframe'lere tıklayınca upgrade modal açılıyor mu?
- [ ] Kilit ikonu (🔒) görünüyor mu?
- [ ] Premium kullanıcı 10s ve 30s timeframe'leri kullanabiliyor mu?

**Test Adımları:**
1. Free kullanıcı olarak giriş yap
2. Timeframe seçiciye bak
3. 10s ve 30s'de kilit ikonu olmalı
4. Tıklayınca upgrade modal açılmalı
5. Premium'a geç
6. 10s ve 30s timeframe'leri kullanabilmeli

---

### Phase 4: Backend Integration ✅

#### Test 4.1: Subscription Webhook
- [ ] Webhook endpoint çalışıyor mu?
- [ ] Apple IAP event'leri işleniyor mu?
- [ ] Google Play event'leri işleniyor mu?
- [ ] Trial başlatma çalışıyor mu?
- [ ] Premium geçiş çalışıyor mu?
- [ ] Free'ye düşürme çalışıyor mu?

**Test Komutları:**
```bash
# Test webhook (subscribed event)
curl -X POST http://localhost:3000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "test-sub-123",
    "platform": "ios",
    "event_type": "subscribed",
    "user_id": 1,
    "expiry_date": "2025-02-01T00:00:00Z"
  }'

# Test webhook (cancelled event)
curl -X POST http://localhost:3000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "test-sub-123",
    "platform": "ios",
    "event_type": "cancelled",
    "user_id": 1
  }'
```

#### Test 4.2: Backend Premium Kontrolü
- [ ] Free kullanıcılar için otomatik bildirimler engelleniyor mu?
- [ ] Premium kullanıcılar için bildirimler gönderiliyor mu?
- [ ] Trial kullanıcılar için bildirimler gönderiliyor mu?
- [ ] Local alarm bildirimleri free kullanıcılar için çalışıyor mu?

**Test Adımları:**
1. Free kullanıcı olarak alarm kur
2. Backend'de otomatik bildirim gönderilmemeli
3. Local alarm bildirimi çalışmalı (grafik üzerinden)
4. Premium'a geç
5. Backend'de otomatik bildirim gönderilmeli

---

## 🔄 Integration Test Flow

### Senaryo 1: Free User → Trial → Premium
1. [ ] Free kullanıcı olarak kayıt ol
2. [ ] AGGR menüsüne tıkla → Upgrade modal açılmalı
3. [ ] "3 Gün Ücretsiz Dene" butonuna tıkla
4. [ ] Trial başlatılmalı (3 gün)
5. [ ] AGGR içeriğine erişebilmeli
6. [ ] 4-9 layout'ları kullanabilmeli
7. [ ] 10s ve 30s timeframe'leri kullanabilmeli
8. [ ] Trial indicator görünmeli
9. [ ] 3 gün sonra trial bitmeli
10. [ ] Premium özellikler kilitlenmeli (eğer ödeme yapılmadıysa)

### Senaryo 2: Premium User → Cancel → Free
1. [ ] Premium kullanıcı olarak giriş yap
2. [ ] Tüm premium özelliklere erişebilmeli
3. [ ] Subscription iptal et (webhook)
4. [ ] Free'ye düşmeli
5. [ ] Premium özellikler kilitlenmeli

### Senaryo 3: Fraud Prevention
1. [ ] Aynı device ID ile 2. trial başlatma denemesi
   - [ ] Hata mesajı: "Trial already used on this device"
2. [ ] Aynı email ile 2. trial başlatma denemesi
   - [ ] Hata mesajı: "Trial already used with this email"
3. [ ] Aynı IP ile 2. trial başlatma denemesi
   - [ ] Hata mesajı: "Trial already used from this IP address"

---

## 🐛 Known Issues & Edge Cases

### Edge Case 1: Trial Expiry
- [ ] Trial bitince otomatik free'ye düşüyor mu?
- [ ] Trial bitince premium özellikler kilitleniyor mu?

### Edge Case 2: Premium Expiry
- [ ] Premium expiry date geçince free'ye düşüyor mu?
- [ ] Premium expiry date kontrolü doğru çalışıyor mu?

### Edge Case 3: Multiple Devices
- [ ] Aynı kullanıcı farklı cihazlardan trial başlatabilir mi?
- [ ] Device ID kontrolü doğru çalışıyor mu?

---

## ✅ Test Sonuçları

**Test Tarihi:** _______________

**Test Eden:** _______________

**Sonuç:**
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız (detaylar aşağıda)
- [ ] ❌ Kritik hatalar var

**Notlar:**
_________________________________________________
_________________________________________________
_________________________________________________

