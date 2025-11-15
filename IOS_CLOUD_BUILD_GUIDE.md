# iOS Cloud Build Rehberi (Xcode Olmadan)

## 🎯 Seçenekler

### Seçenek 1: GitHub Actions (Önerilen - Ücretsiz)

GitHub Actions ile Mac runner'da otomatik build alabilirsiniz.

#### Kurulum:

1. **GitHub'a push edin:**
```bash
git add .github/workflows/ios-build.yml
git commit -m "Add iOS cloud build workflow"
git push
```

2. **GitHub'da workflow'u tetikleyin:**
   - GitHub repo → **Actions** sekmesi
   - **iOS Build** workflow'unu seçin
   - **Run workflow** butonuna tıklayın

3. **Build tamamlandıktan sonra:**
   - Actions sayfasında build'i bulun
   - **Artifacts** bölümünden `.ipa` dosyasını indirin

#### Notlar:
- ⚠️ **Signing gerekli:** Apple Developer hesabı ve signing certificate gerekli
- ⚠️ **ExportOptions.plist:** `ios/App/ExportOptions.plist` dosyasını düzenleyip Team ID ve provisioning profile bilgilerini ekleyin
- ✅ **Ücretsiz:** GitHub Actions ücretsiz tier'da Mac runner'lar var (sınırlı)

---

### Seçenek 2: Codemagic (Capacitor Desteği Var)

Codemagic Capacitor projelerini destekler ve kolay kurulum sağlar.

#### Kurulum:

1. **Codemagic'a kaydolun:** https://codemagic.io
2. **Projeyi bağlayın:** GitHub repo'nuzu seçin
3. **Yapılandırma:**

`codemagic.yaml` dosyası oluşturun:

```yaml
workflows:
  ios-workflow:
    name: iOS Workflow
    max_build_duration: 120
    instance_type: mac_mini_m1
    environment:
      groups:
        - app_store_credentials
      vars:
        XCODE_WORKSPACE: "ios/App/App.xcworkspace"
        XCODE_SCHEME: "App"
      node: 20
      xcode: latest
    scripts:
      - name: Install dependencies
        script: |
          npm ci
      - name: Capacitor Sync
        script: |
          npx cap sync ios
      - name: Install CocoaPods dependencies
        script: |
          cd ios/App
          pod install
      - name: Build ipa
        script: |
          xcodebuild build-ipa \
            --workspace "$XCODE_WORKSPACE" \
            --scheme "$XCODE_SCHEME"
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      email:
        recipients:
          - your-email@example.com
```

4. **Apple Credentials:**
   - Codemagic → **App Store Connect** → Credentials ekleyin
   - Apple ID ve app-specific password gerekli

#### Avantajlar:
- ✅ Capacitor desteği
- ✅ Otomatik signing
- ✅ TestFlight'a otomatik upload
- ✅ Ücretsiz tier: 500 build dakikası/ay

---

### Seçenek 3: Bitrise

Bitrise de Capacitor projelerini destekler.

#### Kurulum:

1. **Bitrise'a kaydolun:** https://bitrise.io
2. **Projeyi bağlayın**
3. **Workflow seçin:** "Capacitor" template'i seçin
4. **Apple credentials ekleyin**

#### Avantajlar:
- ✅ Capacitor template'i var
- ✅ Ücretsiz tier: 200 build/ay

---

### Seçenek 4: AppCircle (Alternatif)

AppCircle da Capacitor desteği sunar.

---

## 🔧 Signing Yapılandırması

Hangi servisi kullanırsanız kullanın, Apple Developer hesabı gerekli:

1. **Apple Developer hesabı:** https://developer.apple.com
2. **Team ID:** Developer hesabınızda bulabilirsiniz
3. **Provisioning Profile:** 
   - Xcode → Preferences → Accounts → Download Manual Profiles
   - Veya Apple Developer portal'dan oluşturun

### ExportOptions.plist Düzenleme

`ios/App/ExportOptions.plist` dosyasını düzenleyin:

```xml
<key>teamID</key>
<string>YOUR_TEAM_ID_HERE</string>
```

Team ID'yi bulmak için:
```bash
# Xcode yüklüyse:
security find-identity -v -p codesigning

# Veya Apple Developer portal:
# https://developer.apple.com/account → Membership → Team ID
```

---

## 🚀 Hızlı Başlangıç (GitHub Actions)

1. **ExportOptions.plist'i düzenle:**
```bash
# Team ID'yi ekle
nano ios/App/ExportOptions.plist
```

2. **GitHub'a push:**
```bash
git add .github/workflows/ios-build.yml ios/App/ExportOptions.plist
git commit -m "Add iOS cloud build"
git push
```

3. **GitHub Actions'da tetikle:**
   - GitHub repo → Actions → iOS Build → Run workflow

4. **Build'i bekle** (10-20 dakika)

5. **IPA'yı indir:**
   - Actions → Build → Artifacts → ios-app

---

## 📱 IPA'yı Cihaza Yükleme

### Seçenek A: TestFlight (Önerilen)
1. App Store Connect → TestFlight
2. Build'i yükle
3. TestFlight uygulamasından indir

### Seçenek B: Direct Install
```bash
# ios-deploy ile (Mac gerekli):
npm install -g ios-deploy
ios-deploy --bundle path/to/App.ipa

# Veya Xcode ile:
# Window → Devices and Simulators → + → IPA seç
```

---

## ⚠️ Önemli Notlar

1. **Signing Certificate:** İlk build için Apple Developer hesabından certificate oluşturmanız gerekebilir
2. **Provisioning Profile:** Cihazınızın UDID'si profile'a eklenmeli (development build için)
3. **App Store Connect:** Production build için App Store Connect'te app oluşturulmalı
4. **Build Time:** İlk build 15-30 dakika sürebilir (dependencies indirme)

---

## 🆘 Sorun Giderme

### "Code signing is required" hatası
- Apple Developer hesabı gerekli
- Team ID'yi ExportOptions.plist'e ekleyin

### "No provisioning profile" hatası
- Provisioning profile oluşturun (Apple Developer portal)
- Veya automatic signing kullanın (Team ID yeterli)

### Build başarısız
- GitHub Actions logs'u kontrol edin
- CocoaPods hataları için: `pod repo update` gerekebilir

---

## 💡 Öneri

**En kolay yol:** Codemagic kullanın
- Capacitor desteği var
- Otomatik signing
- Kolay kurulum
- Ücretsiz tier yeterli

**En esnek yol:** GitHub Actions
- Tam kontrol
- Ücretsiz
- Ama signing manuel yapılandırma gerekiyor

