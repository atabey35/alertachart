# iOS Build Rehberi

## Gereksinimler
- macOS (iOS build sadece Mac'te yapılabilir)
- Xcode (App Store'dan yüklenebilir, ~10-15 GB)
- CocoaPods (genellikle Xcode ile birlikte gelir)

## Adım Adım Build Süreci

### 1. Xcode Kurulumu
```bash
# Xcode'u App Store'dan yükleyin
# Ardından lisansı kabul edin:
sudo xcodebuild -license accept

# Xcode'u aktif developer directory olarak ayarlayın:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### 2. Capacitor Sync
```bash
cd /Users/ata/Desktop/alertachart
npx cap sync ios
```

### 3. CocoaPods Dependencies
```bash
cd ios/App
pod install
```

### 4. Xcode ile Build

#### Seçenek A: Xcode GUI ile
```bash
# Xcode'u açın
open ios/App/App.xcworkspace

# Xcode'da:
# 1. Sol üstten cihaz/simulator seçin
# 2. Product > Build (⌘B) ile build edin
# 3. Product > Run (⌘R) ile çalıştırın
```

#### Seçenek B: Command Line ile
```bash
# Debug build için:
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  archive

# Veya direkt cihaza yüklemek için:
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'id=DEVICE_UDID' \
  build
```

### 5. Cihaza Yükleme

#### Xcode GUI ile:
1. Xcode'da cihazınızı seçin
2. Product > Run (⌘R) ile direkt yükleyin

#### Command Line ile:
```bash
# Build edilen .app dosyasını bulun
# Genellikle: ios/App/build/Debug-iphoneos/App.app

# ios-deploy kullanarak (kurulum gerekli):
npm install -g ios-deploy
ios-deploy --bundle ios/App/build/Debug-iphoneos/App.app
```

## Simulator için Build

```bash
# Simulator build:
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

# Simulator'da çalıştır:
xcrun simctl boot "iPhone 15"
xcrun simctl install booted ios/App/build/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.kriptokirmizi.alerta
```

## Production/Release Build

### Archive Oluşturma (App Store için)
```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

# Archive'ı .ipa'ya dönüştür:
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist
```

## Notlar

- **İlk build uzun sürebilir** (dependencies indirme, compile vb.)
- **Signing:** Xcode'da signing certificate ve provisioning profile ayarlanmalı
- **Device UDID:** Cihazınızın UDID'sini almak için: `xcrun simctl list devices` (simulator) veya Xcode > Window > Devices and Simulators
- **Session Persistence:** iOS için WKWebView cookie ayarları `AppDelegate.swift` ve `WebViewController.swift` dosyalarında yapılandırılmış olmalı

## Hızlı Test Komutu

```bash
# Tüm adımları tek seferde:
cd /Users/ata/Desktop/alertachart
npx cap sync ios && \
cd ios/App && \
pod install && \
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -destination 'generic/platform=iOS' build
```

