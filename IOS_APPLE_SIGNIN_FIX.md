# iOS Apple Sign In Error 1000 Düzeltmesi

## 🔍 Sorun

iOS'ta Apple Sign In Error 1000 hatası alınıyordu:
```
ASAuthorizationController credential request failed with error: 
Error Domain=com.apple.AuthenticationServices.AuthorizationError Code=1000
```

## ✅ Yapılan Düzeltmeler

### 1. Entitlements Dosyalarına Apple Sign In Capability Eklendi

**AppDebug.entitlements:**
```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

**AppRelease.entitlements:**
- Yeni oluşturuldu
- Production için aps-environment: production
- Apple Sign In capability eklendi

### 2. Xcode Proje Yapılandırması

- Release build için entitlements dosyası eklendi
- Her iki build configuration için Apple Sign In capability aktif

## 📋 Xcode'da Yapılması Gerekenler

### 1. Xcode'u Açın
```bash
cd ios/App
open App.xcworkspace
```

### 2. Signing & Capabilities Kontrolü

1. **Project Navigator** → **App** target'ı seçin
2. **Signing & Capabilities** tab'ına gidin
3. **+ Capability** butonuna tıklayın
4. **Sign In with Apple** seçeneğini ekleyin
5. Kontrol edin:
   - ✅ **Sign In with Apple** capability görünüyor olmalı
   - ✅ **Team ID**: `P6NB9T5SQ9` seçili olmalı
   - ✅ **Bundle ID**: `com.kriptokirmizi.alerta` doğru olmalı

### 3. Apple Developer Console Kontrolü

1. [Apple Developer Portal](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. `com.kriptokirmizi.alerta` App ID'yi bulun
4. **Sign In with Apple** capability aktif olmalı ✅
5. **Configure** butonuna tıklayın:
   - ✅ **Enable as a primary App ID** işaretli olmalı

### 4. Service ID Kontrolü

1. **Identifiers** → **Service IDs**
2. `com.kriptokirmizi.alerta.signin` bulun
3. **Sign In with Apple** aktif olmalı ✅
4. **Primary App ID**: `com.kriptokirmizi.alerta` seçili olmalı ✅
5. **Return URLs**: `https://alertachart.com/auth/mobile-callback` ekli olmalı ✅

## 🔄 Build ve Test

### 1. Clean Build
```bash
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme App
```

### 2. Pod Install
```bash
pod install
```

### 3. Capacitor Sync
```bash
cd ../..
npx cap sync ios
```

### 4. Xcode'da Build
1. Xcode'da **Product** → **Clean Build Folder** (Shift+Cmd+K)
2. **Product** → **Build** (Cmd+B)
3. Cihaza yükleyin ve test edin

## ✅ Test

1. Uygulamayı açın
2. "Continue with Apple" butonuna basın
3. Error 1000 hatası görünmemeli ✅
4. Apple Sign In ekranı açılmalı ✅

## 🚨 Hala Hata Alıyorsanız

### Kontrol Listesi:
- [ ] Xcode'da Sign In with Apple capability eklendi mi?
- [ ] Apple Developer Console'da App ID'de capability aktif mi?
- [ ] Service ID doğru yapılandırılmış mı?
- [ ] Return URL doğru mu?
- [ ] Bundle ID eşleşiyor mu?
- [ ] Team ID doğru mu?
- [ ] Uygulama tamamen silinip yeniden yüklendi mi?

### Debug:
```bash
# Xcode Console'da logları kontrol edin
# "ASAuthorizationController" ile ilgili hataları arayın
```

## 📝 Notlar

- Entitlements değişiklikleri için uygulamayı yeniden build etmeniz gerekir
- Xcode'da capability ekleme işlemi otomatik olarak entitlements dosyasını güncelleyebilir
- Eğer Xcode capability eklemezse, manuel olarak eklediğimiz entitlements dosyaları kullanılır

