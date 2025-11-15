# iOS Google Sign-In Kurulum Rehberi

## 🚨 Sorun

iOS'ta Google Sign-In çalışmıyor çünkü **web client ID kullanılamaz**. iOS için ayrı bir **iOS OAuth client ID** gerekiyor.

**Hata:**
```
Custom scheme IRIs not allowed for WEB client type
Hata 400
```

## ✅ Çözüm: iOS OAuth Client Oluşturma

### Adım 1: Google Cloud Console'a Git

1. https://console.cloud.google.com adresine gidin
2. Projenizi seçin: **alertachart**

### Adım 2: OAuth 2.0 Client ID Oluştur

1. Sol menüden **APIs & Services** → **Credentials**
2. Üstte **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type:** **iOS** seçin
4. **Name:** `Alerta iOS` (veya istediğiniz isim)
5. **Bundle ID:** `com.kriptokirmizi.alerta`
6. **App Store ID:** (OPSIYONEL - Boş bırakabilirsiniz)
   - Eğer App Store Connect'te uygulama oluşturduysanız, App Store ID'yi yazın
   - Henüz oluşturmadıysanız boş bırakın (sonra ekleyebilirsiniz)
7. **Team ID:** `P6NB9T5SQ9`
   - Apple Developer hesabınızın Team ID'si
   - https://developer.apple.com/account → Membership → Team ID
8. **Create** butonuna tıklayın

### Adım 3: Client ID'yi Kopyala

Oluşturulan iOS OAuth client ID'yi kopyalayın. Format:
```
XXXXXXXXXX-YYYYYYYYYYYY.apps.googleusercontent.com
```

### Adım 4: Capacitor Config'e Ekle

`capacitor.config.ts` dosyasını düzenleyin:

```typescript
plugins: {
  GoogleAuth: {
    scopes: ['profile', 'email'],
    serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
    clientId: 'XXXXXXXXXX-YYYYYYYYYYYY.apps.googleusercontent.com', // iOS OAuth client ID
    forceCodeForRefreshToken: true,
  },
},
```

### Adım 5: Sync ve Build

```bash
cd /Users/ata/Desktop/alertachart
npx cap sync ios
```

Xcode'da tekrar build edin.

---

## 📝 Notlar

- **Web client ID** iOS'ta kullanılamaz
- **iOS OAuth client ID** sadece iOS için geçerlidir
- **Android** için ayrı bir Android OAuth client ID gerekir (şu an gerekli değil)
- **serverClientId** her iki platform için de aynıdır (web client ID)

---

## 🔍 Kontrol

iOS OAuth client oluşturduktan sonra:

1. Google Cloud Console → Credentials
2. "OAuth 2.0 Client IDs" listesinde iOS client'ınızı görmelisiniz
3. Client ID'yi kopyalayıp `capacitor.config.ts`'e ekleyin
4. `npx cap sync ios` çalıştırın
5. Xcode'da build edin

---

## ⚠️ Geçici Çözüm

iOS OAuth client oluşturulana kadar, iOS'ta Google Sign-In çalışmayacak. Alternatif olarak:

1. **Apple Sign-In kullanın** (iOS'ta çalışır)
2. **Web-based OAuth** kullanın (ASWebAuthenticationSession ile)

iOS OAuth client oluşturduktan sonra Google Sign-In çalışacak.

