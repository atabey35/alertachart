# 📱 Build ve Test Talimatları - Local Notification Fix

## ✅ Commit & Push Tamamlandı

**Commit:** `feat: Add Capacitor LocalNotifications for alarm alerts`  
**Branch:** `main`  
**Status:** ✅ Pushed to remote

---

## 🔨 Android Build ve Test

### 1. Telefondaki Eski Uygulamayı Sil

1. Telefonda **Settings** → **Apps** → **Alerta Chart**
2. **Uninstall** butonuna tıkla
3. Uygulamayı tamamen sil

### 2. Yeni Build Oluştur

#### Seçenek A: Android Studio ile (ÖNERİLEN)

```bash
# 1. Next.js build
cd /Users/ata/Desktop/alertachart
npm run build

# 2. Capacitor sync
npx cap sync

# 3. Android Studio'yu aç
npx cap open android
```

**Android Studio'da:**
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Build tamamlandığında: **app/build/outputs/apk/debug/app-debug.apk** dosyası oluşur
3. Bu APK'yı telefona transfer et (USB, email, vs.)

#### Seçenek B: Gradle ile (Terminal)

```bash
cd /Users/ata/Desktop/alertachart

# 1. Next.js build
npm run build

# 2. Capacitor sync
npx cap sync

# 3. Android build
cd android
./gradlew assembleDebug

# APK dosyası: android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. APK'yı Telefona Yükle

**USB ile:**
```bash
# APK'yı telefona kopyala
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Veya manuel olarak:
# 1. APK'yı telefona kopyala (USB, email, cloud, vs.)
# 2. Telefonda: Settings → Security → Unknown sources → Allow
# 3. APK'yı aç ve yükle
```

**Manuel:**
1. APK dosyasını telefona kopyala (USB, email, Google Drive, vs.)
2. Telefonda **Settings** → **Security** → **Unknown sources** → **Allow**
3. APK dosyasına tıkla ve **Install** butonuna bas

---

## 🧪 Test Senaryosu

### 1. Uygulamayı Aç
- ✅ Uygulama açılıyor mu?
- ✅ Login ekranı görünüyor mu?

### 2. Login Yap
- ✅ Google/Apple ile login çalışıyor mu?
- ✅ Ana sayfa yükleniyor mu?

### 3. Alarm Kur
- ✅ Bir alarm kur (örn: BTCUSDT 50000 üzeri)
- ✅ Alarm listesinde görünüyor mu?

### 4. Alarm Tetikleme Testi
- ✅ Fiyat eşiğe geldiğinde:
  - **Alarm çalıyor mu?** (ses)
  - **Local notification görünüyor mu?** (üstte bildirim)
  - **Uygulama açıkken çalışıyor mu?**
  - **Uygulama arka plandayken çalışıyor mu?**

### 5. Notification Permission
- ✅ İlk alarm tetiklendiğinde permission isteniyor mu?
- ✅ Permission verildikten sonra notification geliyor mu?

---

## 🔍 Debug ve Log Kontrolü

### Browser Console (Chrome DevTools)

1. Telefonda USB debugging açık olsun
2. Chrome'da: `chrome://inspect` → **Devices** → Telefonu seç
3. **inspect** butonuna tıkla
4. Console'da şu logları ara:

```
[AlertService] ✅ Local notification scheduled via Capacitor
```

**Hata varsa:**
```
[AlertService] ❌ Failed to schedule local notification: ...
```

### Android Logcat

```bash
# Logcat'ta notification loglarını ara
adb logcat | grep -i "alert\|notification\|capacitor"
```

---

## ⚠️ Sorun Giderme

### Notification Görünmüyor?

1. **Permission kontrolü:**
   - Settings → Apps → Alerta Chart → Notifications → **Enabled** olmalı

2. **Plugin kontrolü:**
   ```javascript
   // Browser console'da
   console.log(window.Capacitor.Plugins.LocalNotifications);
   // undefined ise plugin yüklenmemiş
   ```

3. **Capacitor sync yapıldı mı?**
   ```bash
   npx cap sync
   ```

### Build Hatası?

1. **Gradle sync:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew build
   ```

2. **Node modules:**
   ```bash
   npm install
   ```

3. **Capacitor sync:**
   ```bash
   npx cap sync
   ```

### APK Yüklenmiyor?

1. **Unknown sources:** Settings → Security → Unknown sources → Allow
2. **Eski uygulama:** Eski uygulamayı tamamen sil
3. **Signing:** Debug APK kullanıyorsanız sorun olmaz

---

## 📝 Önemli Notlar

### Version Code
- `android/app/build.gradle` içinde `versionCode 1` var
- Her yeni build'de artırılmalı (1 → 2 → 3...)

### Debug vs Release
- **Debug APK:** Test için (şu an kullanıyoruz)
- **Release APK:** Production için (signing gerekli)

### Local Notifications
- Capacitor LocalNotifications plugin yüklü ✅
- Android'de otomatik channel oluşturulur
- iOS'ta permission istenir

---

## ✅ Başarı Kriterleri

Test başarılı sayılır eğer:
- [x] Uygulama açılıyor
- [x] Login çalışıyor
- [x] Alarm kurulabiliyor
- [x] Alarm tetiklendiğinde **ses çalıyor**
- [x] Alarm tetiklendiğinde **local notification görünüyor**
- [x] Uygulama açıkken notification geliyor
- [x] Uygulama arka plandayken notification geliyor

---

**Hazır!** Test edebilirsiniz 🚀

