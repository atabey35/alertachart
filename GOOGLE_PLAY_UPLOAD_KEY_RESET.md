# Google Play Upload Key Reset - Adım Adım

## ✅ Tamamlanan Adımlar

1. ✅ Yeni upload key oluşturuldu: `android/app/upload-key.keystore`
2. ✅ Certificate export edildi: `android/app/upload_certificate.pem`

## 📤 Google Play Console'da Reset

### 1. Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) → Giriş yapın
2. Uygulamanızı seçin

### 2. App Signing Sayfasına Git

1. Sol menüden **Setup** → **App signing** seçin
2. **Yükleme anahtarı sertifikası** (Upload key certificate) bölümüne gidin

### 3. Upload Key Reset İste

1. **"Yükleme anahtarı sıfırlama isteğinde bulunma"** (Request upload key reset) linkine tıklayın
2. Açılan sayfada **"Yeni yükleme sertifikası yükle"** (Upload new upload certificate) butonuna tıklayın

### 4. Certificate Dosyasını Yükle

1. **"Dosya seç"** veya **"Upload"** butonuna tıklayın
2. `android/app/upload_certificate.pem` dosyasını seçin
3. **"Yükle"** (Upload) butonuna tıklayın

### 5. Onay

1. Google, yeni certificate'i doğrulayacak
2. Onay mesajı görünecek
3. ✅ Upload key reset tamamlandı!

## 🔧 Keystore Properties Oluştur

Reset tamamlandıktan sonra:

```bash
cd android
cat > keystore.properties << EOF
storeFile=app/upload-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
EOF
```

⚠️ **ÖNEMLİ**: `YOUR_KEYSTORE_PASSWORD` ve `YOUR_KEY_PASSWORD` yerine keystore oluştururken girdiğiniz şifreleri yazın!

## ✅ Kontrol

Upload key reset edildikten sonra:

1. Google Play Console → **Setup** → **App signing**
2. **Yükleme anahtarı sertifikası** bölümünde yeni SHA-1 fingerprint görünmeli
3. Yeni SHA-1'i kontrol edin:

```bash
keytool -list -v -keystore android/app/upload-key.keystore -alias upload | grep SHA1
```

Bu SHA-1, Google Play Console'da görünen yeni SHA-1 ile eşleşmeli.

## 🚀 Sonraki Adımlar

1. ✅ Upload key reset edildi
2. ✅ `keystore.properties` oluşturuldu
3. Version code artır: `android/app/build.gradle` → `versionCode 2`
4. Build al: `cd android && ./gradlew clean bundleRelease`
5. Google Play Console'a yükle: **Production** → **Releases** → **Create new release**

## ⚠️ Önemli Notlar

1. **Reset işlemi geri alınamaz**: Eski upload key artık kullanılamaz
2. **Yeni key ile build**: Reset sonrası sadece yeni key ile build alabilirsiniz
3. **Şifreleri saklayın**: Keystore şifrelerini güvenli bir yerde saklayın
4. **keystore.properties**: `.gitignore`'a eklendi, commit edilmeyecek

## 🐛 Sorun Giderme

### "Certificate invalid"

**Sorun**: Certificate formatı yanlış

**Çözüm**: 
```bash
# Tekrar export edin
keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem
```

### "Upload key reset failed"

**Sorun**: Google Play Console'da bir hata oluştu

**Çözüm**:
- Certificate dosyasının doğru olduğundan emin olun
- `.pem` formatında olduğundan emin olun
- Tekrar deneyin

### "Build failed: keystore not found"

**Sorun**: `keystore.properties` dosyası yanlış path

**Çözüm**:
```bash
# Path'i kontrol edin
cat android/keystore.properties

# Doğru path:
# storeFile=app/upload-key.keystore
```






