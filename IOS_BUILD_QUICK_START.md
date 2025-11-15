# iOS Build - Hızlı Başlangıç (Xcode Olmadan)

## 🚀 Seçenek 1: GitHub Actions (Önerilen)

### Adım 1: GitHub Secrets Ekle

GitHub repo'nuzda:
1. **Settings** → **Secrets and variables** → **Actions**
2. Şu secret'ları ekleyin:
   - `APPLE_TEAM_ID`: Apple Developer Team ID'niz
   - `APPLE_ID`: Apple ID email'iniz (opsiyonel, TestFlight için)
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password (opsiyonel)

**Team ID'yi bulmak için:**
- https://developer.apple.com/account → Membership → Team ID
- Veya Xcode yüklüyse: Xcode → Preferences → Accounts → Team ID

### Adım 2: Workflow'u Tetikle

1. GitHub repo → **Actions** sekmesi
2. **iOS Build** workflow'unu seçin
3. **Run workflow** → **Run workflow** butonuna tıklayın
4. Build tamamlanana kadar bekleyin (10-20 dakika)

### Adım 3: IPA'yı İndir

1. Actions sayfasında build'i bulun
2. **Artifacts** bölümünden **ios-app** dosyasını indirin
3. İndirdiğiniz zip'i açın, içinde `.ipa` dosyası var

### Adım 4: Cihaza Yükle

**Seçenek A: TestFlight (Önerilen)**
```bash
# App Store Connect'e yükle
# https://appstoreconnect.apple.com → TestFlight → Build yükle
```

**Seçenek B: Direct Install (Mac gerekli)**
```bash
npm install -g ios-deploy
ios-deploy --bundle path/to/App.ipa
```

---

## 🎯 Seçenek 2: Codemagic (Daha Kolay)

### Kurulum:

1. **Codemagic'a kaydol:** https://codemagic.io (ücretsiz)
2. **GitHub repo'yu bağla**
3. **Capacitor template seç**
4. **Apple credentials ekle:**
   - Codemagic → App Store Connect → Credentials
   - Apple ID ve app-specific password

### Build Al:

Codemagic dashboard'dan **Start new build** → iOS → Build

**Avantajlar:**
- ✅ Otomatik signing
- ✅ TestFlight'a otomatik upload
- ✅ Daha kolay kurulum
- ✅ Ücretsiz: 500 dakika/ay

---

## 🔧 Seçenek 3: Bitrise

1. **Bitrise'a kaydol:** https://bitrise.io
2. **Projeyi bağla**
3. **Capacitor workflow seç**
4. **Build al**

---

## ⚠️ Önemli Notlar

### Apple Developer Hesabı Gerekli
- Ücretsiz Apple Developer hesabı yeterli (development build için)
- Paid hesap gerekli (App Store'a yayınlamak için)

### Team ID Bulma
```bash
# Xcode yüklüyse:
xcode-select -p
# Çıktı: /Applications/Xcode.app/Contents/Developer

# Apple Developer portal:
# https://developer.apple.com/account → Membership
```

### İlk Build Uzun Sürer
- İlk build 15-30 dakika sürebilir (dependencies indirme)
- Sonraki build'ler daha hızlı (cache sayesinde)

---

## 🆘 Sorun Giderme

### "No signing certificate" hatası
- Apple Developer hesabı gerekli
- Team ID'yi GitHub secrets'a ekleyin

### "Provisioning profile" hatası
- Automatic signing kullanıyoruz, bu hata normalde olmamalı
- Team ID doğru olduğundan emin olun

### Build başarısız
- GitHub Actions logs'unu kontrol edin
- CocoaPods hataları için: workflow'da `pod repo update` eklenebilir

---

## 💡 Hangi Seçeneği Seçmeliyim?

**GitHub Actions:**
- ✅ Ücretsiz
- ✅ Tam kontrol
- ⚠️ Signing manuel yapılandırma

**Codemagic:**
- ✅ Otomatik signing
- ✅ TestFlight upload
- ✅ Kolay kurulum
- ⚠️ Ücretsiz tier sınırlı

**Öneri:** İlk deneme için Codemagic, tam kontrol için GitHub Actions

