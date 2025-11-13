# iOS Yapılandırması - Sıfırdan Temiz Kurulum

## ✅ Yapılan Düzeltmeler

### 1. Xcode Project Ayarları Düzeltildi
- ✅ `MARKETING_VERSION`: 1.0 → **1.2.1** (app.json ile uyumlu)
- ✅ `CURRENT_PROJECT_VERSION`: 1 → **15** (Info.plist ile uyumlu)
- ✅ `PRODUCT_BUNDLE_IDENTIFIER`: `com.kriptokirmizi.alerta` (doğru)

### 2. Info.plist Düzeltildi
- ✅ `CFBundleShortVersionString`: **1.2.1** (version)
- ✅ `CFBundleVersion`: **15** (build number)
- ✅ `CFBundleDisplayName`: **Alerta Chart - TradeSync**
- ✅ `CFBundleIdentifier`: `$(PRODUCT_BUNDLE_IDENTIFIER)` (Xcode'dan alınacak)

### 3. app.json Düzeltildi
- ✅ `version`: **1.2.1**
- ✅ `buildNumber`: **15**
- ✅ `bundleIdentifier`: `com.kriptokirmizi.alerta`

### 4. Entitlements Düzeltildi
- ✅ `aps-environment`: **production** (TestFlight için gerekli)

## 📋 Yapılandırma Özeti

```
Version: 1.2.1
Build Number: 15
Bundle Identifier: com.kriptokirmizi.alerta
EAS Project ID: f4eb3196-3d5b-4aa0-9d0f-6075466f4f12
```

## 🚀 Yeni Build Alma

### 1. Build Number Kontrolü
```bash
cd mobile

# app.json'da buildNumber: "15" olduğunu kontrol et
cat app.json | grep buildNumber

# Info.plist'te CFBundleVersion: 15 olduğunu kontrol et
grep -A 1 CFBundleVersion ios/AlertaChartTradeSync/Info.plist
```

### 2. Yeni Build Al
```bash
cd mobile

# Production build başlat
eas build --profile production --platform ios
```

### 3. Build Tamamlandıktan Sonra
```bash
# Build'i TestFlight'a submit et
eas submit --platform ios --latest
```

### 4. App Store Connect'te Kontrol
1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **Alerta Chart**
2. **TestFlight** sekmesi → **iOS Builds**
3. Build 1.2.1 (15)'in durumunu kontrol edin:
   - **"Processing"** → 10-30 dakika bekleyin
   - **"Ready to Submit"** → TestFlight grubuna ekleyin

### 5. TestFlight Grubuna Ekle
1. App Store Connect → **TestFlight** → **iOS Builds**
2. Build 1.2.1 (15)'i bulun
3. **"+"** veya **"Add to TestFlight"** butonuna tıklayın
4. **Internal Testing** veya **External Testing** grubunu seçin
5. Build'i gruba ekleyin

## 🔍 Kontrol Listesi

### Build Öncesi
- [x] app.json'da version: 1.2.1
- [x] app.json'da buildNumber: 15
- [x] Info.plist'te CFBundleShortVersionString: 1.2.1
- [x] Info.plist'te CFBundleVersion: 15
- [x] Xcode project'te MARKETING_VERSION: 1.2.1
- [x] Xcode project'te CURRENT_PROJECT_VERSION: 15
- [x] Entitlements'ta aps-environment: production
- [x] Bundle identifier: com.kriptokirmizi.alerta

### Build Sonrası
- [ ] Build başarılı mı?
- [ ] Submit başarılı mı?
- [ ] App Store Connect'te build görünüyor mu?
- [ ] Build "Processing" durumundan çıktı mı?
- [ ] TestFlight grubuna eklendi mi?
- [ ] TestFlight'ta indirilebiliyor mu?

## 🆘 Sorun Giderme

### Build Başarısız Olursa
```bash
# Cache temizle
cd mobile
rm -rf node_modules
npm install

# iOS build klasörünü temizle
cd ios
rm -rf build
rm -rf Pods
pod install

# Tekrar build al
cd ..
eas build --profile production --platform ios
```

### Submit Başarısız Olursa
1. Apple ID ve şifrenizi kontrol edin
2. 2FA aktifse app-specific password kullanın
3. App Store Connect'te bundle identifier'ın doğru olduğundan emin olun

### TestFlight'ta Görünmüyorsa
1. Build'in "Processing" durumundan çıktığından emin olun
2. Build'i TestFlight grubuna eklediğinizden emin olun
3. Internal testing için cihaz UDID'sinin kayıtlı olduğundan emin olun

## 📱 TestFlight'ta Test

1. TestFlight uygulamasını açın
2. **Alerta Chart - TradeSync** uygulamasını bulun
3. **Install** butonuna tıklayın
4. Uygulama başarıyla indirilmeli ve kurulmalı

## ✅ Başarı Kriterleri

- ✅ Build başarılı
- ✅ Submit başarılı
- ✅ App Store Connect'te build görünüyor
- ✅ TestFlight grubuna eklendi
- ✅ TestFlight'tan indirilebiliyor
- ✅ Uygulama açılıyor ve çalışıyor

