# 📱 Alerta Chart - Proje Yapısı Detaylı Analiz

## 🎯 Genel Bakış

**Alerta Chart**, kripto para fiyat takibi ve alarm sistemi sunan bir web ve mobil uygulama projesidir. Proje **hibrit mimari** kullanarak hem web hem de native mobil uygulama desteği sunar.

---

## 🏗️ Proje Mimarisi

### 1. **Web Uygulaması (Next.js)**
**Konum:** Root klasör (`/`)

**Teknoloji Stack:**
- **Framework:** Next.js 15.0.0 (React 19.0.0)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Neon Serverless)
- **Authentication:** NextAuth.js
- **Real-time:** WebSocket
- **Charts:** Lightweight Charts

**Ana Bileşenler:**
- `app/page.tsx` - Ana sayfa (chart, watchlist, alarms)
- `app/api/` - API routes (auth, alarms, devices, push, subscription)
- `components/` - React component'leri
- `services/` - Business logic (alertService, websocketService, etc.)
- `utils/` - Utility fonksiyonları

**Build & Deploy:**
```bash
npm run build    # Production build
npm run dev      # Development server
npm start        # Production server
```

**Deployment:** Vercel (alertachart.com)

---

### 2. **Mobil Uygulama - Expo (AKTİF) ✅**
**Konum:** `mobile/` klasörü

**Teknoloji Stack:**
- **Framework:** Expo SDK 54
- **Runtime:** React Native 0.81.5
- **WebView:** react-native-webview 13.15.0
- **Notifications:** Expo Notifications
- **Build:** EAS Build

**Mimari:**
```
┌─────────────────────────────────────┐
│   React Native App (Expo)          │
│   ┌─────────────────────────────┐  │
│   │  React Native WebView        │  │
│   │  ┌─────────────────────────┐ │  │
│   │  │  Next.js Web App         │  │  │
│   │  │  (https://alertachart.com)│ │  │
│   │  └─────────────────────────┘ │  │
│   └─────────────────────────────┘  │
│                                     │
│   Native Features:                  │
│   - Push Notifications              │
│   - Device ID Management           │
│   - Deep Linking                   │
│   - OAuth (Google/Apple)           │
└─────────────────────────────────────┘
```

**Ana Dosyalar:**
- `mobile/App.tsx` - Ana uygulama entry point
- `mobile/src/components/AppWebView.tsx` - WebView wrapper component
- `mobile/src/services/notifications.ts` - Expo Notifications service
- `mobile/src/services/api.ts` - Backend API client
- `mobile/src/utils/bridge.ts` - Web-Native bridge utilities

**Build Komutları:**
```bash
cd mobile
npm start              # Expo dev server
npm run android        # Android build (development)
npm run ios            # iOS build (development)
eas build --platform android  # Production Android build
eas build --platform ios      # Production iOS build
```

**Deployment:**
- **Android:** Google Play Store
- **iOS:** App Store (TestFlight)

**Özellikler:**
- ✅ WebView içinde Next.js web uygulaması
- ✅ Push notifications (Expo Notifications)
- ✅ Device ID yönetimi
- ✅ Deep linking (OAuth callbacks)
- ✅ In-app browser (OAuth için)
- ✅ Native bridge (Web ↔ Native communication)

---

### 3. **Mobil Uygulama - Capacitor (ESKİ/ALTERNATİF) ⚠️**
**Konum:** Root klasör (`/`)

**Teknoloji Stack:**
- **Framework:** Capacitor 7.4.4
- **Platform:** iOS & Android
- **Notifications:** Capacitor Push Notifications
- **Build:** Capacitor CLI

**Mimari:**
```
┌─────────────────────────────────────┐
│   Capacitor Native App              │
│   ┌─────────────────────────────┐  │
│   │  Capacitor WebView           │  │
│   │  ┌─────────────────────────┐ │  │
│   │  │  Next.js Web App         │  │  │
│   │  │  (Built & Bundled)       │  │  │
│   │  └─────────────────────────┘ │  │
│   └─────────────────────────────┘  │
│                                     │
│   Native Plugins:                   │
│   - Google Auth                     │
│   - Apple Sign In                   │
│   - Push Notifications              │
│   - Local Notifications             │
└─────────────────────────────────────┘
```

**Ana Dosyalar:**
- `capacitor.config.ts` - Capacitor yapılandırması
- `android/` - Android native projesi
- `ios/App/` - iOS native projesi
- `public/capacitor-index.html` - Capacitor entry point
- `services/pushNotificationService.ts` - Capacitor push service

**Build Komutları:**
```bash
npm run build          # Next.js build
npx cap sync          # Capacitor sync (copy web files to native)
npx cap open ios      # Xcode'da aç
npx cap open android  # Android Studio'da aç
```

**Durum:** ⚠️ Yapılandırılmış ama aktif olarak kullanılmıyor

**Not:** Capacitor yapısı mevcut ama production'da Expo kullanılıyor. Capacitor muhtemelen eski bir deneme veya alternatif yapı.

---

## 🔄 WebView → Native App Dönüşümü

### ✅ Expo ile Native App (AKTİF)

