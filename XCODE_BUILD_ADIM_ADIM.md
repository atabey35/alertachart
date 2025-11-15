# Xcode ile iOS Build - Adım Adım Rehber

## 📋 Adım 1: Xcode Kurulumu

### 1.1 Xcode'u İndir
1. **App Store**'u açın
2. **"Xcode"** arayın
3. **"Get"** veya **"Install"** butonuna tıklayın
4. İndirme ve kurulum tamamlanana kadar bekleyin (~10-15 GB, 30-60 dakika)

### 1.2 Xcode'u Aç ve Lisansı Kabul Et
1. **Launchpad**'den veya **Applications** klasöründen **Xcode**'u açın
2. İlk açılışta lisans sözleşmesi çıkacak → **"Agree"** tıklayın
3. Xcode'un tamamen açılmasını bekleyin

### 1.3 Command Line Tools'u Aktif Et
Terminal'de şu komutu çalıştırın:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

Şifre isteyecek, Mac şifrenizi girin.

---

## 📦 Adım 2: Projeyi Hazırla

### 2.1 Capacitor Sync
```bash
cd /Users/ata/Desktop/alertachart
npx cap sync ios
```

Bu komut:
- Web kodlarını iOS projesine kopyalar
- Native plugin'leri günceller
- Capacitor config'i oluşturur

### 2.2 CocoaPods Dependencies
```bash
cd ios/App
pod install
```

Bu komut:
- iOS dependencies'leri indirir
- Pods klasörünü oluşturur
- Xcode workspace'i hazırlar

**Not:** İlk `pod install` 5-10 dakika sürebilir.

---

## 🚀 Adım 3: Xcode'da Build

### 3.1 Xcode'u Aç
```bash
cd /Users/ata/Desktop/alertachart
open ios/App/App.xcworkspace
```

**ÖNEMLİ:** `.xcworkspace` dosyasını açın, `.xcodeproj` değil!

### 3.2 Apple ID ile Giriş Yap
1. Xcode → **Preferences** (⌘,)
2. **Accounts** sekmesi
3. Sol altta **"+"** butonuna tıklayın
4. **Apple ID** ile giriş yapın
5. Apple Developer hesabınızı seçin

### 3.3 Signing Ayarları
1. Xcode'da sol panelden **"App"** projesini seçin (mavi ikon)
2. **"Signing & Capabilities"** sekmesi
3. **"Automatically manage signing"** işaretli olsun
4. **Team** dropdown'ından Apple Developer hesabınızı seçin
5. **Bundle Identifier** kontrol edin: `com.kriptokirmizi.alerta`

### 3.4 Cihaz Seçimi

**Gerçek Cihaz için:**
1. iPhone'unuzu Mac'e USB ile bağlayın
2. iPhone'da **"Trust This Computer"** mesajına **"Trust"** deyin
3. Xcode'un üst kısmında cihaz listesinden iPhone'unuzu seçin

**Simulator için:**
1. Xcode'un üst kısmında cihaz listesinden bir simulator seçin (örn: iPhone 15)

### 3.5 Build ve Run
1. **Product** → **Build** (⌘B) - Sadece build eder
2. **Product** → **Run** (⌘R) - Build edip cihaza yükler

**İlk build 5-15 dakika sürebilir.**

---

## 📱 Adım 4: Cihaza Yükleme

### Gerçek Cihaz (iPhone/iPad)

1. **Cihazı bağlayın** (USB)
2. **Xcode'da cihazı seçin**
3. **Product → Run** (⌘R)
4. İlk kez yüklüyorsanız:
   - iPhone'da **Settings → General → VPN & Device Management**
   - Developer App'i bulun
   - **"Trust"** butonuna tıklayın
   - Uygulamayı açın

### Simulator

1. **Simulator'ı seçin** (Xcode üst menü)
2. **Product → Run** (⌘R)
3. Simulator otomatik açılır ve uygulama yüklenir

---

## 🔧 Sorun Giderme

### "No signing certificate" hatası
**Çözüm:**
1. Xcode → Preferences → Accounts
2. Apple ID'nizi seçin
3. **"Download Manual Profiles"** butonuna tıklayın
4. Xcode'u yeniden başlatın

### "Provisioning profile" hatası
**Çözüm:**
1. Xcode'da proje ayarlarına gidin
2. Signing & Capabilities → **"Automatically manage signing"** işaretli olsun
3. Team'i seçin
4. Xcode otomatik olarak profile oluşturacak

### "Device not registered" hatası
**Çözüm:**
1. Xcode → Window → Devices and Simulators
2. Cihazınızı seçin
3. **"Use for Development"** butonuna tıklayın
4. Apple ID ile giriş yapın

### Pod install hatası
**Çözüm:**
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install --repo-update
```

### Build başarısız
**Çözüm:**
1. Xcode → Product → Clean Build Folder (⇧⌘K)
2. `ios/App` klasöründe `rm -rf build`
3. Tekrar build edin

---

## ⚡ Hızlı Komutlar

### Tüm Adımları Tek Seferde:
```bash
cd /Users/ata/Desktop/alertachart

# 1. Sync
npx cap sync ios

# 2. Pod install
cd ios/App
pod install

# 3. Xcode'u aç
open App.xcworkspace
```

### Command Line ile Build (Xcode açmadan):
```bash
cd /Users/ata/Desktop/alertachart/ios/App

# Debug build
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  build
```

---

## 📝 Önemli Notlar

1. **İlk build uzun sürer** - Normal, endişelenmeyin
2. **Signing gerekli** - Apple Developer hesabı (ücretsiz yeterli)
3. **.xcworkspace kullanın** - .xcodeproj değil!
4. **Cihaz trust** - İlk yüklemede iPhone'da trust yapmanız gerekir
5. **Session persistence** - iOS için cookie ayarları zaten yapılmış

---

## ✅ Başarı Kontrolü

Build başarılı olduğunda:
- ✅ Xcode'da "Build Succeeded" mesajı görünür
- ✅ Cihazda/simulator'da uygulama açılır
- ✅ Console'da hata yoksa başarılı!

Sorun olursa haber verin! 🚀

