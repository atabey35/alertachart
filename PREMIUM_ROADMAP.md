# 💎 Premium System - Implementation Roadmap

## 📋 Genel Bakış

**Hedef:** Premium üyelik sistemi ile free ve premium kullanıcılar arasında özellik ayrımı

**Süre Tahmini:** 2-3 hafta

---

## 🎯 Phase 1: Database & Core Infrastructure (3-4 gün)

### 1.1 Database Schema Updates
- [x] `trial_attempts` tablosu oluştur
- [x] `users` tablosuna trial fields ekle (`trial_started_at`, `trial_ended_at`, `subscription_started_at`)
- [x] Index'ler ekle
- [x] Migration script hazırla

**Dosyalar:**
- `database/premium-schema.sql` ✅
- `database/migrate-premium.sql` ✅

### 1.2 Premium Check Utility
- [x] `utils/premium.ts` oluştur
- [x] `isPremium()` fonksiyonu
- [x] `isTrialActive()` fonksiyonu
- [x] `hasPremiumAccess()` fonksiyonu

**Dosyalar:**
- `utils/premium.ts` ✅

### 1.3 User Plan API
- [x] `app/api/user/plan/route.ts` oluştur
- [x] GET endpoint: Kullanıcının plan bilgisini döndür
- [x] Premium/trial durumu kontrolü

**Dosyalar:**
- `app/api/user/plan/route.ts` ✅

### 1.4 Trial Management API
- [x] `app/api/subscription/start-trial/route.ts` oluştur
- [x] Trial başlatma (Device ID + Email + IP kontrolü)
- [x] `app/api/subscription/trial-status/route.ts` oluştur
- [x] Trial durumu kontrolü

**Dosyalar:**
- `app/api/subscription/start-trial/route.ts` ✅
- `app/api/subscription/trial-status/route.ts` ✅

**Test:**
- [ ] Trial başlatma testi
- [ ] Device ID kontrolü testi
- [ ] Email kontrolü testi
- [ ] IP kontrolü testi

---

## 🎨 Phase 2: UI Components & User Experience (4-5 gün)

### 2.1 Upgrade Modal Component
- [ ] `components/UpgradeModal.tsx` oluştur
- [ ] Premium özellikler listesi
- [ ] Fiyatlandırma gösterimi
- [ ] Apple/Google subscription butonları
- [ ] Trial bilgisi gösterimi

**Dosyalar:**
- `components/UpgradeModal.tsx` (YENİ)

### 2.2 Premium Badge & Indicators
- [ ] Premium badge component
- [ ] Trial aktif badge
- [ ] "Pro" göstergesi

**Dosyalar:**
- `components/PremiumBadge.tsx` (YENİ)

### 2.3 User Plan State Management
- [ ] `app/page.tsx` içinde user plan state
- [ ] Plan bilgisini fetch et
- [ ] Plan değişikliklerini dinle

**Dosyalar:**
- `app/page.tsx` (GÜNCELLE)

### 2.4 Trial UI
- [ ] Trial aktif göstergesi
- [ ] Trial bitiş sayacı
- [ ] Trial bitiş uyarısı

**Dosyalar:**
- `components/TrialIndicator.tsx` (YENİ)

---

## 🔒 Phase 3: Feature Restrictions (3-4 gün)

### 3.1 AGGR Menü Restriction
- [ ] AGGR butonu herkese görünür
- [ ] AGGR içeriği premium kontrolü
- [ ] Upgrade modal gösterimi (free kullanıcılar için)

**Dosyalar:**
- `app/page.tsx` (GÜNCELLE)

### 3.2 Layout Restriction (4-9 Charts)
- [ ] Layout seçici premium kontrolü
- [ ] 4-9 layout'lar premium only
- [ ] Upgrade modal gösterimi

**Dosyalar:**
- `app/page.tsx` (GÜNCELLE)

### 3.3 Timeframe Restriction (10s, 30s)
- [ ] Timeframe listesi premium kontrolü
- [ ] 10s ve 30s premium only
- [ ] Timeframe butonlarında premium badge

**Dosyalar:**
- `app/page.tsx` (GÜNCELLE)
- `utils/constants.ts` (GÜNCELLE)

### 3.4 Feature Locking UI
- [ ] Premium özelliklere tıklayınca upgrade modal
- [ ] Disable edilmiş butonlar
- [ ] "Pro Feature" badge'leri

**Dosyalar:**
- `components/FeatureLock.tsx` (YENİ)

---

## 🔔 Phase 4: Backend Integration (2-3 gün)

### 4.1 Subscription Webhook
- [ ] `app/api/subscription/webhook/route.ts` oluştur
- [ ] Apple IAP webhook handler
- [ ] Google Play Billing webhook handler
- [ ] Trial başlatma (ödeme yapıldığında)
- [ ] Premium geçiş
- [ ] Free'ye düşürme (iptal)

