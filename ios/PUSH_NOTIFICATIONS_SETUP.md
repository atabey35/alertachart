# iOS Push Notifications Setup Guide

## Sorun: "aps-environment yetki anahtarı bulunamadı"

Bu hata, Xcode'da Push Notifications capability'sinin etkinleştirilmediği anlamına gelir.

## Çözüm Adımları

### 1. Xcode'da Projeyi Aç
```bash
open ios/App/App.xcworkspace
```

### 2. Push Notifications Capability'sini Etkinleştir

1. Xcode'da sol panelde **"App"** projesini seç
2. **"Signing & Capabilities"** tab'ına git
3. Sol üstteki **"+ Capability"** butonuna tıkla
4. **"Push Notifications"** seçeneğini bul ve ekle
5. **"Background Modes"** capability'sini de ekle (eğer yoksa)
   - **"Remote notifications"** seçeneğini işaretle

### 3. Provisioning Profile Kontrolü

1. **"Signing & Capabilities"** tab'ında
2. **"Team"** seçeneğinden Apple Developer hesabınızı seçin
3. Xcode otomatik olarak provisioning profile oluşturacak
4. Eğer hata alırsanız:
   - Apple Developer Portal'da Push Notifications App ID'yi etkinleştirin
   - Yeni bir provisioning profile oluşturun
   - Xcode'da bu profile'ı seçin

### 4. Build ve Test

1. **Product > Clean Build Folder** (Shift + Cmd + K)
2. **Product > Build** (Cmd + B)
3. Gerçek iOS cihazda test edin (Simulator'de push notifications çalışmaz)

### 5. Doğrulama

Uygulamayı çalıştırdığınızda Xcode console'da şunları görmelisiniz:

```
[AppDelegate] ✅ APNs device token received
[AppDelegate] 📱 APNs Token: [token]
[AppDelegate] ✅ APNs token set to Firebase Messaging
[AppDelegate] 🔔 FCM Registration token received
[AppDelegate] ✅ FCM Token: [fcm-token]
```

Eğer hala `aps-environment` hatası alıyorsanız:
- Provisioning profile'ın Push Notifications içerdiğinden emin olun
- Apple Developer Portal'da App ID'nin Push Notifications'ı desteklediğini kontrol edin
- Xcode'da **Product > Clean Build Folder** yapın ve tekrar build alın

## Notlar

- **Development Build**: Development provisioning profile ile build alırsanız, push notifications sadece development cihazlarda çalışır
- **Production Build**: App Store veya TestFlight için build alırsanız, production provisioning profile kullanılmalı
- **Simulator**: iOS Simulator'de push notifications çalışmaz, gerçek cihaz gerekir

