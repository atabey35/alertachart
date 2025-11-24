# iOS Uygulamasını App Store Connect'e Yükleme

## 📋 Ön Hazırlık

### 1. Xcode'da Signing & Capabilities Kontrolü

1. Xcode'da projeyi açın:
```bash
cd ios/App
open App.xcworkspace
```

2. **Signing & Capabilities** kontrolü:
   - Project navigator'da **App** target'ını seçin
   - **Signing & Capabilities** sekmesine gidin
   - **Team**: Apple Developer hesabınızı seçin
   - **Bundle Identifier**: `com.kriptokirmizi.alerta` (doğru olduğundan emin olun)
   - **Automatically manage signing**: ✅ işaretli olmalı

### 2. Version ve Build Number

**General** sekmesinde:
- **Version**: `1.0` (veya istediğiniz versiyon)
- **Build**: `1` (her yeni build'de artırın: 1, 2, 3...)

## 🏗️ Archive Oluşturma

### 1. Xcode'da Archive

1. Xcode'da **Product** → **Scheme** → **App** seçin
2. **Product** → **Destination** → **Any iOS Device** seçin (gerçek cihaz veya Generic iOS Device)
3. **Product** → **Archive** seçin (⌘B ile build, sonra Archive)
4. Archive işlemi tamamlanana kadar bekleyin (birkaç dakika)

### 2. Organizer Açılır

Archive tamamlandığında **Organizer** penceresi otomatik açılır. Eğer açılmazsa:
- **Window** → **Organizer** (⇧⌘9)

## 📤 App Store Connect'e Yükleme

### 1. Organizer'dan Upload

1. **Organizer** penceresinde archive'inizi seçin
2. **Distribute App** butonuna tıklayın
3. **App Store Connect** seçin → **Next**
4. **Upload** seçin → **Next**
5. **Automatically manage signing** seçin → **Next**
6. **Upload** butonuna tıklayın
7. Yükleme tamamlanana kadar bekleyin (birkaç dakika)

### 2. Alternatif: Transporter App

Xcode Organizer çalışmazsa:

1. **Transporter** uygulamasını App Store'dan indirin
2. Xcode Organizer'dan **Export** → **Export App** seçin
3. `.ipa` dosyasını oluşturun
4. Transporter ile `.ipa` dosyasını yükleyin

## ✅ App Store Connect'te Kontrol

### 1. Build Görünmesi

1. [App Store Connect](https://appstoreconnect.apple.com) → Uygulamanızı seçin
2. **TestFlight** sekmesine gidin
3. **iOS Builds** bölümünde yeni build görünmeli
4. **Processing** durumunda olacak (birkaç dakika - 1 saat)

### 2. Build Hazır Olduğunda

Build **Ready to Submit** olduğunda:
1. **App Store** → **1.0 Prepare for Submission** (veya mevcut version)
2. **Build** bölümünde yeni build'i seçin
3. **In-App Purchases and Subscriptions** bölümünde subscription'ı ekleyin
4. Tüm bilgileri doldurun
5. **Submit for Review** butonuna tıklayın

## 🧪 TestFlight (Opsiyonel)

Build yüklendikten sonra TestFlight'ta test edebilirsiniz:

1. **TestFlight** sekmesine gidin
2. Build'i seçin
3. **Internal Testing** veya **External Testing** ekleyin
4. Test kullanıcıları ekleyin
5. Test linkini paylaşın

## ⚠️ Önemli Notlar

1. **Build Number**: Her yeni upload'ta artırın (1, 2, 3...)
2. **Version**: Aynı version ile birden fazla build yükleyebilirsiniz
3. **Processing Süresi**: Build işleme alınması 10 dakika - 1 saat sürebilir
4. **Signing**: Apple Developer hesabınızın aktif olduğundan emin olun

## 🐛 Sorun Giderme

### "No signing certificate found"

**Sorun**: Signing certificate yok

**Çözüm**:
1. Xcode → **Preferences** → **Accounts**
2. Apple ID'nizi ekleyin
3. **Download Manual Profiles** butonuna tıklayın
4. **Signing & Capabilities**'de **Automatically manage signing** seçin

### "Bundle identifier already exists"

**Sorun**: Bundle ID başka bir uygulamada kullanılıyor

**Çözüm**: 
- App Store Connect'te aynı Bundle ID ile uygulama oluşturun
- Veya Bundle ID'yi değiştirin

### "Upload failed"

**Sorun**: Yükleme başarısız

**Çözüm**:
1. İnternet bağlantınızı kontrol edin
2. Xcode'u yeniden başlatın
3. Clean build yapın: **Product** → **Clean Build Folder** (⇧⌘K)
4. Tekrar archive edin

## 📚 Kaynaklar

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)








