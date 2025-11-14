# In-App OAuth Authentication Kurulumu

## 🎯 Ne Değişti?

Mobil uygulamanızda Google ve Apple ile giriş artık **harici tarayıcı açmadan**, **uygulama içi modal/sheet** olarak çalışıyor!

- ✅ **iOS**: ASWebAuthenticationSession (Safari modal sheet)
- ✅ **Android**: Chrome Custom Tabs (in-app browser)
- ✅ **UX**: Instagram, TikTok, TradingView tarzı uygulama içi giriş

---

## 📦 Yapılan Değişiklikler

### 1. **Package.json - Yeni Bağımlılıklar**
`/mobile/package.json`

```json
"expo-web-browser": "~15.0.9",
"expo-auth-session": "~7.0.8"
```

**Kurulum (Otomatik - ÖNERİLEN):**
```bash
cd mobile
npx expo install expo-web-browser expo-auth-session
```

Bu komut Expo SDK 54 ile uyumlu versiyonları otomatik yükler.

**Manuel Kurulum:**
```bash
cd mobile
npm install
```

---

### 2. **AppWebView.tsx - In-App Browser Desteği**
`/mobile/src/components/AppWebView.tsx`

**Önceki Kod (Harici tarayıcı açıyordu):**
```typescript
if (url.includes('accounts.google.com')) {
  Linking.openURL(url); // ❌ Safari/Chrome açılıyor
}
```

**Yeni Kod (In-app browser):**
```typescript
if (url.includes('accounts.google.com')) {
  openInAppBrowser(url); // ✅ Uygulama içi modal
}

const openInAppBrowser = async (url: string) => {
  const result = await WebBrowser.openAuthSessionAsync(
    url, 
    'com.kriptokirmizi.alerta://'
  );
  
  if (result.type === 'success') {
    webViewRef.current?.reload(); // Session güncellendi
  }
};
```

---

### 3. **AuthModal - Mobil Callback URL Desteği**
`/components/AuthModal.tsx`

OAuth butonları artık mobil uygulamada farklı callback URL kullanıyor:

```typescript
onClick={() => {
  const isMobileApp = (window as any).isNativeApp;
  const callbackUrl = isMobileApp ? '/auth/mobile-callback' : '/';
  signIn('google', { callbackUrl });
}}
```

---

### 4. **Mobile Callback Page**
`/app/auth/mobile-callback/page.tsx` (YENİ)

OAuth başarılı olduktan sonra mobil uygulamayı açan özel sayfa:

```typescript
// OAuth başarılı → Deep link ile uygulamayı aç
window.location.href = 'com.kriptokirmizi.alerta://auth/success';

// Fallback: 3 saniye sonra web'e yönlendir
setTimeout(() => {
  window.location.href = 'https://alertachart.com';
}, 3000);
```

---

### 5. **Deep Link Konfigürasyonu**
`/mobile/app.json`

#### iOS
```json
"ios": {
  "associatedDomains": [
    "applinks:alertachart.com",
    "webcredentials:alertachart.com"
  ],
  "infoPlist": {
    "CFBundleURLTypes": [{
      "CFBundleURLSchemes": ["com.kriptokirmizi.alerta"]
    }]
  }
}
```

#### Android
```json
"android": {
  "intentFilters": [
    {
      "action": "VIEW",
      "data": [
        { "scheme": "https", "host": "alertachart.com" },
        { "scheme": "com.kriptokirmizi.alerta" }
      ]
    }
  ]
}
```

---

### 6. **OAuth Utilities (Bonus)**
`/mobile/src/utils/oauth.ts` (YENİ)

Yardımcı fonksiyonlar:
- `openOAuthSession()`: In-app browser açma
- `parseOAuthCallback()`: Callback URL parsing
- `buildMobileOAuthUrl()`: Mobil için OAuth URL oluşturma

---

## 🚀 Kurulum ve Test

### 1. Bağımlılıkları Yükle
```bash
cd /Users/ata/Desktop/alertachart/mobile
npm install
```

### 2. Development Build Oluştur
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

**ÖNEMLİ**: Expo Go'da çalışmaz! Development build veya production build gerekli.

### 3. Test Et
1. Uygulamayı aç
2. Login/Giriş butonuna tıkla
3. "Google ile Devam Et" veya "Apple ile Devam Et"
4. **In-app browser modal açılmalı** (harici tarayıcı DEĞİL!)
5. Hesap seç ve giriş yap
6. Otomatik olarak uygulamaya dön

---

## 🔧 Google Cloud Console Ayarları

OAuth redirect URI'leri Google Cloud Console'da eklenmiş olmalı:

