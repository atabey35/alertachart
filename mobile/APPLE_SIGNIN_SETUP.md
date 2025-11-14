# Apple Sign In Kurulum Rehberi

## 🎯 Amaç
Apple ile giriş yapmayı mobil uygulamada **in-app browser** ile çalıştırmak için gerekli ayarlar.

---

## 📋 Apple Developer Console Gereksinimleri

### 1. App ID Configuration
https://developer.apple.com/account/resources/identifiers/list

**Identifier:**
```
com.kriptokirmizi.alerta
```

**Capabilities:**
- ✅ Sign in with Apple (Enabled)
- ✅ Associated Domains (Enabled)
- ✅ Push Notifications (Enabled)

---

### 2. Sign in with Apple - Service ID

#### Service ID Oluşturma
1. Developer Console → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+** (Yeni Identifier)
3. Type: **Services IDs**
4. Description: `Alerta Chart Web`
5. Identifier: `com.kriptokirmizi.alerta.web`

#### Configure Sign in with Apple
1. Service ID'yi seç
2. **Sign in with Apple** seçeneğini işaretle
3. **Configure** butonuna tıkla

**Domains and Subdomains:**
```
alertachart.com
```

**Return URLs:**
```
https://alertachart.com/api/auth/callback/apple
https://alertachart.com/auth/callback
https://alertachart.com/auth/mobile-callback
```

4. **Continue** → **Save**

---

### 3. Keys (Apple Client Secret için)

#### Key Oluşturma
1. **Keys** → **+** (Yeni Key)
2. Key Name: `Alerta Apple Sign In Key`
3. **Sign in with Apple** seçeneğini işaretle
4. **Configure** → Primary App ID seç: `com.kriptokirmizi.alerta`
5. **Save**

**ÖNEMLİ:**
- Key'i indir (`.p8` dosyası) - Bir daha indirilemez!
- Key ID'yi not al (örn: `9N6QAL7HHC`)
- Team ID'yi not al (Developer Console sağ üst köşede)

**Dosya konumu:**
```
/Users/ata/Desktop/alertachart/scripts/AuthKey_9N6QAL7HHC.p8
```

---

## 🔐 Apple Client Secret Oluşturma

Apple Sign In, Google'dan farklı olarak JWT token oluşturmanızı gerektirir.

### generate-apple-secret.js Script'i Kullan

**Script konumu:**
```
/Users/ata/Desktop/alertachart/scripts/generate-apple-secret.js
```

**Kullanım:**
```bash
cd /Users/ata/Desktop/alertachart/scripts
node generate-apple-secret.js
```

**Çıktı:**
```
Apple Client Secret (JWT):
eyJhbGciOiJFUzI1NiIsImtpZCI6IjlONlFBTDdISEMifQ...
```

**Bu token'ı kopyalayın!**

---

### Environment Variables

Backend/Vercel environment variables:

```bash
APPLE_CLIENT_ID=com.kriptokirmizi.alerta.web
APPLE_CLIENT_SECRET=eyJhbGciOiJFUzI1NiIsImtpZCI6IjlONlFBTDdISEMifQ...
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=9N6QAL7HHC
```

**ÖNEMLİ:**
- `APPLE_CLIENT_ID`: Service ID (`.web` uzantılı)
- `APPLE_CLIENT_SECRET`: JWT token (6 ay geçerli)
- Token'ı her 6 ayda bir yenileyin!

---

## 🍎 iOS App Configuration

### app.json
`/mobile/app.json`:

```json
"ios": {
  "bundleIdentifier": "com.kriptokirmizi.alerta",
  "associatedDomains": [
    "applinks:alertachart.com",
    "webcredentials:alertachart.com"
  ],
  "infoPlist": {
    "CFBundleURLTypes": [{
      "CFBundleURLSchemes": ["com.kriptokirmizi.alerta"],
      "CFBundleURLName": "com.kriptokirmizi.alerta"
    }]
  }
}
```

### Entitlements (iOS)

Xcode'da projeyi açarsanız, `.entitlements` dosyasında:

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:alertachart.com</string>
  <string>webcredentials:alertachart.com</string>
</array>
```

**EAS Build otomatik oluşturur, manuel değişiklik gerekmez.**

---

## 🌐 Domain Verification (Universal Links)

### apple-app-site-association Dosyası

**Domain:** `alertachart.com`

**URL:** `https://alertachart.com/.well-known/apple-app-site-association`

