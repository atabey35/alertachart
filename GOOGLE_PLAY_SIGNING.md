# Google Play App Signing - Upload Key Yönetimi

## 📋 Durumunuz

Google Play Console'da **"Uygulama imzalama: Google Play tarafından imzalanır"** görünüyor.

Bu şu anlama geliyor:
- ✅ Google Play App Signing **aktif**
- ✅ Google, uygulamanızı kendi signing key'i ile imzalıyor
- ✅ Siz bir **upload key** kullanıyorsunuz (Google'a yüklerken)

## 🔑 Upload Key Nedir?

**Upload key**: Google Play Console'a yüklerken kullandığınız keystore.

**App signing key**: Google'ın kullandığı gerçek signing key (sizde yok, Google'da).

## ✅ Ne Yapmalısınız?

### Seçenek 1: Mevcut Upload Key'iniz Varsa (Önerilen)

Eğer daha önce release yaptıysanız ve upload key'iniz varsa:

1. **Mevcut keystore dosyanızı bulun**
2. `android/app/` dizinine kopyalayın
3. `keystore.properties` dosyasını oluşturun:

```bash
cd android
cat > keystore.properties << EOF
storeFile=app/YOUR_UPLOAD_KEY.keystore
storePassword=YOUR_PASSWORD
keyAlias=YOUR_ALIAS
keyPassword=YOUR_PASSWORD
EOF
```

### Seçenek 2: Upload Key'iniz Yoksa veya Kaybettinizse

Yeni bir upload key oluşturabilirsiniz, ancak Google Play Console'da güncellemeniz gerekir:

#### 1. Yeni Upload Key Oluştur

```bash
cd android/app
keytool -genkey -v -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Google Play Console'da Güncelle

1. Google Play Console → **Setup** → **App signing**
2. **Upload key certificate** bölümüne gidin
3. **Request upload key reset** butonuna tıklayın
4. Yeni upload key'in certificate'ini yükleyin:

```bash
# Certificate'i export edin
keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem

# upload_certificate.pem dosyasını Google Play Console'a yükleyin
```

#### 3. Keystore Properties Oluştur

```bash
cd android
cat > keystore.properties << EOF
storeFile=app/upload-key.keystore
storePassword=YOUR_PASSWORD
keyAlias=upload
keyPassword=YOUR_PASSWORD
EOF
```

## 🚀 Build ve Yükleme

Upload key hazır olduktan sonra:

```bash
# 1. Version code artır (build.gradle'da)
# versionCode 2

# 2. Build
cd android
./gradlew clean bundleRelease

# 3. Google Play Console'a yükle
# Production → Releases → Create new release
```

## ⚠️ Önemli Notlar

1. **Upload key kaybedilirse**: Google Play Console'dan reset edebilirsiniz
2. **App signing key**: Google'da, sizde yok (bu normal)
3. **Her release'te**: Aynı upload key'i kullanın
4. **Yeni upload key**: Sadece kaybedilirse veya ilk kez oluşturuyorsanız

## 🔍 Mevcut Upload Key'inizi Bulma

Eğer upload key'inizi bulamıyorsanız:

1. **Eski build dosyalarınızı kontrol edin**
2. **Eski bilgisayarınızı kontrol edin**
3. **Yedeklerinizi kontrol edin**
4. **Eğer bulamazsanız**: Google Play Console'dan reset edin (yukarıdaki Seçenek 2)

## 📚 Kaynaklar

- [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Upload Key Reset](https://support.google.com/googleplay/android-developer/answer/9842756#reset)