**Dosyalar:**
- `app/api/subscription/webhook/route.ts` (YENİ)

### 4.2 Backend Otomatik Fiyat Takibi
- [ ] Backend servisinde premium kontrolü
- [ ] Free kullanıcılar için bildirim gönderme engelleme
- [ ] Local alarm bildirimleri (free kullanıcılar için çalışmaya devam eder)

**Dosyalar:**
- Backend'de (alertachart-backend) güncelleme gerekli

### 4.3 Monthly Subscription Check
- [ ] Cron job: Aylık subscription kontrolü
- [ ] Expiry date kontrolü
- [ ] Apple/Google'dan subscription durumu sorgulama
- [ ] Otomatik free'ye düşürme

**Dosyalar:**
- Backend'de (alertachart-backend) cron job

---

## 🧪 Phase 5: Testing & Polish (2-3 gün)

### 5.1 Unit Tests
- [ ] Premium check utility testleri
- [ ] Trial management API testleri
- [ ] User plan API testleri

### 5.2 Integration Tests
- [ ] Trial başlatma flow testi
- [ ] Premium özellik erişim testi
- [ ] Free kullanıcı kısıtlamaları testi

### 5.3 UI/UX Polish
- [ ] Upgrade modal animasyonları
- [ ] Premium badge stilleri
- [ ] Trial indicator stilleri
- [ ] Error handling & messages

### 5.4 Documentation
- [ ] Premium system dokümantasyonu
- [ ] API dokümantasyonu
- [ ] Admin guide (subscription yönetimi)

---

## 📊 Implementation Summary

| Phase | Süre | Öncelik | Durum |
|-------|------|---------|-------|
| Phase 1: Database & Core | 3-4 gün | 🔴 Yüksek | ⏳ Beklemede |
| Phase 2: UI Components | 4-5 gün | 🔴 Yüksek | ⏳ Beklemede |
| Phase 3: Feature Restrictions | 3-4 gün | 🔴 Yüksek | ⏳ Beklemede |
| Phase 4: Backend Integration | 2-3 gün | 🟡 Orta | ⏳ Beklemede |
| Phase 5: Testing & Polish | 2-3 gün | 🟡 Orta | ⏳ Beklemede |

**Toplam Süre:** 14-19 gün (2-3 hafta)

---

## 🚀 Phase 1 Detaylı Plan

### Adım 1: Database Schema (1 gün)

**1.1 Trial Attempts Table**
```sql
CREATE TABLE IF NOT EXISTS trial_attempts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  platform VARCHAR(20),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  converted_to_premium BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**1.2 Users Table Updates**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_subscription_check TIMESTAMP;
```

**1.3 Indexes**
```sql
CREATE INDEX IF NOT EXISTS idx_trial_attempts_device_id ON trial_attempts(device_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_user_id ON trial_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_email ON trial_attempts(email);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_ip ON trial_attempts(ip_address);
```

### Adım 2: Premium Utility (0.5 gün)

**2.1 `utils/premium.ts`**
- `isPremium(user)` - Premium kontrolü
- `isTrialActive(user)` - Trial aktif mi?
- `hasPremiumAccess(user)` - Premium erişimi var mı?

### Adım 3: User Plan API (0.5 gün)

**3.1 `app/api/user/plan/route.ts`**
- GET endpoint
- User plan bilgisini döndür
- Premium/trial durumu

### Adım 4: Trial Management API (1 gün)

**4.1 `app/api/subscription/start-trial/route.ts`**
- POST endpoint
- Device ID kontrolü
- Email kontrolü
- IP kontrolü
- Trial başlatma

**4.2 `app/api/subscription/trial-status/route.ts`**
- GET endpoint
- Trial durumu kontrolü
- Device ID bazlı kontrol

### Adım 5: Testing (1 gün)

**5.1 Manual Tests**
- Trial başlatma
- Device ID kontrolü
- Email kontrolü
- IP kontrolü
- Premium check utility

---

## ✅ Phase 1 Checklist

- [ ] Database schema oluştur
- [ ] Migration script hazırla
- [ ] Premium utility oluştur
- [ ] User plan API oluştur
- [ ] Trial start API oluştur
- [ ] Trial status API oluştur
- [ ] Test et
- [ ] Commit & push

---

## 🎯 Sonraki Fazlar

**Phase 2:** UI Components (Upgrade Modal, Premium Badge, Trial Indicator)  
**Phase 3:** Feature Restrictions (AGGR, Layout, Timeframe)  
**Phase 4:** Backend Integration (Webhook, Subscription Check)  
**Phase 5:** Testing & Polish

---

**Hazır! Phase 1 ile başlayalım mı?** 🚀