**Dosya içeriği:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.kriptokirmizi.alerta",
        "paths": [
          "/auth/callback",
          "/auth/mobile-callback",
          "/app/auth/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "TEAM_ID.com.kriptokirmizi.alerta"
    ]
  }
}
```

**TEAM_ID:** Apple Developer Console'dan alın (sağ üst köşe)

**Dosya konumu:**
```
/public/.well-known/apple-app-site-association
```

**Doğrulama:**
```bash
curl https://alertachart.com/.well-known/apple-app-site-association
```

**Apple CDN kontrolü:**
https://app-site-association.cdn-apple.com/a/v1/alertachart.com

---

## 🔧 NextAuth Configuration

`/app/api/auth/[...nextauth]/route.ts`:

```typescript
AppleProvider({
  clientId: process.env.APPLE_CLIENT_ID!,
  clientSecret: process.env.APPLE_CLIENT_SECRET!,
  checks: ['none'], // Disable PKCE for Apple
  authorization: {
    params: {
      scope: 'name email',
      response_mode: 'form_post',
      response_type: 'code',
    },
  },
}),
```

---

## 🧪 Test Etme

### 1. Environment Variables Kontrolü

**Backend/Vercel:**
```bash
echo $APPLE_CLIENT_ID
echo $APPLE_CLIENT_SECRET
echo $APPLE_TEAM_ID
echo $APPLE_KEY_ID
```

### 2. Mobil Test

```bash
cd mobile
npx expo run:ios
```

**Test akışı:**
1. Uygulamayı aç
2. "Apple ile Devam Et" tıkla
3. **ASWebAuthenticationSession modal açılmalı** (Safari modal)
4. Apple ID ile giriş yap
5. Face ID/Touch ID ile onayla
6. Otomatik olarak uygulamaya dön

---

## ❌ Yaygın Hatalar ve Çözümler

### Hata 1: "invalid_client"
```
{
  "error": "invalid_client"
}
```

**Sebep**: Client Secret hatalı veya süresi dolmuş

**Çözüm:**
1. Yeni JWT token oluştur:
```bash
cd scripts
node generate-apple-secret.js
```
2. `APPLE_CLIENT_SECRET` environment variable'ı güncelle
3. Vercel'de environment variables'ı yeniden deploy et

---

### Hata 2: "invalid_grant"
```
{
  "error": "invalid_grant"
}
```

**Sebep**: Redirect URI eşleşmiyor

**Çözüm:**
1. Apple Developer Console → Service ID
2. Return URLs kontrol et:
   - ✅ `https://alertachart.com/api/auth/callback/apple`
   - ✅ `https://alertachart.com/auth/mobile-callback`
3. Domain doğru: `alertachart.com`

---

### Hata 3: "Email not shared"
```
User email is null
```

**Sebep**: Apple kullanıcısı email paylaşmayı reddetmiş

**Çözüm:**
NextAuth config'de fallback email:
```typescript
const userEmail = user.email || (account.provider === 'apple' 
  ? `${account.providerAccountId}@privaterelay.appleid.com` 
  : null);
```

**Zaten ekli!** Kod güncellendi.

---

### Hata 4: "App did not open after sign in"
```
Sign in successful but app doesn't open
```

**Sebep**: Deep link çalışmıyor

**Çözüm:**
1. Universal Links kontrolü:
```bash
curl https://alertachart.com/.well-known/apple-app-site-association
```
2. `appID` doğru olmalı: `TEAM_ID.com.kriptokirmizi.alerta`
3. Development build kullan (Expo Go çalışmaz)

---

## 🔄 Client Secret Yenileme (Her 6 Ay)

Apple JWT token'ı 6 ay geçerli. Süre dolmadan yenileyin:

### 1. Yeni Token Oluştur
```bash
cd /Users/ata/Desktop/alertachart/scripts
node generate-apple-secret.js
```

### 2. Environment Variable Güncelle
**Vercel:**
1. Dashboard → Settings → Environment Variables
2. `APPLE_CLIENT_SECRET` değişkenini düzenle
3. Yeni JWT token'ı yapıştır
4. Save

### 3. Redeploy
```bash
vercel --prod
```

---

## 📊 Son Kontrol Listesi

- [ ] App ID'de "Sign in with Apple" aktif
- [ ] Service ID oluşturuldu: `com.kriptokirmizi.alerta.web`
- [ ] Service ID'de Return URLs eklendi
- [ ] Key oluşturuldu ve `.p8` dosyası indirildi
- [ ] JWT token (Client Secret) oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] `apple-app-site-association` dosyası yayında
- [ ] Universal Links doğrulandı
- [ ] Mobil uygulama test edildi
- [ ] ASWebAuthenticationSession modal açılıyor

---

## 🎉 Tamamlandı!

Apple Sign In artık mobil uygulamanızda tamamen uygulama içinde çalışıyor!

**Test:**
```bash
cd mobile
npx expo run:ios
```

"Apple ile Devam Et" tıkla → Safari modal açılmalı → Face ID → Uygulama açılmalı ✅

---

## 📚 Kaynaklar

- [Apple Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [NextAuth Apple Provider](https://next-auth.js.org/providers/apple)
- [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
- [Universal Links](https://developer.apple.com/ios/universal-links/)

