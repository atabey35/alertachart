# TestFlight Build 19 İndirme Sorunu - Acil Çözüm

## 🔍 Sorun
Build 19 TestFlight'ta görünüyor ama ne iPhone'da ne iPad'de indirilemiyor.

## ⚡ Hızlı Kontrol Listesi

### 1. App Store Connect'te Build Durumu
1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **Alerta Chart**
2. **TestFlight** sekmesi → **iOS Builds**
3. Build 1.2.1 (19)'un durumunu kontrol edin:
   - **"Processing"** → Bekleyin (10-30 dakika)
   - **"Ready to Submit"** → TestFlight grubuna ekleyin
   - **"Invalid Binary"** → Build'de sorun var, yeni build gerekli
   - **"Expired"** → Build expire olmuş, yeni build gerekli

### 2. Build TestFlight Grubuna Eklenmiş mi?
1. App Store Connect → **TestFlight** → **iOS Builds**
2. Build 1.2.1 (19)'u bulun
3. Build'in yanında **"+"** veya **"Add to TestFlight"** butonu var mı?
4. **YOKSA:** Build zaten gruba eklenmiş
5. **VARSA:** Tıklayın ve gruba ekleyin

### 3. Internal Testing - Cihaz UDID Kontrolü
**Internal testing kullanıyorsanız:**
1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **TestFlight**
2. **Internal Testing** → **Testers** sekmesi
3. Cihazınızın UDID'si listede var mı?
4. **YOKSA:** Cihaz UDID'sini ekleyin

**Cihaz UDID'sini bulma:**
- iPhone'da: Settings → General → About → Identifier (UDID)
- Xcode: Window → Devices and Simulators → Cihazınızı seçin → Identifier

### 4. External Testing - Build Onay Bekliyor mu?
**External testing kullanıyorsanız:**
1. App Store Connect → **TestFlight** → **External Testing**
2. Build 1.2.1 (19) listede var mı?
3. Build'in durumu ne?
   - **"Waiting for Review"** → Apple onayı bekliyor (24-48 saat)
   - **"Ready to Test"** → Kullanılabilir olmalı

### 5. TestFlight Uygulamasını Yeniden Başlatma
1. TestFlight uygulamasını tamamen kapatın
2. iPhone/iPad'i yeniden başlatın
3. TestFlight'u tekrar açın
4. Uygulamayı tekrar deneyin

## 🎯 En Olası Sorunlar ve Çözümleri

### Sorun 1: Build "Processing" Durumunda
**Çözüm:** 10-30 dakika bekleyin, sonra tekrar deneyin.

### Sorun 2: Build TestFlight Grubuna Eklenmemiş
**Çözüm:**
1. App Store Connect → **TestFlight** → **iOS Builds**
2. Build 1.2.1 (19)'u bulun
3. **"+"** butonuna tıklayın
4. **Internal Testing** veya **External Testing** grubunu seçin
5. Build'i gruba ekleyin

### Sorun 3: Internal Testing - Cihaz UDID Kayıtlı Değil
**Çözüm:**
1. Cihaz UDID'sini bulun
2. App Store Connect → **Users and Access** → **TestFlight** → **Internal Testing** → **Testers**
3. **+** butonuna tıklayın ve cihaz UDID'sini ekleyin

### Sorun 4: Build Expire Olmuş
**Çözüm:** Yeni build alın (build 20).

### Sorun 5: Build "Invalid Binary"
**Çözüm:** Build'de sorun var, yeni build alın.

## 🚀 Acil Çözüm: Yeni Build Al

Eğer yukarıdaki adımlar işe yaramazsa:

```bash
cd mobile

# Build number'ı 20 yap
# app.json'da "buildNumber": "20" yapın
# Info.plist'te CFBundleVersion: 20 yapın
# Xcode project'te CURRENT_PROJECT_VERSION: 20 yapın

# Yeni build al
eas build --profile production --platform ios

# Submit et
eas submit --platform ios --latest
```

## 📱 Test Adımları

1. **App Store Connect'te kontrol edin:**
   - Build durumu
   - Build gruba eklenmiş mi?
   - Cihaz UDID kayıtlı mı?

2. **TestFlight uygulamasında:**
   - Uygulamayı kapatın ve yeniden açın
   - Cihazı yeniden başlatın
   - Tekrar deneyin

3. **Hala çalışmıyorsa:**
   - Yeni build alın (build 20)
   - Submit edin
   - TestFlight grubuna ekleyin

## 🆘 Hala Çalışmıyorsa

1. **App Store Connect'te build loglarını kontrol edin**
2. **EAS Dashboard'da build loglarını kontrol edin**
3. **TestFlight'ta build'in expire olup olmadığını kontrol edin**
4. **Yeni build alın ve submit edin**


