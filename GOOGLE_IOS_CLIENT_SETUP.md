# Google Cloud Console - iOS OAuth Client Kurulumu

## 📋 Gerekli Bilgiler

Google Cloud Console'da iOS OAuth client oluştururken şu bilgileri kullanın:

### Zorunlu Alanlar

1. **Application type:** `iOS`
2. **Name:** `Alerta iOS` (veya istediğiniz isim)
3. **Bundle ID:** `com.kriptokirmizi.alerta`
4. **Team ID:** `P6NB9T5SQ9`

### Opsiyonel Alanlar

5. **App Store ID:** (Boş bırakabilirsiniz)
   - Eğer App Store Connect'te uygulama oluşturduysanız yazın
   - Henüz oluşturmadıysanız boş bırakın

---

## 🔍 Team ID Nasıl Bulunur?

### Yöntem 1: Apple Developer Portal (Önerilen)
1. https://developer.apple.com/account adresine gidin
2. Giriş yapın
3. Sağ üstte **Membership** sekmesine tıklayın
4. **Team ID** orada görünecek: `P6NB9T5SQ9`

### Yöntem 2: Xcode
1. Xcode → **Preferences** (⌘,)
2. **Accounts** sekmesi
3. Apple ID'nizi seçin
4. Team ID görünecek

---

## 📱 App Store ID Nasıl Bulunur? (Opsiyonel)

App Store ID sadece App Store Connect'te uygulama oluşturduysanız gereklidir.

### App Store Connect'te Uygulama Oluşturma

1. https://appstoreconnect.apple.com adresine gidin
2. **My Apps** → **+** → **New App**
3. Uygulama bilgilerini doldurun
4. App Store ID otomatik oluşturulur

**Not:** Henüz uygulama oluşturmadıysanız App Store ID'yi boş bırakabilirsiniz. Sonra Google Cloud Console'da düzenleyebilirsiniz.

---

## ✅ Adım Adım Kurulum

### 1. Google Cloud Console'a Git
https://console.cloud.google.com

### 2. Projeyi Seç
- Sol üst köşeden **alertachart** projesini seçin

### 3. Credentials Sayfasına Git
- Sol menüden **APIs & Services** → **Credentials**

### 4. OAuth Client ID Oluştur
1. Üstte **+ CREATE CREDENTIALS** → **OAuth client ID**
2. **Application type:** **iOS** seçin
3. Formu doldurun:
   - **Name:** `Alerta iOS`
   - **Bundle ID:** `com.kriptokirmizi.alerta`
   - **App Store ID:** (Boş bırakın veya varsa yazın)
   - **Team ID:** `P6NB9T5SQ9`
4. **Create** butonuna tıklayın

### 5. Client ID'yi Kopyala
Oluşturulan iOS OAuth client ID'yi kopyalayın. Format:
```
XXXXXXXXXX-YYYYYYYYYYYY.apps.googleusercontent.com
```

### 6. Capacitor Config'e Ekle
`capacitor.config.ts` dosyasını düzenleyin ve client ID'yi ekleyin.

---

## ⚠️ Önemli Notlar

- **Team ID zorunludur** - `P6NB9T5SQ9`
- **App Store ID opsiyoneldir** - Boş bırakabilirsiniz
- **Bundle ID doğru olmalı** - `com.kriptokirmizi.alerta`
- iOS OAuth client oluşturduktan sonra Google Sign-In iOS'ta çalışacak

---

## 🆘 Sorun Giderme

### "Invalid Team ID" hatası
- Team ID'yi Apple Developer portal'dan kontrol edin
- Doğru Team ID: `P6NB9T5SQ9`

### "Invalid Bundle ID" hatası
- Bundle ID'nin Apple Developer Console'da kayıtlı olduğundan emin olun
- Doğru Bundle ID: `com.kriptokirmizi.alerta`

### App Store ID gerekli mi?
- Hayır, opsiyoneldir
- Sadece App Store Connect'te uygulama oluşturduysanız ekleyin

