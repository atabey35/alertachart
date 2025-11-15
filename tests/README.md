# 🧪 Premium System - Test Suite

## 📋 Test Dosyaları

### 1. Unit Tests
- **`premium-utils.test.ts`** - Premium utility fonksiyonları için unit testler
  - `isPremium()` testleri
  - `isTrialActive()` testleri
  - `hasPremiumAccess()` testleri
  - `getTrialDaysRemaining()` testleri

### 2. API Tests
- **`api-test-suite.sh`** - API endpoint'leri için otomatik test script'i
  - User Plan API
  - Trial Status API
  - Start Trial API
  - Subscription Webhook

### 3. Manual Tests
- **`manual-test-checklist.md`** - Manuel test checklist'i
  - Tüm feature'lar için adım adım test senaryoları
  - UI component testleri
  - Feature restriction testleri

### 4. Integration Tests
- **`integration-test-flow.md`** - Integration test senaryoları
  - Free → Trial → Premium flow
  - Premium → Cancel → Free flow
  - Fraud prevention testleri
  - Backend premium kontrolü testleri

---

## 🚀 Testleri Çalıştırma

### API Test Suite (Otomatik)
```bash
# Development server'ı başlat
npm run dev

# Başka bir terminal'de test suite'i çalıştır
npm run test:api

# Veya manuel olarak
bash tests/api-test-suite.sh

# Farklı base URL ile
BASE_URL=http://localhost:3000 bash tests/api-test-suite.sh
```

### Unit Tests (Manuel - Test Framework Gerekli)
```bash
# Jest veya Vitest kurulumu gerekli
# Şimdilik manuel test edilebilir
npm run test:premium
```

### Manuel Test Checklist
```bash
# Checklist'i aç ve adım adım test et
cat tests/manual-test-checklist.md
```

### Integration Test Flow
```bash
# Integration test senaryolarını takip et
cat tests/integration-test-flow.md
```

---

## 📊 Test Senaryoları Özeti

### Senaryo 1: Free User → Trial → Premium
1. Free kullanıcı olarak kayıt ol
2. AGGR menüsüne tıkla → Upgrade modal açılmalı
3. "3 Gün Ücretsiz Dene" butonuna tıkla
4. Trial başlatılmalı (3 gün)
5. Premium özelliklere erişebilmeli
6. Trial bitince premium özellikler kilitlenmeli

### Senaryo 2: Premium User → Cancel → Free
1. Premium kullanıcı olarak giriş yap
2. Tüm premium özelliklere erişebilmeli
3. Subscription iptal et (webhook)
4. Free'ye düşmeli
5. Premium özellikler kilitlenmeli

### Senaryo 3: Fraud Prevention
1. Aynı device ID ile 2. trial → Hata
2. Aynı email ile 2. trial → Hata
3. Aynı IP ile 2. trial → Hata

### Senaryo 4: Backend Premium Kontrolü
1. Free kullanıcı → Otomatik bildirimler engellenmeli
2. Premium kullanıcı → Otomatik bildirimler gönderilmeli
3. Local alarm bildirimleri → Free kullanıcılar için çalışmalı

---

## ✅ Test Sonuçları

Test sonuçlarını `manual-test-checklist.md` dosyasına kaydedin.

---

## 🔧 Troubleshooting

### API Test Suite Çalışmıyor
- Development server'ın çalıştığından emin olun: `npm run dev`
- Base URL'i kontrol edin: `BASE_URL=http://localhost:3000`
- Cookie'ler gerekli endpoint'ler için authentication gerekebilir

### Unit Tests Çalışmıyor
- Test framework (Jest/Vitest) kurulumu gerekli
- Şimdilik manuel test edilebilir

### Integration Tests
- Database bağlantısı gerekli
- Test kullanıcıları oluşturulmalı
- Backend server çalışıyor olmalı

---

## 📝 Notlar

- Test dosyaları örnek/test amaçlıdır
- Production'da daha kapsamlı test framework kullanılmalı
- E2E testler için Playwright veya Cypress önerilir

