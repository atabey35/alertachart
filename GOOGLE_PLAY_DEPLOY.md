# Google Play Console'a Android Uygulaması Yükleme Rehberi

## 📋 Ön Hazırlık

### 1. Signing Key Oluşturma (İlk Kez)

Eğer daha önce signing key oluşturmadıysanız:

```bash
cd android/app
keytool -genkey -v -keystore alerta-release.keystore -alias alerta -keyalg RSA -keysize 2048 -validity 10000
```

Sorular:
- **Password**: Güçlü bir şifre (unutmayın!)
- **Name**: İsim
- **Organization**: Şirket adı
- **City**: Şehir
- **State**: Eyalet
- **Country**: Ülke kodu (TR, US, vb.)

⚠️ **ÖNEMLİ**: 
- `alerta-release.keystore` dosyasını GÜVENLİ bir yerde saklayın
- Şifreyi kaydedin (unutursanız uygulamayı güncelleyemezsiniz!)
- Bu dosya uygulamanın kimliğidir

### 2. Keystore Properties Dosyası Oluşturma

```bash
cd android
cat > keystore.properties << EOF
storeFile=app/alerta-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=alerta
keyPassword=YOUR_KEY_PASSWORD
EOF
```

⚠️ **GÜVENLİK**: `keystore.properties` dosyasını `.gitignore`'a ekleyin!

### 3. Build.gradle'ı Güncelleme

`android/app/build.gradle` dosyasına signing config ekleyin (zaten ekli olabilir):

