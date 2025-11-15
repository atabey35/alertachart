# 🧪 Phase 2: UI Components - Test Rehberi

## 📋 Test Öncesi Hazırlık

### 1. Development Server'ı Başlat
```bash
npm run dev
```

Server `http://localhost:3000` adresinde çalışacak.

### 2. Browser'da Aç
```
http://localhost:3000
```

---

## ✅ Test 2.1: Upgrade Modal

### Test Adımları:

1. **Free kullanıcı olarak giriş yap**
   - Eğer hesabın yoksa kayıt ol
   - Login yap

2. **AGGR menüsüne tıkla**
   - Alt menüdeki "Aggr" butonuna tıkla
   - **Beklenen:** Upgrade modal açılmalı

3. **Upgrade Modal Kontrolleri:**
   - [ ] Modal açıldı mı?
   - [ ] "💎 Premium'a Geç" başlığı görünüyor mu?
   - [ ] Premium özellikler listeleniyor mu? (4 madde)
     - AGGR Menüsü
     - Otomatik Fiyat Takibi
     - 4-9 Lu Grafik
     - 10s & 30s Timeframe
   - [ ] "3 Gün Ücretsiz Dene" butonu var mı?
   - [ ] "Premium'a Geç" butonu var mı?
   - [ ] "Daha Sonra" butonu var mı?
   - [ ] Close (X) butonu çalışıyor mu?

4. **"3 Gün Ücretsiz Dene" Butonunu Test Et:**
   - Butona tıkla
   - **Beklenen:** Trial başlatılmalı
   - **Beklenen:** Modal kapanmalı
   - **Beklenen:** AGGR içeriği görünmeli (trial aktif)

5. **Platform Algılama Testi:**
   - Web'de: "Premium'a Geç" butonu görünmeli
   - Mobile'da: "App Store'dan Satın Al" veya "Google Play'den Satın Al" görünmeli

### Beklenen Sonuçlar:
- ✅ Modal açılıyor
- ✅ Tüm butonlar çalışıyor
- ✅ Trial başlatılabiliyor
- ✅ Platform algılama doğru

---

## ✅ Test 2.2: Premium Badge

### Test Adımları:

1. **Premium kullanıcı olarak giriş yap**
   - Premium hesabın varsa login yap
   - Veya trial başlat (trial aktifken de premium badge görünmeli)

2. **Settings Tab'ına Git**
   - Alt menüdeki "Ayarlar" butonuna tıkla

3. **Premium Badge Kontrolleri:**
   - [ ] User info card'ında premium badge görünüyor mu?
   - [ ] Crown (👑) icon görünüyor mu?
   - [ ] "Pro" yazısı görünüyor mu? (showText=true ise)
   - [ ] Badge stilleri doğru mu? (sarı/altın renk)

4. **Free Kullanıcı Testi:**
   - Free kullanıcı olarak giriş yap
   - Settings'e git
   - **Beklenen:** Premium badge görünmemeli

### Beklenen Sonuçlar:
- ✅ Premium kullanıcılarda badge görünüyor
- ✅ Free kullanıcılarda badge görünmüyor
- ✅ Badge stilleri doğru

---

## ✅ Test 2.3: Trial Indicator

### Test Adımları:

1. **Trial Başlat**
   - Free kullanıcı olarak giriş yap
   - Upgrade modal'dan "3 Gün Ücretsiz Dene" butonuna tıkla
   - Trial başlatılmalı

2. **Settings Tab'ına Git**
   - Alt menüdeki "Ayarlar" butonuna tıkla

3. **Trial Indicator Kontrolleri:**
   - [ ] Trial indicator görünüyor mu?
   - [ ] Clock (🕐) icon görünüyor mu?
   - [ ] Kalan gün sayısı doğru mu? (örn: "3 gün kaldı")
   - [ ] Gradient background doğru mu? (mavi-mor)
   - [ ] Border ve stil doğru mu?