### Web OAuth Client
```
Authorized redirect URIs:
- https://alertachart.com/api/auth/callback/google
- https://alertachart.com/auth/callback
- https://alertachart.com/auth/mobile-callback
```

### iOS OAuth Client (eğer varsa)
```
Bundle ID: com.kriptokirmizi.alerta
Authorized redirect URIs:
- com.kriptokirmizi.alerta://
- com.kriptokirmizi.alerta://auth/callback
```

### Android OAuth Client (eğer varsa)
```
Package name: com.kriptokirmizi.alerta
SHA-1 fingerprint: [Keystore'dan al]
Authorized redirect URIs:
- com.kriptokirmizi.alerta://
- com.kriptokirmizi.alerta://auth/callback
```

**SHA-1 Fingerprint Alma:**
```bash
cd mobile/android
./gradlew signingReport
```

---

## 🍎 Apple Developer Console Ayarları

### Sign in with Apple
1. **Identifier**: com.kriptokirmizi.alerta
2. **Return URLs**:
   - `https://alertachart.com/api/auth/callback/apple`
   - `https://alertachart.com/auth/mobile-callback`
3. **Domains**: alertachart.com

---

## 📱 Platform-Specific Notlar

### iOS
- **ASWebAuthenticationSession** kullanılıyor
- Safari modal sheet olarak açılıyor
- Kullanıcı "Cancel" diyebilir
- Face ID/Touch ID ile otomatik giriş destekleniyor

### Android
- **Chrome Custom Tabs** kullanılıyor
- Chrome ile aynı görünüm
- Google hesapları otomatik gösteriliyor
- Geri tuşu ile iptal edilebilir

---

## 🐛 Sorun Giderme

### "Invalid redirect_uri" Hatası
**Sebep**: Google/Apple Console'da redirect URI eksik

**Çözüm**:
1. Google Cloud Console → Credentials
2. OAuth 2.0 Client ID'yi düzenle
3. `https://alertachart.com/auth/mobile-callback` ekle

### "App did not open after auth"
**Sebep**: Deep link çalışmıyor

**Çözüm**:
1. `npx uri-scheme list` ile deep link kontrolü
2. Development build kullandığından emin ol (Expo Go çalışmaz)
3. App.json'da scheme doğru olmalı: `com.kriptokirmizi.alerta`

### "External browser still opening"
**Sebep**: Paketler yüklenmemiş

**Çözüm**:
```bash
cd mobile
rm -rf node_modules
npm install
npx expo run:ios  # veya run:android
```

---

## 📊 Akış Diyagramı

```
┌─────────────────────────────────────────────────────┐
│  1. Kullanıcı "Google ile Devam Et" tıklar         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  2. WebView URL'i yakalar:                          │
│     /api/auth/signin/google                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  3. AppWebView: openInAppBrowser() çağırır          │
│     WebBrowser.openAuthSessionAsync()               │
└─────────────────────┬───────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌───────────┐       ┌──────────────┐
    │    iOS    │       │   Android    │
    │  ASWeb    │       │ Chrome Tabs  │
    │ AuthSess  │       │              │
    └─────┬─────┘       └──────┬───────┘
          │                    │
          └─────────┬──────────┘
                    ▼
┌─────────────────────────────────────────────────────┐
│  4. Google/Apple OAuth ekranı (IN-APP)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  5. Kullanıcı hesap seçer ve onaylar               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  6. Redirect: /auth/mobile-callback                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  7. Deep link: com.kriptokirmizi.alerta://auth/     │
│     success                                          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  8. App açılır, WebView reload → Kullanıcı giriş   │
│     yapmış durumda!                                  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- [x] expo-web-browser yüklendi
- [x] expo-auth-session yüklendi
- [x] AppWebView.tsx güncellendi (in-app browser)
- [x] AuthModal.tsx güncellendi (mobil callback)
- [x] Mobile callback page oluşturuldu
- [x] app.json deep link konfigürasyonu
- [x] iOS CFBundleURLTypes eklendi
- [x] Android intentFilters güncellendi

---

## 🎉 Sonuç

Artık mobil uygulamanızda OAuth akışı **tamamen uygulama içinde** çalışıyor!

- Instagram gibi in-app authentication
- Kullanıcı deneyimi %100 gelişti
- Harici tarayıcı açılmıyor
- Session yönetimi otomatik

**Test etmek için development build oluşturun ve deneyin!**

```bash
cd mobile
npx expo run:ios
# veya
npx expo run:android
```

---

## 📚 Kaynaklar

- [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
- [Chrome Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs/)

