# Mevcut Uygulamaya Yeni Sürüm Yükleme

## 📋 Hızlı Adımlar

### 1. Mevcut Signing Key'i Kontrol Et

Eğer daha önce release build yaptıysanız, signing key'iniz zaten var. Kontrol edin:

```bash
cd android
ls -la app/*.keystore
ls -la keystore.properties
```

**Eğer keystore yoksa:**
- Google Play Console → **Setup** → **App signing** → **App signing key certificate** bölümünden SHA-1 fingerprint'i kontrol edin
- Eski keystore dosyanızı bulun veya Google Play'in managed signing kullanıyorsanız yeni keystore oluşturmayın

### 2. Version Code Artır

`android/app/build.gradle` dosyasını açın:

```gradle
defaultConfig {
    versionCode 2  // Önceki: 1 → Yeni: 2 (her yeni release'te artırın)
    versionName "1.0.1"  // Kullanıcıya gösterilen versiyon
}
```

⚠️ **ÖNEMLİ**: 
- `versionCode` mutlaka artırılmalı (aynı code ile yükleyemezsiniz)
- Sadece artırılabilir, azaltılamaz
- Google Play Console'da son yüklenen version code'dan büyük olmalı

### 3. Release Build Oluştur

```bash
cd android
./gradlew clean bundleRelease
```

Veya script kullanın:

```bash
./scripts/build-release.sh
```

**AAB dosyası konumu:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

### 4. Google Play Console'a Yükle

#### a) Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) → Giriş yapın
2. Mevcut uygulamanızı seçin

#### b) Production Release Oluştur

1. Sol menüden **Production** → **Releases** seçin
2. **Create new release** butonuna tıklayın

#### c) AAB Dosyasını Yükle

1. **Upload** butonuna tıklayın
2. `app-release.aab` dosyasını seçin
3. Yükleme tamamlanana kadar bekleyin (birkaç dakika)

#### d) Release Notes Ekleyin

**Release name** (opsiyonel):
```
1.0.1
```

**What's new in this release**:
```
- Premium subscription desteği eklendi
- Google ve Apple Sign-In entegrasyonu
- Push notification sistemi
- IAP (In-App Purchase) desteği
- Performans iyileştirmeleri
- Bug fixes
```

#### e) Review ve Submit

1. **Review release** butonuna tıklayın
2. Hataları kontrol edin:
   - ✅ Version code doğru mu?
   - ✅ AAB dosyası yüklendi mi?
   - ✅ Release notes eklendi mi?
3. **Start rollout to Production** butonuna tıklayın
4. Onay verin

### 5. Review Süreci

- **Süre**: Genellikle birkaç saat - 1 gün
- **Durum**: **Under review** → **Available on Google Play**
- **Bildirim**: Email ile bilgilendirilirsiniz

---

## 🔄 Hızlı Güncelleme Komutları

### Tek Seferde Her Şeyi Yapmak İçin

```bash
# 1. Version code'u artır (manuel olarak build.gradle'da)
# 2. Build oluştur
cd android && ./gradlew clean bundleRelease

# 3. AAB dosyası hazır:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📊 Version Code Kontrolü

Google Play Console'da mevcut version code'u kontrol etmek için:

1. **Production** → **Releases** → En son release'e tıklayın
2. **App bundles and APKs** bölümünde version code görünür

Yeni version code bu değerden **büyük** olmalı.

---

## ⚠️ Önemli Notlar

### 1. Signing Key

- **Mevcut uygulama varsa**: Aynı signing key kullanmalısınız
- **Yeni keystore oluşturmayın**: Uygulamayı güncelleyemezsiniz
- **Google Play App Signing kullanıyorsanız**: Yeni keystore oluşturabilirsiniz (Google otomatik dönüştürür)

### 2. Version Code

- **Mutlaka artırın**: Aynı code ile yükleyemezsiniz
- **Sadece artırılabilir**: Azaltılamaz
- **Örnek**: 1 → 2 → 3 → 4...

### 3. AAB vs APK

- **AAB (Önerilen)**: Google Play otomatik optimize eder
- **APK**: Manuel yükleme, daha büyük dosya

### 4. Rollout Stratejisi

- **100% rollout**: Tüm kullanıcılara hemen yayınla
- **Staged rollout**: Yavaş yavaş yayınla (önerilen)
  - %5 → %10 → %50 → %100

---

## 🐛 Sorun Giderme

### "You need to use a different version code"

**Sorun**: Version code önceki release'ten küçük veya eşit

**Çözüm**: 
1. Google Play Console'da mevcut version code'u kontrol edin
2. `build.gradle`'da daha büyük bir değer kullanın

```gradle
versionCode 3  // Önceki: 2
```

### "App not signed"

**Sorun**: Signing key bulunamıyor

**Çözüm**:
1. `keystore.properties` dosyasının var olduğundan emin olun
2. Keystore dosyasının doğru konumda olduğundan emin olun
3. Şifrelerin doğru olduğundan emin olun

### "Upload failed: Invalid AAB"

**Sorun**: AAB dosyası bozuk veya eksik

**Çözüm**:
1. Temiz build yapın: `./gradlew clean bundleRelease`
2. AAB dosyasının boyutunu kontrol edin (0 byte olmamalı)
3. Tekrar build yapın

### "Version name already used"

**Sorun**: Aynı version name ile daha önce release yapılmış

**Çözüm**: Version name'i değiştirin (version code değil!)

```gradle
versionName "1.0.2"  // Önceki: "1.0.1"
```

---

## ✅ Kontrol Listesi

### Build Öncesi
- [ ] Mevcut version code kontrol edildi (Google Play Console)
- [ ] Yeni version code belirlendi (öncekinden büyük)
- [ ] Version name güncellendi
- [ ] Signing key mevcut ve doğru

### Build
- [ ] `./gradlew clean bundleRelease` çalıştırıldı
- [ ] Build başarılı
- [ ] AAB dosyası oluşturuldu

### Google Play Console
- [ ] Production → Releases → Create new release
- [ ] AAB dosyası yüklendi
- [ ] Release notes eklendi
- [ ] Review release yapıldı
- [ ] Hatalar kontrol edildi
- [ ] Start rollout to Production tıklandı

### Sonrası
- [ ] Review süreci bekleniyor
- [ ] Email bildirimi kontrol ediliyor
- [ ] Uygulama yayında mı kontrol ediliyor

---

## 📱 Test Etme

### Internal Testing (Önerilen)

Production'a yüklemeden önce test etmek için:

1. **Testing** → **Internal testing** → **Create new release**
2. AAB dosyasını yükleyin
3. **Testers** → Test email'leri ekleyin
4. Test linkini paylaşın
5. Test edin
6. Sorun yoksa Production'a yükleyin

---

## 🚀 Hızlı Komut Özeti

```bash
# 1. Version code'u artır (build.gradle'da manuel)
# versionCode 2

# 2. Build
cd android
./gradlew clean bundleRelease

# 3. AAB hazır:
# android/app/build/outputs/bundle/release/app-release.aab

# 4. Google Play Console'a yükle:
# Production → Releases → Create new release → Upload AAB
```

---

## 📚 Kaynaklar

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Version Your App](https://developer.android.com/studio/publish/versioning)
- [App Signing](https://developer.android.com/studio/publish/app-signing)




