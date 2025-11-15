# 📱 Premium System - Mobil Test Rehberi

## 🚀 Mobil Build ve Test Adımları

### 1. Next.js Build
```bash
npm run build
```

### 2. Capacitor Sync
```bash
npx cap sync android
```

### 3. Android Build

#### Seçenek A: Android Studio ile (ÖNERİLEN)
```bash
npx cap open android
```

**Android Studio'da:**
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Build tamamlandığında: `android/app/build/outputs/apk/debug/app-debug.apk` dosyası oluşur

#### Seçenek B: Gradle ile (Terminal)
```bash
cd android
./gradlew assembleDebug
```

APK dosyası: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. APK'yı Telefona Yükle

#### USB ile (ADB):
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Manuel:
1. APK dosyasını telefona kopyala (USB, email, Google Drive, vs.)
2. Telefonda: **Settings** → **Security** → **Unknown sources** → **Allow**
3. APK dosyasına tıkla ve **Install** butonuna bas

---

## 🧪 Mobil Test Senaryoları

### Test 1: Upgrade Modal (Mobil)

1. **Uygulamayı aç**
2. **Free kullanıcı olarak giriş yap**
3. **AGGR butonuna tıkla** (alt menüde)
4. **Beklenen:**
   - [ ] Upgrade modal açılmalı
   - [ ] Modal mobil ekrana uygun mu?
   - [ ] "3 Gün Ücretsiz Dene" butonu görünüyor mu?
   - [ ] Platform algılama doğru mu? (Android için "Google Play'den Satın Al" görünmeli)

5. **"3 Gün Ücretsiz Dene" butonuna tıkla**
6. **Beklenen:**
   - [ ] Trial başlatılmalı
   - [ ] Modal kapanmalı
   - [ ] AGGR içeriği görünmeli

### Test 2: Premium Badge & Trial Indicator (Mobil)

1. **Trial başlat** (yukarıdaki testten sonra)
2. **Settings tab'ına git** (alt menüde)
3. **Beklenen:**
   - [ ] User info card görünüyor mu?
   - [ ] Premium badge (👑 Pro) görünüyor mu?
   - [ ] Trial indicator (🕐 3 gün kaldı) görünüyor mu?
   - [ ] Mobil ekrana uygun mu? (responsive)

### Test 3: AGGR Menü Restriction (Mobil)

1. **Free kullanıcı olarak giriş yap**
2. **AGGR butonuna tıkla**
3. **Beklenen:**
   - [ ] "Pro Üye Gerekli" mesajı görünmeli
   - [ ] Upgrade modal açılmalı
   - [ ] Mobil ekrana uygun mu?

4. **Trial başlat**
5. **AGGR butonuna tekrar tıkla**
6. **Beklenen:**
   - [ ] AGGR içeriği görünmeli
   - [ ] Iframe yükleniyor mu?

### Test 4: Layout Restriction (Mobil - Settings)

1. **Free kullanıcı olarak giriş yap**
2. **Settings tab'ına git**
3. **Chart Layout bölümüne scroll et**
4. **Beklenen:**
   - [ ] 1x1 ve 1x2 layout'lar normal görünmeli
   - [ ] 2x2 ve 3x3 layout'larda 🔒 ikonu olmalı
   - [ ] Kilitli layout'lara tıklayınca upgrade modal açılmalı

5. **Trial başlat**
6. **Settings'e tekrar git**
7. **Beklenen:**
   - [ ] Tüm layout'lar kullanılabilir olmalı
   - [ ] 2x2 ve 3x3 layout'ları seçebilmeli

### Test 5: Timeframe Restriction (Mobil)

1. **Free kullanıcı olarak giriş yap**
2. **Grafik ekranında timeframe seçiciye bak**
3. **Beklenen:**
   - [ ] 1m, 5m, 15m, 1h, 4h, 1d görünmeli
   - [ ] 10s ve 30s'de 🔒 ikonu olmalı
   - [ ] Kilitli timeframe'lere tıklayınca upgrade modal açılmalı

4. **Trial başlat**
5. **Timeframe seçiciye tekrar bak**
6. **Beklenen:**
   - [ ] 10s ve 30s kullanılabilir olmalı
   - [ ] Kilit ikonu olmamalı

### Test 6: User Plan State (Mobil)

1. **Browser Console yerine:**
   - Android Studio → Logcat
   - Veya Chrome DevTools → `chrome://inspect` → WebView inspect

2. **Network isteklerini kontrol et:**
   - Chrome DevTools → Network tab
   - `/api/user/plan` isteği gönderilmeli

3. **State değişikliklerini kontrol et:**
   - Trial başlat → State güncellenmeli
   - Premium'a geç → State güncellenmeli

---

## 🔍 Mobil Debug İpuçları

### Android Studio Logcat
```bash
# Android Studio'da Logcat tab'ını aç
# Filter: "Premium" veya "Trial" veya "Upgrade"
```

### Chrome DevTools (WebView Inspect)
1. Chrome'da: `chrome://inspect`
2. Telefonda uygulamayı aç
3. WebView'i inspect et
4. Console ve Network tab'larını kullan

### ADB Logcat
```bash
# Terminal'de
adb logcat | grep -i "premium\|trial\|upgrade"
```

---

## ✅ Mobil Test Checklist

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

### Phase 4: Backend Integration
- [ ] Trial başlatma mobilde çalışıyor mu?
- [ ] User plan state mobilde güncelleniyor mu?
- [ ] API istekleri mobilde gönderiliyor mu?

---

## 🐛 Mobil Sorun Giderme

### Uygulama açılmıyor?
- APK doğru yüklendi mi?
- Android Studio'da hata var mı?
- Logcat'te hata mesajı var mı?

### Modal açılmıyor?
- Chrome DevTools → Console'da hata var mı?
- WebView doğru yükleniyor mu?

### State güncellenmiyor?
- Network tab'da API isteği var mı?
- Response doğru mu?
- Sayfayı yenile (pull to refresh)

---

## 📝 Test Sonuçları

**Test Tarihi:** _______________

**Cihaz:** _______________

**Android Version:** _______________

**Sonuç:**
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız
- [ ] ❌ Kritik hatalar var

**Notlar:**
_________________________________________________

