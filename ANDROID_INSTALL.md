# Android APK Yükleme Talimatları

## 📱 APK Konumu

APK dosyası şu konumda:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔧 Android Cihaza Yükleme Adımları

### 1. Eski Uygulamayı Silin

**Telefonda:**
1. Ayarlar → Uygulamalar → Alerta Chart
2. "Kaldır" veya "Uninstall" butonuna basın
3. Onaylayın

**VEYA ADB ile:**
```bash
adb uninstall com.kriptokirmizi.alerta
```

### 2. APK'yı Telefona Aktarın

**Yöntem 1: USB ile (Önerilen)**
```bash
# Telefonu USB ile bilgisayara bağlayın
# USB Debugging'i açın (Ayarlar → Geliştirici Seçenekleri)

# APK'yı telefona kopyalayın
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Yöntem 2: Manuel Transfer**
1. APK dosyasını bilgisayardan telefona kopyalayın (USB, AirDrop, email, vs.)
2. Telefonda dosya yöneticisinde APK'yı bulun
3. APK'ya dokunun ve "Yükle" seçeneğini seçin

### 3. Bilinmeyen Kaynaklara İzin Verin

Android cihazınız "Bilinmeyen kaynaklardan uygulama yükleme" izni isteyebilir:

1. Ayarlar → Güvenlik → Bilinmeyen kaynaklardan uygulama yükleme
2. İzin verin (geçici olarak veya bu uygulama için)

### 4. Yükleme

1. APK dosyasına dokunun
2. "Yükle" butonuna basın
3. İzinleri onaylayın
4. Yükleme tamamlandığında "Aç" butonuna basın

## ✅ Yükleme Sonrası Kontrol

1. Uygulamayı açın
2. "Continue with Apple" butonuna basın
3. Error 1000 hatası görünmemeli ✅

## 🐛 Sorun Giderme

### "Uygulama yüklenemedi" hatası
- Eski uygulamayı tamamen silin
- Telefonu yeniden başlatın
- Tekrar deneyin

### "Paket çözümlenemedi" hatası
- APK dosyası bozuk olabilir
- Yeniden build alın: `cd android && ./gradlew clean assembleDebug`

### ADB "device not found" hatası
- USB Debugging açık mı kontrol edin
- USB kablosunu değiştirin
- `adb devices` komutu ile cihazı görüyor musunuz kontrol edin

## 📝 Hızlı Komutlar

```bash
# APK'yı bul
ls -lh android/app/build/outputs/apk/debug/app-debug.apk

# ADB ile yükle
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Eski uygulamayı sil
adb uninstall com.kriptokirmizi.alerta

# Logları görüntüle
adb logcat | grep -i "alerta\|capacitor"
```

