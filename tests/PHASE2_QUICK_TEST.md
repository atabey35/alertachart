# ⚡ Phase 2: UI Components - Hızlı Test

## 🚀 Hızlı Başlangıç (Commit/Push GEREKMEZ)

### 1. Development Server'ı Başlat
```bash
npm run dev
```

### 2. Browser'da Aç
```
http://localhost:3000
```

---

## ✅ Test 1: Upgrade Modal (2 dakika)

1. **Free kullanıcı olarak giriş yap**
2. **AGGR butonuna tıkla** (alt menüde)
3. **Beklenen:** Upgrade modal açılmalı
4. **Kontrol et:**
   - [ ] Modal açıldı mı?
   - [ ] "3 Gün Ücretsiz Dene" butonu var mı?
   - [ ] Premium özellikler listeleniyor mu?
5. **"3 Gün Ücretsiz Dene" butonuna tıkla**
6. **Beklenen:** Trial başlatılmalı, modal kapanmalı

**✅ Başarılı ise:** Modal çalışıyor!

---

## ✅ Test 2: Premium Badge (1 dakika)

1. **Trial başlat** (yukarıdaki testten sonra)
2. **Settings tab'ına git** (alt menüde)
3. **Kontrol et:**
   - [ ] User info card'ında premium badge görünüyor mu? (👑 Pro)
   - [ ] Trial indicator görünüyor mu? (🕐 3 gün kaldı)

**✅ Başarılı ise:** Badge ve indicator çalışıyor!

---

## ✅ Test 3: User Plan State (1 dakika)

1. **Browser Console'u aç** (F12)
2. **Network tab'ına git**
3. **Sayfayı yenile** (F5)
4. **Kontrol et:**
   - [ ] `/api/user/plan` isteği gönderildi mi?
   - [ ] Response'da `plan`, `isTrial`, `trialRemainingDays` var mı?

**✅ Başarılı ise:** State management çalışıyor!

---

## 🎯 Hızlı Test Senaryosu (5 dakika)

### Senaryo: Free → Trial → Premium UI

1. **Free kullanıcı olarak giriş yap**
   - Settings'e git → Premium badge YOK olmalı

2. **AGGR menüsüne tıkla**
   - Upgrade modal açılmalı
   - "3 Gün Ücretsiz Dene" butonuna tıkla

3. **Trial başladıktan sonra:**
   - Settings'e git → Premium badge + Trial indicator görünmeli
   - AGGR menüsüne tıkla → İçerik görünmeli

4. **Layout seçiciye bak** (Desktop toolbar)
   - 2x2 ve 3x3 layout'larda 🔒 ikonu olmalı
   - Tıklayınca upgrade modal açılmalı

5. **Timeframe seçiciye bak**
   - 10s ve 30s'de 🔒 ikonu olmalı
   - Tıklayınca upgrade modal açılmalı

**✅ Tüm bunlar çalışıyorsa:** Phase 2 başarılı!

---

## 🐛 Sorun Giderme

### Modal açılmıyor?
- Browser console'da hata var mı? (F12 → Console)
- `npm run dev` çalışıyor mu?

### Badge görünmüyor?
- Trial başlatıldı mı?
- Sayfayı yenile (F5)
- Settings tab'ına git

### State güncellenmiyor?
- Network tab'da `/api/user/plan` isteği var mı?
- Response doğru mu?
- Sayfayı yenile (F5)

---

## 📝 Test Sonuçları

**Test Tarihi:** _______________

**Sonuç:**
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız
- [ ] ❌ Kritik hatalar var

**Notlar:**
_________________________________________________