**Soru:** "WebView uygulamayı Capacitor ile native app haline getirebildik mi?"

**Cevap:** Evet, ama **Capacitor ile değil, Expo ile!**

**Nasıl Çalışıyor:**

1. **Web Uygulaması (Next.js):**
   - Vercel'de deploy edilmiş: `https://alertachart.com`
   - Tam fonksiyonel web uygulaması
   - Responsive design (mobile-friendly)

2. **Mobil App (Expo):**
   - React Native WebView içinde web uygulamasını yüklüyor
   - `mobile/src/components/AppWebView.tsx` → WebView component
   - URL: `https://alertachart.com` (production)
   - Native özellikler ekleniyor:
     - Push notifications
     - Device ID
     - Deep linking
     - OAuth (in-app browser)

3. **Native Bridge:**
   - Web ↔ Native communication
   - `window.ReactNativeWebView.postMessage()` - Web'den Native'e
   - `onMessage` handler - Native'den Web'e
   - `injectedJavaScript` - Web'e script inject

**Avantajlar:**
- ✅ Web uygulaması tek bir kodbase
- ✅ Native özellikler eklenebilir
- ✅ Hızlı development (web değişiklikleri anında yansır)
- ✅ EAS Build ile kolay deployment

**Dezavantajlar:**
- ⚠️ WebView performansı native'den düşük olabilir
- ⚠️ İnternet bağlantısı gerekiyor (remote URL)
- ⚠️ Native UI component'leri kullanılamaz

---

### ⚠️ Capacitor ile Native App (ESKİ/ALTERNATİF)

**Durum:** Yapılandırılmış ama aktif değil

**Nasıl Çalışır (Teorik):**

1. **Next.js Build:**
   ```bash
   npm run build
   ```
   - `out/` veya `.next/` klasöründe static files

2. **Capacitor Sync:**
   ```bash
   npx cap sync
   ```
   - Web dosyalarını `android/app/src/main/assets/` ve `ios/App/public/` klasörlerine kopyalar
   - Native projeleri günceller

3. **Native Build:**
   - Android: Android Studio ile build
   - iOS: Xcode ile build

**Farklar (Expo vs Capacitor):**

| Özellik | Expo (Aktif) | Capacitor (Eski) |
|---------|--------------|------------------|
| **WebView URL** | Remote (`https://alertachart.com`) | Local (bundled files) |
| **Build** | EAS Build (cloud) | Local (Android Studio/Xcode) |
| **Deployment** | EAS Submit | Manuel (Play Store/App Store) |
| **Development** | Expo Go / Dev Client | Native IDE |
| **Hot Reload** | ✅ Var | ❌ Yok |
| **Native Plugins** | Expo plugins | Capacitor plugins |

---

## 📂 Proje Klasör Yapısı

```
alertachart/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   ├── capacitor-auth/    # Capacitor auth callback
│   └── page.tsx           # Ana sayfa
│
├── components/            # React components
│   ├── chart/             # Chart components
│   ├── AlertModal.tsx
│   ├── AuthModal.tsx
│   └── ...
│
├── services/              # Business logic
│   ├── alertService.ts
│   ├── websocketService.ts
│   └── ...
│
├── mobile/                # Expo mobil app (AKTİF) ✅
│   ├── App.tsx            # Ana uygulama
│   ├── src/
│   │   ├── components/
│   │   │   └── AppWebView.tsx
│   │   ├── services/
│   │   └── utils/
│   ├── app.json           # Expo config
│   └── package.json
│
├── android/               # Capacitor Android (ESKİ) ⚠️
│   └── app/
│       └── src/main/java/
│           └── MainActivity.java
│
├── ios/                   # Capacitor iOS (ESKİ) ⚠️
│   └── App/
│       └── AppDelegate.swift
│
├── public/                # Static files
│   ├── index.html         # Capacitor entry point
│   └── capacitor-index.html
│
├── capacitor.config.ts    # Capacitor config
├── package.json           # Web app dependencies
└── next.config.js         # Next.js config
```

---

## 🔌 Native Bridge Communication

### Web → Native (Expo)

**Web Tarafı:**
```javascript
// Web'den Native'e mesaj gönder
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: 'ALERT_TRIGGERED',
    alert: { ... },
    notification: { ... }
  })
);
```

**Native Tarafı:**
```typescript
// mobile/src/components/AppWebView.tsx
<WebView
  onMessage={(event) => {
    const message = parseWebMessage(event);
    switch (message.type) {
      case 'ALERT_TRIGGERED':
        handleAlertTriggered(message);
        break;
    }
  }}
/>
```

### Native → Web (Expo)

**Native Tarafı:**
```typescript
// mobile/src/utils/bridge.ts
sendMessageToWeb(webViewRef.current, {
  type: 'PUSH_TOKEN',
  token: pushToken,
});
```

**Web Tarafı:**
```javascript
// Web'de dinle
window.addEventListener('nativeMessage', (event) => {
  const message = event.detail;
  if (message.type === 'PUSH_TOKEN') {
    // Handle push token
  }
});
```

---