4. **Gün Sayısı Testi:**
   - Trial başladıktan sonra gün sayısı kontrol et
   - **Beklenen:** "3 gün kaldı" (ilk gün)
   - **Beklenen:** "2 gün kaldı" (ikinci gün)
   - **Beklenen:** "1 gün kaldı" (üçüncü gün)
   - **Beklenen:** "Son gün" (son gün)

5. **Trial Bitince Test:**
   - Trial bitince (3 gün sonra)
   - **Beklenen:** Trial indicator görünmemeli

### Beklenen Sonuçlar:
- ✅ Trial aktifken indicator görünüyor
- ✅ Kalan gün sayısı doğru
- ✅ Trial bitince indicator kayboluyor

---

## ✅ Test 2.4: User Plan State Management

### Test Adımları:

1. **Free Kullanıcı Testi:**
   - Free kullanıcı olarak giriş yap
   - Browser console'u aç (F12)
   - Network tab'ına git
   - Sayfayı yenile
   - **Beklenen:** `/api/user/plan` isteği gönderilmeli
   - **Beklenen:** Response: `{ plan: 'free', isTrial: false, ... }`

2. **Trial Başlatma Testi:**
   - Trial başlat
   - Sayfayı yenile
   - **Beklenen:** `/api/user/plan` isteği gönderilmeli
   - **Beklenen:** Response: `{ plan: 'premium', isTrial: true, trialRemainingDays: 3, ... }`

3. **Premium Kullanıcı Testi:**
   - Premium kullanıcı olarak giriş yap
   - Sayfayı yenile
   - **Beklenen:** `/api/user/plan` isteği gönderilmeli
   - **Beklenen:** Response: `{ plan: 'premium', isTrial: false, ... }`

4. **State Güncelleme Testi:**
   - Trial başlat
   - AGGR menüsüne tıkla
   - **Beklenen:** İçerik görünmeli (trial aktif)
   - Settings'e git
   - **Beklenen:** Trial indicator görünmeli

### Beklenen Sonuçlar:
- ✅ User plan state doğru fetch ediliyor
- ✅ State değişiklikleri UI'ya yansıyor
- ✅ Premium özellikler state'e göre açılıp kapanıyor

---

## 🔍 Debug İpuçları

### Browser Console Kontrolleri:
```javascript
// Console'da çalıştır:
// User plan state'i kontrol et
fetch('/api/user/plan')
  .then(res => res.json())
  .then(data => console.log('User Plan:', data));
```

### Network Tab Kontrolleri:
1. F12 → Network tab
2. Sayfayı yenile
3. `/api/user/plan` isteğini bul
4. Response'u kontrol et

### React DevTools:
1. React DevTools extension'ı yükle
2. Components tab'ında `Home` component'ini bul
3. `userPlan` state'ini kontrol et
4. `fullUser` state'ini kontrol et

---

## ✅ Test Sonuçları

**Test Tarihi:** _______________

**Test Eden:** _______________

### Test 2.1: Upgrade Modal
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Test 2.2: Premium Badge
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Test 2.3: Trial Indicator
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

### Test 2.4: User Plan State Management
- [ ] ✅ Başarılı
- [ ] ❌ Başarısız
- **Notlar:** _________________________________

---

## 🐛 Bilinen Sorunlar

Eğer bir sorun görürseniz:

1. **Modal açılmıyor:**
   - Browser console'da hata var mı kontrol et
   - `showUpgradeModal` state'i doğru mu kontrol et

2. **Badge görünmüyor:**
   - User plan state doğru fetch ediliyor mu?
   - `hasPremiumAccess()` fonksiyonu doğru çalışıyor mu?

3. **Trial indicator görünmüyor:**
   - Trial başlatıldı mı kontrol et
   - `userPlan.isTrial` true mu?
   - `userPlan.trialRemainingDays > 0` mu?

---

## 📝 Notlar

- Commit/push gerekmez, local test yeterli
- Development server çalışıyor olmalı
- Browser cache'i temizlemek gerekebilir (Ctrl+Shift+R)

