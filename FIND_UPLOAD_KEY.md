# Mevcut Upload Key'inizi Bulma

## 🔍 Upload Key Bilgileriniz

Google Play Console'dan upload key'inizin SHA-1 fingerprint'i:
```
25:57:A8:3A:39:9A:2A:97:A0:83:DE:61:DF:61:9E:00:EF:09:71:3D
```

## 🔑 Upload Key'inizi Bulma

### Yöntem 1: Mevcut Keystore Dosyalarınızı Kontrol Edin

Mevcut keystore dosyalarınızın SHA-1 fingerprint'ini kontrol edin:

```bash
# Tüm keystore dosyalarını bulun
find . -name "*.keystore" -o -name "*.jks" 2>/dev/null

# Her keystore için SHA-1 fingerprint kontrol edin
keytool -list -v -keystore PATH_TO_KEYSTORE -alias ALIAS_NAME
```

### Yöntem 2: Eski Build Dosyalarınızı Kontrol Edin

Eğer daha önce release build yaptıysanız:
- Eski bilgisayarınızı kontrol edin
- Yedeklerinizi kontrol edin
- Eski proje dizinlerinizi kontrol edin

### Yöntem 3: Keystore'u SHA-1 ile Bulma Script'i

```bash
#!/bin/bash
# Bu script tüm keystore dosyalarını bulur ve SHA-1'lerini kontrol eder

TARGET_SHA1="25:57:A8:3A:39:9A:2A:97:A0:83:DE:61:DF:61:9E:00:EF:09:71:3D"

echo "🔍 Upload key aranıyor..."
echo "Hedef SHA-1: $TARGET_SHA1"
echo ""

# Tüm keystore dosyalarını bul
find . -type f \( -name "*.keystore" -o -name "*.jks" \) 2>/dev/null | while read keystore; do
    echo "Kontrol ediliyor: $keystore"
    
    # Tüm alias'ları listele
    keytool -list -keystore "$keystore" -storepass "" 2>/dev/null | grep "Alias name" | awk '{print $3}' | while read alias; do
        if [ ! -z "$alias" ]; then
            SHA1=$(keytool -list -v -keystore "$keystore" -alias "$alias" -storepass "" 2>/dev/null | grep "SHA1:" | awk '{print $2}')
            
            if [ "$SHA1" = "$TARGET_SHA1" ]; then
                echo ""
                echo "✅ BULUNDU!"
                echo "Keystore: $keystore"
                echo "Alias: $alias"
                echo "SHA-1: $SHA1"
                echo ""
                exit 0
            fi
        fi
    done
done

echo ""
echo "❌ Upload key bulunamadı"
echo "Yeni upload key oluşturmanız gerekecek"
```

## 🔄 Upload Key Bulunamazsa

Eğer upload key'inizi bulamazsanız:

### Seçenek 1: Yeni Upload Key Oluştur ve Reset Et

1. **Yeni upload key oluştur:**
```bash
cd android/app
keytool -genkey -v -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

2. **Certificate'i export et:**
```bash
keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem
```

3. **Google Play Console'da reset:**
   - Google Play Console → **Setup** → **App signing**
   - **Yükleme anahtarı sıfırlama isteğinde bulunma** (Request upload key reset)
   - `upload_certificate.pem` dosyasını yükleyin

4. **keystore.properties oluştur:**
```bash
cd android
cat > keystore.properties << EOF
storeFile=app/upload-key.keystore
storePassword=YOUR_PASSWORD
keyAlias=upload
keyPassword=YOUR_PASSWORD
EOF
```

### Seçenek 2: Mevcut Upload Key'i Kullan (Bulursanız)

1. **Keystore dosyasını `android/app/` dizinine kopyalayın**
2. **keystore.properties oluşturun:**
```bash
cd android
cat > keystore.properties << EOF
storeFile=app/YOUR_KEYSTORE.keystore
storePassword=YOUR_PASSWORD
keyAlias=YOUR_ALIAS
keyPassword=YOUR_PASSWORD
EOF
```

## ✅ Kontrol

Upload key'inizi bulduktan sonra SHA-1'i kontrol edin:

```bash
keytool -list -v -keystore android/app/YOUR_KEYSTORE.keystore -alias YOUR_ALIAS
```

SHA-1 fingerprint şu olmalı:
```
25:57:A8:3A:39:9A:2A:97:A0:83:DE:61:DF:61:9E:00:EF:09:71:3D
```

## 🚀 Sonraki Adımlar

1. Upload key'inizi bulun veya yeni oluşturun
2. `keystore.properties` dosyasını oluşturun
3. Version code'u artırın
4. Build alın: `cd android && ./gradlew bundleRelease`
5. Google Play Console'a yükleyin


