# Bekleyen Upload Key Reset İsteği - Çözüm

## 📋 Durum

Google Play Console'da **"Bekleyen bir upload key reset isteği var"** görünüyor.

## ✅ Çözüm Adımları

### 1. Certificate Export Et

Eğer henüz export etmediyseniz:

```bash
./scripts/export-upload-certificate.sh
```

Veya manuel:

```bash
cd android/app
keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem
# Keystore şifresini girin
```

### 2. Google Play Console'da İşlem

#### Seçenek A: Bekleyen İsteği İptal Et ve Yeni İstek Oluştur

1. Google Play Console → **Setup** → **App signing**
2. **"İsteği iptal et"** (Cancel request) butonuna tıklayın
3. Bekleyen istek iptal edildi
4. **"Yükleme anahtarı sıfırlama isteğinde bulunma"** (Request upload key reset) linkine tıklayın
5. **"Yeni yükleme sertifikası yükle"** (Upload new upload certificate) butonuna tıklayın
6. `android/app/upload_certificate.pem` dosyasını yükleyin
7. Onay verin

#### Seçenek B: Bekleyen İsteği Tamamla

Eğer bekleyen istek zaten certificate yüklemesi için bekliyorsa:

1. Google Play Console → **Setup** → **App signing**
2. Bekleyen istek bölümünde **"Certificate yükle"** veya benzer bir buton olabilir
3. `android/app/upload_certificate.pem` dosyasını yükleyin
4. Onay verin

### 3. Reset Onayı

- Google, yeni certificate'i doğrulayacak
- Onay mesajı görünecek: **"Upload key reset tamamlandı"**
- ✅ Artık yeni upload key ile build alabilirsiniz!

## 🔍 Certificate Kontrolü

Reset tamamlandıktan sonra, yeni SHA-1 fingerprint'i kontrol edin:

```bash
keytool -list -v -keystore android/app/upload-key.keystore -alias upload | grep SHA1
```

Bu SHA-1, Google Play Console'da görünen yeni SHA-1 ile eşleşmeli.

## ✅ Hazır!

Reset tamamlandıktan sonra:

1. ✅ Upload key reset edildi
2. ✅ `keystore.properties` hazır (zaten oluşturuldu)
3. Version code artır: `android/app/build.gradle` → `versionCode 2`
4. Build al: `cd android && ./gradlew clean bundleRelease`
5. Google Play Console'a yükle: **Production** → **Releases** → **Create new release**

## ⚠️ Önemli Notlar

1. **Bekleyen istek**: İptal edebilir veya tamamlayabilirsiniz
2. **Certificate format**: `.pem` formatında olmalı
3. **Tek seferlik**: Reset işlemi geri alınamaz
4. **Yeni key**: Artık sadece yeni upload key ile build alabilirsiniz

## 🐛 Sorun Giderme

### "Certificate invalid"

**Sorun**: Certificate formatı yanlış veya eksik

**Çözüm**: 
```bash
# Tekrar export edin
cd android/app
keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem
```

### "Request already pending"

**Sorun**: Bekleyen istek var

**Çözüm**: 
- İsteği iptal edin
- Yeni istek oluşturun
- Certificate yükleyin

### "Upload key reset failed"

**Sorun**: Google Play Console'da hata

**Çözüm**:
- Certificate dosyasının doğru olduğundan emin olun
- `.pem` formatında olduğundan emin olun
- Tekrar deneyin



