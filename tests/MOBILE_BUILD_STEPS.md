# 📱 Mobil Build - Adım Adım

## ✅ Build Başarılı!

Next.js build tamamlandı. Şimdi mobil build yapabilirsiniz.

---

## 🚀 Mobil Build Adımları

### 1. Capacitor Sync (Tamamlandı ✅)
```bash
npx cap sync android
```

### 2. Android Studio'yu Aç
```bash
npx cap open android
```

### 3. Android Studio'da Build

**Android Studio'da:**
1. **Build** menüsüne git
2. **Build Bundle(s) / APK(s)** → **Build APK(s)** seç
3. Build tamamlanmasını bekle
4. APK dosyası: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. APK'yı Telefona Yükle

#### Seçenek A: ADB ile (USB)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Seçenek B: Manuel
1. APK dosyasını telefona kopyala (USB, email, Google Drive, vs.)
2. Telefonda: **Settings** → **Security** → **Unknown sources** → **Allow**
3. APK dosyasına tıkla ve **Install** butonuna bas

---

## 🧪 Mobil Test Senaryoları

### Test 1: Upgrade Modal (Mobil)
1. Uygulamayı aç
2. Free kullanıcı olarak giriş yap
3. **AGGR butonuna tıkla** (alt menü)
4. **Beklenen:** Upgrade modal açılmalı
5. **"3 Gün Ücretsiz Dene" butonuna tıkla**
6. **Beklenen:** Trial başlatılmalı

### Test 2: Premium Badge & Trial Indicator (Mobil)
1. Trial başlat (yukarıdaki testten sonra)
2. **Settings tab'ına git** (alt menü)
3. **Beklenen:**
   - Premium badge (👑 Pro) görünmeli
   - Trial indicator (🕐 3 gün kaldı) görünmeli

### Test 3: AGGR Menü Restriction (Mobil)
1. Free kullanıcı → AGGR butonuna tıkla
2. **Beklenen:** "Pro Üye Gerekli" mesajı
3. Trial başlat → AGGR butonuna tekrar tıkla
4. **Beklenen:** AGGR içeriği görünmeli

### Test 4: Layout Restriction (Mobil - Settings)
1. Settings → Chart Layout bölümüne scroll et
2. **Beklenen:** 2x2 ve 3x3 layout'larda 🔒 ikonu
3. Tıklayınca upgrade modal açılmalı

### Test 5: Timeframe Restriction (Mobil)
1. Grafik ekranında timeframe seçiciye bak
2. **Beklenen:** 10s ve 30s'de 🔒 ikonu
3. Tıklayınca upgrade modal açılmalı

---

## 📋 Mobil Test Checklist

### Phase 2: UI Components
- [ ] Upgrade Modal mobilde açılıyor mu?
- [ ] Modal mobil ekrana uygun mu? (responsive)
- [ ] Premium Badge mobilde görünüyor mu?
- [ ] Trial Indicator mobilde görünüyor mu?
- [ ] Settings tab mobilde çalışıyor mu?

### Phase 3: Feature Restrictions
- [ ] AGGR menü kilitli mi? (free)
- [ ] Layout restriction çalışıyor mu? (mobil settings)
- [ ] Timeframe restriction çalışıyor mu?
- [ ] Upgrade modal mobilde açılıyor mu?

---

## 🔍 Mobil Debug

### Chrome DevTools (WebView Inspect)
1. Chrome'da: `chrome://inspect`
2. Telefonda uygulamayı aç
3. WebView'i inspect et
4. Console ve Network tab'larını kullan

### ADB Logcat
```bash
adb logcat | grep -i "premium\|trial\|upgrade"
```

---

## ✅ Test Sonuçları

**Test Tarihi:** _______________

**Cihaz:** _______________

**Android Version:** _______________

**Sonuç:**
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız
- [ ] ❌ Kritik hatalar var

**Notlar:**
_________________________________________________