## 🚀 Build & Deployment Süreçleri

### Web App (Next.js)

1. **Development:**
   ```bash
   npm run dev
   ```
   - Local: `http://localhost:3000`

2. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

3. **Deploy:**
   - Vercel'e push → Otomatik deploy
   - URL: `https://alertachart.com`

### Mobil App (Expo)

1. **Development:**
   ```bash
   cd mobile
   npm start
   ```
   - Expo Go app ile test
   - Development build ile test

2. **Production Build:**
   ```bash
   cd mobile
   eas build --platform android
   eas build --platform ios
   ```

3. **Deploy:**
   ```bash
   eas submit --platform android  # Google Play
   eas submit --platform ios      # App Store
   ```

### Mobil App (Capacitor) - ESKİ

1. **Build:**
   ```bash
   npm run build
   npx cap sync
   ```

2. **Android:**
   ```bash
   npx cap open android
   # Android Studio'da build & sign
   ```

3. **iOS:**
   ```bash
   npx cap open ios
   # Xcode'da build & archive
   ```

---

## 🔐 Authentication Flow

### Web App
- **NextAuth.js** ile OAuth (Google, Apple)
- Session cookie-based
- Database'de user kaydı

### Mobil App (Expo)
- **In-app browser** ile OAuth (ASWebAuthenticationSession / Chrome Custom Tabs)
- Cookie sharing (Safari/Chrome cookies)
- Session WebView'a aktarılır
- NextAuth session oluşturulur

### Mobil App (Capacitor) - ESKİ
- **Native plugins** ile OAuth
- `@capacitor-community/apple-sign-in`
- `@codetrix-studio/capacitor-google-auth`
- Token'lar backend'e gönderilir
- Session cookie set edilir

---

## 📱 Push Notifications

### Expo (AKTİF)
- **Expo Notifications** (`expo-notifications`)
- **FCM** (Firebase Cloud Messaging) backend
- **Expo Push Token** → Backend'e kaydedilir
- Backend → Expo Push API → Device

### Capacitor (ESKİ)
- **Capacitor Push Notifications** plugin
- **FCM** (Firebase Cloud Messaging)
- **FCM Token** → Backend'e kaydedilir
- Backend → FCM → Device

---

## 🎯 Özet

### ✅ Aktif Sistem: Expo + React Native WebView

**Durum:** Production'da kullanılıyor

**Özellikler:**
- WebView içinde Next.js web uygulaması
- Remote URL (`https://alertachart.com`)
- Native bridge ile communication
- Push notifications
- OAuth (in-app browser)
- EAS Build & Submit

**Build & Deploy:**
```bash
cd mobile
eas build --platform all
eas submit --platform all
```

### ⚠️ Eski Sistem: Capacitor

**Durum:** Yapılandırılmış ama kullanılmıyor

**Özellikler:**
- Capacitor WebView
- Local bundled files
- Native plugins
- Capacitor CLI build

**Not:** Bu yapı muhtemelen eski bir deneme veya alternatif. Production'da kullanılmıyor.

---

## 🔧 Geliştirme Önerileri

### 1. Capacitor Kodlarını Temizle (İsteğe Bağlı)
Eğer sadece Expo kullanacaksanız:
- `android/` klasörünü kaldırın (Capacitor Android)
- `ios/App/` klasörünü kaldırın (Capacitor iOS)
- `capacitor.config.ts` dosyasını kaldırın
- `public/capacitor-index.html` dosyasını kaldırın
- `services/pushNotificationService.ts` içindeki Capacitor kodlarını temizleyin

### 2. Expo'da Devam Et (ÖNERİLEN) ✅
- Mevcut yapı çalışıyor
- EAS Build kolay deployment
- Hot reload var
- Native bridge çalışıyor

### 3. Capacitor'e Geç (Alternatif)
Eğer Capacitor kullanmak isterseniz:
- `mobile/` klasörünü kaldırın
- Capacitor yapısını aktif edin
- Tüm Expo kodlarını Capacitor'e port edin
- Local build yapın

---

## ✅ Sonuç

**Soru:** "WebView uygulamayı Capacitor ile native app haline getirebildik mi?"

**Cevap:** 
- ✅ **Evet, native app haline getirildi**
- ❌ **Ama Capacitor ile değil, Expo ile!**
- ⚠️ **Capacitor yapısı var ama kullanılmıyor**

**Aktif Sistem:**
- **Expo + React Native WebView** ✅
- WebView içinde Next.js web uygulaması
- Native özellikler bridge ile ekleniyor
- Production'da çalışıyor

**Eski Sistem:**
- **Capacitor** ⚠️
- Yapılandırılmış ama aktif değil
- Alternatif olarak tutulabilir veya temizlenebilir

---

## 📚 İlgili Dokümantasyon

- `MOBILE_ARCHITECTURE.md` - Mobil mimari detayları
- `mobile/README.md` - Expo app dokümantasyonu
- `BUILD_AND_TEST.md` - Build süreçleri
- `FCM_SETUP.md` - Push notifications setup

---

**Son Güncelleme:** 2024
**Versiyon:** 2.0.0