```gradle
android {
    ...
    
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🏗️ Release Build Oluşturma

### 1. Version Code ve Version Name Güncelleme

`android/app/build.gradle` dosyasında:

```gradle
android {
    defaultConfig {
        versionCode 1  // Her yeni release'te artırın (1, 2, 3, ...)
        versionName "1.0.0"  // Kullanıcıya gösterilen versiyon
    }
}
```

### 2. Release AAB (Android App Bundle) Oluşturma

**Önerilen**: AAB formatı (Google Play'in tercih ettiği format)

```bash
cd android
./gradlew bundleRelease
```

APK dosyası oluşturmak isterseniz:

```bash
cd android
./gradlew assembleRelease
```

### 3. Build Dosyasının Konumu

- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📤 Google Play Console'a Yükleme

### 1. Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) → Giriş yapın
2. Uygulamanızı seçin (yoksa **Create app** ile yeni uygulama oluşturun)

### 2. İlk Yükleme (Production)

#### a) App Information

1. Sol menüden **Setup** → **App content** seçin
2. Gerekli bilgileri doldurun:
   - **App name**: Alerta Chart
   - **Short description**: Kısa açıklama (80 karakter)
   - **Full description**: Detaylı açıklama
   - **App icon**: 512x512 PNG
   - **Feature graphic**: 1024x500 PNG
   - **Screenshots**: En az 2 adet (telefon için)
   - **Privacy Policy URL**: Gerekli (GDPR için)

#### b) Store Listing

1. **Store listing** sekmesine gidin
2. Tüm gerekli alanları doldurun:
   - **App icon**: 512x512 PNG
   - **Feature graphic**: 1024x500 PNG
   - **Phone screenshots**: En az 2, en fazla 8
   - **Tablet screenshots**: Opsiyonel
   - **Description**: Uygulama açıklaması
   - **Short description**: Kısa açıklama

#### c) Content Rating

1. **Content rating** → **Start questionnaire**
2. Soruları cevaplayın
3. Rating alın (genellikle "Everyone" olur)

#### d) Target Audience

1. **Target audience** → Yaş grubunu seçin
2. **Data safety** formunu doldurun

#### e) App Access

1. **App access** → Uygulamanın erişim durumunu belirtin
2. Genellikle "All functionality is available" seçilir

### 3. Release Oluşturma

#### a) Production Release

1. Sol menüden **Production** → **Releases** seçin
2. **Create new release** butonuna tıklayın

#### b) AAB/APK Yükleme

1. **Upload** butonuna tıklayın
2. `app-release.aab` veya `app-release.apk` dosyasını seçin
3. Yükleme tamamlanana kadar bekleyin

#### c) Release Notes

1. **Release name**: Versiyon numarası (örn: "1.0.0")
2. **Release notes**: 
   ```
   - İlk sürüm
   - Premium subscription desteği
   - Google ve Apple Sign-In
   - Push notifications
   ```

#### d) Review ve Submit

1. **Review release** butonuna tıklayın
2. Hataları kontrol edin
3. **Start rollout to Production** butonuna tıklayın
4. Onay verin

### 4. İlk Review Süreci

Google Play ekibi uygulamanızı inceleyecek:
- **Süre**: 1-7 gün (genellikle 1-3 gün)
- **Durum**: **Under review** → **Available on Google Play**

---

## 🔄 Güncelleme Yükleme (Sonraki Versiyonlar)

### 1. Version Code Artırma

`android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2  // Önceki: 1 → Yeni: 2
    versionName "1.0.1"  // Versiyon numarası
}
```

### 2. Yeni Build Oluşturma

```bash
cd android
./gradlew bundleRelease
```

### 3. Google Play Console'a Yükleme

1. **Production** → **Releases** → **Create new release**
2. Yeni AAB dosyasını yükleyin
3. Release notes ekleyin:
   ```
   - Bug fixes
   - Performance improvements
   - New features
   ```
4. **Review release** → **Start rollout to Production**

---

## 🧪 Internal Testing / Closed Testing

Production'a yüklemeden önce test etmek için:

### 1. Internal Testing

1. **Testing** → **Internal testing** → **Create new release**
2. AAB/APK yükleyin
3. **Testers** → Test email'leri ekleyin
4. Test linkini paylaşın

### 2. Closed Testing

1. **Testing** → **Closed testing** → **Create new release**
2. AAB/APK yükleyin
3. **Testers** → Test grubu oluşturun
4. Test linkini paylaşın

---

## ⚠️ Önemli Notlar

### 1. Signing Key Güvenliği

- **ASLA** keystore dosyasını kaybetmeyin
- **ASLA** şifreyi unutmayın
- Güvenli bir yerde yedekleyin (encrypted)
- Eğer kaybederseniz, uygulamayı güncelleyemezsiniz!

### 2. Version Code

- Her yeni release'te **mutlaka** artırın
- Aynı version code ile yükleyemezsiniz
- Sadece artırılabilir, azaltılamaz

### 3. AAB vs APK

- **AAB (Önerilen)**: Google Play otomatik olarak optimize eder
- **APK**: Manuel olarak yüklenir, daha büyük dosya

### 4. Review Süreci

- İlk yükleme: 1-7 gün
- Güncellemeler: Genellikle daha hızlı (saatler içinde)
- Reddedilirse, feedback'i okuyun ve düzeltin

### 5. IAP (In-App Purchase)

- IAP product'larını **önce** oluşturun
- Production'a yüklemeden önce test edin
- Test hesapları ile test yapın

---

## 🐛 Sorun Giderme

### "Upload failed: You need to use a different version code"

**Çözüm**: `versionCode`'u artırın

```gradle
versionCode 2  // Önceki: 1
```

### "App not signed"

**Çözüm**: Signing config'i kontrol edin

```bash
cd android
./gradlew bundleRelease --info | grep signing
```

### "Keystore file not found"

**Çözüm**: 
1. `keystore.properties` dosyasını kontrol edin
2. `storeFile` path'inin doğru olduğundan emin olun
3. Keystore dosyasının var olduğundan emin olun

### "Version name already used"

**Çözüm**: `versionName`'i değiştirin

```gradle
versionName "1.0.1"  // Önceki: "1.0.0"
```

---

## 📚 Kaynaklar

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)
- [App Signing](https://developer.android.com/studio/publish/app-signing)

---

## ✅ Kontrol Listesi

### İlk Yükleme
- [ ] Signing key oluşturuldu
- [ ] `keystore.properties` dosyası oluşturuldu
- [ ] `build.gradle` signing config eklendi
- [ ] Version code: 1
- [ ] Version name: 1.0.0
- [ ] Release AAB oluşturuldu
- [ ] App information dolduruldu
- [ ] Store listing tamamlandı
- [ ] Content rating alındı
- [ ] Privacy policy eklendi
- [ ] AAB Google Play Console'a yüklendi
- [ ] Release notes eklendi
- [ ] Production'a submit edildi

### Güncelleme
- [ ] Version code artırıldı
- [ ] Version name güncellendi
- [ ] Yeni AAB oluşturuldu
- [ ] Release notes yazıldı
- [ ] Google Play Console'a yüklendi
- [ ] Production'a submit edildi








