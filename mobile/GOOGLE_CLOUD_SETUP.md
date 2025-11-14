# Google Cloud Console OAuth Kurulum Rehberi

## 🎯 Amaç
Google ile giriş yapmayı mobil uygulamada **in-app browser** ile çalıştırmak için gerekli ayarlar.

---

## 📋 Gerekli Redirect URI'leri

Google Cloud Console'da OAuth 2.0 Client ID'nizde şu redirect URI'lerin **mutlaka** olması gerekiyor:

### Web OAuth Client

```
Authorized redirect URIs:
https://alertachart.com/api/auth/callback/google
https://alertachart.com/auth/callback
https://alertachart.com/auth/mobile-callback
```

---

## 🔧 Adım Adım Kurulum

### 1. Google Cloud Console'a Git
https://console.cloud.google.com

### 2. Projeyi Seç
- Sol üst köşeden projenizi seçin
- Proje: **alertachart** (veya kullandığınız proje adı)

### 3. APIs & Services → Credentials
Sol menüden:
```
APIs & Services → Credentials
```

### 4. OAuth 2.0 Client ID'yi Bul
- "OAuth 2.0 Client IDs" bölümünde web client'ınızı bulun
- İsmi genellikle: "Web client" veya benzeri

### 5. Edit (Düzenle) Butonuna Tıkla

### 6. Authorized redirect URIs Bölümüne Ekle

**Mevcut URI'ler:**
```
https://alertachart.com/api/auth/callback/google
```

**Eklenecek URI'ler:**
```
https://alertachart.com/auth/callback
https://alertachart.com/auth/mobile-callback
```

**Son hali:**
```
✅ https://alertachart.com/api/auth/callback/google
✅ https://alertachart.com/auth/callback
✅ https://alertachart.com/auth/mobile-callback
```

### 7. Save (Kaydet)

---

## 📱 Mobil Platform Client ID'leri (Opsiyonel)

Google, web OAuth flow'u mobil için de kullanabilir. Ancak native Google Sign-In SDK kullanmak isterseniz:

### iOS OAuth Client

**Gerekli Bilgiler:**
- Application Type: **iOS**
- Name: **Alerta iOS**
- Bundle ID: `com.kriptokirmizi.alerta`

**Redirect URIs:**
```
com.kriptokirmizi.alerta://
com.kriptokirmizi.alerta://auth/callback
```

**URL Scheme:**
```
com.kriptokirmizi.alerta
```

---

### Android OAuth Client

**Gerekli Bilgiler:**
- Application Type: **Android**
- Name: **Alerta Android**
- Package name: `com.kriptokirmizi.alerta`
- SHA-1 certificate fingerprint: [Aşağıda nasıl alınır]

**Redirect URIs:**
```
com.kriptokirmizi.alerta://
com.kriptokirmizi.alerta://auth/callback
```

---

## 🔐 SHA-1 Fingerprint Alma (Android)

### Debug Keystore (Development)
```bash
cd /Users/ata/Desktop/alertachart/mobile/android
./gradlew signingReport
```

**Çıktıdan SHA-1'i kopyala:**
```
Variant: debug
Config: debug
Store: /Users/ata/.android/debug.keystore
Alias: androiddebugkey
MD5: ...
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
SHA-256: ...
```

### Release Keystore (Production)
```bash
keytool -list -v -keystore /Users/ata/Desktop/alertachart/mobile/@kriptokirmizi__alerta.jks -alias upload
```

**Şifre**: [Keystore şifrenizi girin]

---

## 🧪 Test Etme

### 1. Environment Variables Kontrolü
`.env` veya `process.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Kontrol:**
```bash
# Backend'de
echo $GOOGLE_CLIENT_ID
```

### 2. NextAuth Config Kontrolü
`/app/api/auth/[...nextauth]/route.ts`:

```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
```

### 3. Mobil Uygulama Testi
```bash
cd mobile
npx expo run:ios
# veya
npx expo run:android
```

**Test akışı:**
1. Uygulamayı aç
2. "Google ile Devam Et" tıkla
3. In-app browser açılmalı (harici değil!)
4. Google hesabı seç
5. Otomatik olarak uygulamaya dön

---

## ❌ Yaygın Hatalar ve Çözümler

### Hata 1: "redirect_uri_mismatch"
```
Error: redirect_uri_mismatch

The redirect URI in the request:
https://alertachart.com/auth/mobile-callback

did not match a registered redirect URI
```

**Çözüm:**
- Google Cloud Console → Credentials
- OAuth Client ID'yi düzenle
- `https://alertachart.com/auth/mobile-callback` ekle
- Kaydet ve 5 dakika bekle (cache)

---

### Hata 2: "Access blocked: This app's request is invalid"
```
Access blocked: This app's request is invalid
```

**Sebep**: OAuth consent screen yapılandırması eksik

**Çözüm:**
1. APIs & Services → OAuth consent screen
2. User Type: **External** (veya Internal)
3. App name: **Alerta Chart**
4. User support email: **[email]**
5. Developer contact: **[email]**
6. Scopes: `userinfo.email`, `userinfo.profile`
7. Save and Continue

---

### Hata 3: "idpiframe_initialization_failed"
```
Error: idpiframe_initialization_failed
```

**Sebep**: Cookie/Session sorunu

**Çözüm:**
1. Tarayıcı cache'i temizle
2. Mobilde: Uygulamayı kaldır ve yeniden yükle
3. Development build kullandığından emin ol

---

## 🔄 Vercel Deploy Sonrası

Eğer domain değişirse (örn. `alertachart.com` → `app.alertachart.com`):

**Yeni redirect URI ekle:**
```
https://app.alertachart.com/api/auth/callback/google
https://app.alertachart.com/auth/callback
https://app.alertachart.com/auth/mobile-callback
```

**Environment variables güncelle:**
```bash
NEXTAUTH_URL=https://app.alertachart.com
```

---

## 📊 Son Kontrol Listesi

- [ ] Google Cloud Console'da proje seçildi
- [ ] OAuth 2.0 Client ID bulundu
- [ ] `https://alertachart.com/auth/mobile-callback` eklendi
- [ ] Değişiklikler kaydedildi
- [ ] 5 dakika beklendi (cache için)
- [ ] Mobil uygulama test edildi
- [ ] In-app browser açılıyor (harici değil)
- [ ] OAuth başarılı, uygulama açılıyor

---

## 🎉 Tamamlandı!

Google OAuth artık mobil uygulamanızda tamamen uygulama içinde çalışıyor!

**Test etmeyi unutmayın:**
```bash
cd mobile
npx expo run:ios
```

"Google ile Devam Et" tıkla → In-app browser açılmalı → Giriş yap → Uygulama açılmalı ✅

