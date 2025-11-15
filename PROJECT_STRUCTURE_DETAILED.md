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

### 2. **Mobil Uygulama - Capacitor (AKTİF) ✅**
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
│   │  │  (Remote: alertachart.com)│ │  │
│   │  └─────────────────────────┘ │  │
│   └─────────────────────────────┘  │
│                                     │
│   Native Plugins:                   │
│   - Google Auth                     │
│   - Apple Sign In                   │
│   - Push Notifications              │
│   - Local Notifications             │
│   - WebViewController (Custom)     │
└─────────────────────────────────────┘
```

**Ana Dosyalar:**
- `capacitor.config.ts` - Capacitor yapılandırması
- `android/app/src/main/java/com/kriptokirmizi/alerta/MainActivity.java` - Android native code
- `ios/App/App/AppDelegate.swift` - iOS native code
- `public/capacitor-index.html` - Capacitor entry point (local login screen)
- `services/pushNotificationService.ts` - Capacitor push service
- `app/capacitor-auth/page.tsx` - Capacitor auth callback

**Build Komutları:**
```bash
npm run build          # Next.js build
npx cap sync          # Capacitor sync (copy web files to native)
npx cap open ios      # Xcode'da aç
npx cap open android  # Android Studio'da aç
```

**Deployment:**
- **Android:** Android Studio ile build → Google Play Store
- **iOS:** Xcode ile build → App Store

**Özellikler:**
- ✅ Capacitor WebView içinde Next.js web uygulaması
- ✅ Remote URL (`https://alertachart.com`) - local login screen'den redirect
- ✅ Push notifications (Capacitor Push Notifications + FCM)
- ✅ Local notifications (Capacitor Local Notifications)
- ✅ OAuth (Google/Apple native plugins)
- ✅ Custom WebViewController plugin (URL control)
- ✅ Native bridge (Capacitor plugins)

**Not:** Expo'dan Capacitor'e geçiş yapıldı. Capacitor şu an aktif sistem.

---

### 3. **Mobil Uygulama - Expo (ESKİ) ⚠️**
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

**Durum:** ⚠️ Eski sistem, artık kullanılmıyor

**Not:** Expo'dan Capacitor'e geçiş yapıldı. `mobile/` klasörü eski Expo yapısını içeriyor.

---

## 🔄 WebView → Native App Dönüşümü

### ✅ Capacitor ile Native App (AKTİF)

**Soru:** "WebView uygulamayı Capacitor ile native app haline getirebildik mi?"

**Cevap:** Evet, **Capacitor ile native app haline getirildi!**

**Nasıl Çalışıyor:**

1. **Web Uygulaması (Next.js):**
   - Vercel'de deploy edilmiş: `https://alertachart.com`
   - Tam fonksiyonel web uygulaması
   - Responsive design (mobile-friendly)

2. **Mobil App (Capacitor):**
   - Capacitor WebView içinde web uygulamasını yüklüyor
   - Entry point: `public/capacitor-index.html` (local login screen)
   - Login sonrası: `https://alertachart.com` (remote app)
   - Native özellikler ekleniyor:
     - Push notifications (Capacitor Push Notifications + FCM)
     - Local notifications (Capacitor Local Notifications)
     - Device ID (Capacitor Device plugin)
     - OAuth (Google/Apple native plugins)
     - Custom WebViewController plugin (URL control)

3. **Native Bridge:**
   - Web ↔ Native communication
   - `window.Capacitor.Plugins.*` - Capacitor plugins
   - `window.Capacitor.getPlatform()` - Platform detection
   - Custom plugins (WebViewController)

**Avantajlar:**
- ✅ Web uygulaması tek bir kodbase
- ✅ Native özellikler eklenebilir (Capacitor plugins)
- ✅ Local login screen (offline support)
- ✅ Remote app (web değişiklikleri anında yansır)
- ✅ Native plugins (Google Auth, Apple Sign In, Push, etc.)

**Dezavantajlar:**
- ⚠️ WebView performansı native'den düşük olabilir
- ⚠️ İnternet bağlantısı gerekiyor (remote app için)
- ⚠️ Native UI component'leri kullanılamaz

**Build Süreci:**

1. **Next.js Build:**
   ```bash
   npm run build
   ```
   - Web dosyaları `.next/` klasöründe

2. **Capacitor Sync:**
   ```bash
   npx cap sync
   ```
   - Web dosyalarını `android/app/src/main/assets/public/` ve `ios/App/public/` klasörlerine kopyalar
   - Native projeleri günceller
   - Plugin'leri sync eder

3. **Native Build:**
   - Android: `npx cap open android` → Android Studio'da build
   - iOS: `npx cap open ios` → Xcode'da build

---

### ⚠️ Expo ile Native App (ESKİ)

**Durum:** Eski sistem, artık kullanılmıyor

**Nasıl Çalışıyordu:**

1. **Mobil App (Expo):**
   - React Native WebView içinde web uygulamasını yüklüyordu
   - `mobile/src/components/AppWebView.tsx` → WebView component
   - URL: `https://alertachart.com` (production)
   - Native özellikler:
     - Push notifications (Expo Notifications)
     - Device ID
     - Deep linking
     - OAuth (in-app browser)

2. **Native Bridge:**
   - Web ↔ Native communication
   - `window.ReactNativeWebView.postMessage()` - Web'den Native'e
   - `onMessage` handler - Native'den Web'e
   - `injectedJavaScript` - Web'e script inject

**Farklar (Capacitor vs Expo):**

| Özellik | Capacitor (Aktif) | Expo (Eski) |
|---------|-------------------|-------------|
| **WebView URL** | Local entry + Remote app | Remote (`https://alertachart.com`) |
| **Build** | Local (Android Studio/Xcode) | EAS Build (cloud) |
| **Deployment** | Manuel (Play Store/App Store) | EAS Submit |
| **Development** | Native IDE | Expo Go / Dev Client |
| **Hot Reload** | ❌ Yok | ✅ Var |
| **Native Plugins** | Capacitor plugins | Expo plugins |
| **OAuth** | Native plugins | In-app browser |
| **Push Notifications** | Capacitor + FCM | Expo Notifications |

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
├── android/               # Capacitor Android (AKTİF) ✅
│   └── app/
│       └── src/main/java/
│           └── MainActivity.java
│
├── ios/                   # Capacitor iOS (AKTİF) ✅
│   └── App/
│       └── AppDelegate.swift
│
├── mobile/                # Expo mobil app (ESKİ) ⚠️
│   ├── App.tsx            # Ana uygulama
│   ├── src/
│   │   ├── components/
│   │   │   └── AppWebView.tsx
│   │   ├── services/
│   │   └── utils/
│   ├── app.json           # Expo config
│   └── package.json
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

### Web → Native (Capacitor)

**Web Tarafı:**
```javascript
// Web'den Native'e mesaj gönder (Capacitor plugins)
const { LocalNotifications } = window.Capacitor.Plugins;

LocalNotifications.schedule({
  notifications: [{
    title: '💰 Fiyat Alarmı',
    body: 'BTC fiyatı 100000 seviyesine ulaştı!',
    id: Date.now(),
    sound: 'default',
  }]
});
```

**Native Tarafı:**
```java
// android/app/src/main/java/com/kriptokirmizi/alerta/MainActivity.java
// Capacitor plugins otomatik olarak handle edilir
// Custom plugin'ler için @CapacitorPlugin annotation kullanılır
```

### Native → Web (Capacitor)

**Native Tarafı:**
```java
// Capacitor plugins otomatik olarak web'e expose edilir
// Custom plugin'ler için PluginCall kullanılır
```

**Web Tarafı:**
```javascript
// Web'de Capacitor plugins kullan
const { Device } = window.Capacitor.Plugins;
const deviceInfo = await Device.getInfo();
console.log('Platform:', deviceInfo.platform);
console.log('Device ID:', deviceInfo.uuid);
```

### Web → Native (Expo - ESKİ)

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
// mobile/src/components/AppWebView.tsx (ESKİ)
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

### Mobil App (Capacitor) - AKTİF

1. **Build:**
   ```bash
   npm run build          # Next.js build
   npx cap sync          # Capacitor sync
   ```

2. **Android:**
   ```bash
   npx cap open android
   # Android Studio'da:
   # - Build → Build Bundle(s) / APK(s) → Build APK(s)
   # - APK: android/app/build/outputs/apk/debug/app-debug.apk
   # - AAB: android/app/build/outputs/bundle/release/app-release.aab
   ```

3. **iOS:**
   ```bash
   npx cap open ios
   # Xcode'da:
   # - Product → Archive
   # - Distribute App → App Store Connect
   ```

4. **Deploy:**
   - **Android:** Google Play Console → Upload AAB
   - **iOS:** App Store Connect → Upload IPA

### Mobil App (Expo) - ESKİ

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

---

## 🔐 Authentication Flow

### Web App
- **NextAuth.js** ile OAuth (Google, Apple)
- Session cookie-based
- Database'de user kaydı

### Mobil App (Capacitor) - AKTİF
- **Native plugins** ile OAuth
- `@capacitor-community/apple-sign-in`
- `@codetrix-studio/capacitor-google-auth`
- Token'lar backend'e gönderilir (`/api/auth/google-native`)
- Session cookie set edilir (`/api/auth/set-capacitor-session`)
- NextAuth session oluşturulur

### Mobil App (Expo) - ESKİ
- **In-app browser** ile OAuth (ASWebAuthenticationSession / Chrome Custom Tabs)
- Cookie sharing (Safari/Chrome cookies)
- Session WebView'a aktarılır
- NextAuth session oluşturulur

---

## 📱 Push Notifications

### Capacitor (AKTİF)
- **Capacitor Push Notifications** plugin
- **FCM** (Firebase Cloud Messaging)
- **FCM Token** → Backend'e kaydedilir (`/api/devices/register-native`)
- Backend → FCM → Device
- **Local Notifications** (Capacitor Local Notifications) - uygulama açıkken

### Expo (ESKİ)
- **Expo Notifications** (`expo-notifications`)
- **FCM** (Firebase Cloud Messaging) backend
- **Expo Push Token** → Backend'e kaydedilir
- Backend → Expo Push API → Device

---

## 🎯 Özet

### ✅ Aktif Sistem: Capacitor

**Durum:** Production'da kullanılıyor (Expo'dan geçiş yapıldı)

**Özellikler:**
- Capacitor WebView içinde Next.js web uygulaması
- Local entry point (`public/capacitor-index.html`)
- Remote app (`https://alertachart.com`)
- Native plugins ile communication
- Push notifications (Capacitor + FCM)
- Local notifications (Capacitor Local Notifications)
- OAuth (Google/Apple native plugins)
- Custom WebViewController plugin

**Build & Deploy:**
```bash
npm run build          # Next.js build
npx cap sync          # Capacitor sync
npx cap open android  # Android Studio'da build
npx cap open ios      # Xcode'da build
```

**Deployment:**
- Android: Android Studio → Build APK/AAB → Google Play Console
- iOS: Xcode → Archive → App Store Connect

### ⚠️ Eski Sistem: Expo

**Durum:** Eski sistem, artık kullanılmıyor

**Özellikler:**
- React Native WebView
- Remote URL (`https://alertachart.com`)
- Expo Notifications
- EAS Build & Submit

**Not:** Expo'dan Capacitor'e geçiş yapıldı. `mobile/` klasörü eski Expo yapısını içeriyor.

---

## 🔧 Geliştirme Önerileri

### 1. Expo Kodlarını Temizle (İsteğe Bağlı)
Eğer sadece Capacitor kullanacaksanız:
- `mobile/` klasörünü kaldırın (Expo yapısı)
- Expo ile ilgili dokümantasyonları güncelleyin
- `services/alertService.ts` içindeki Expo bridge kodlarını kontrol edin

### 2. Capacitor'da Devam Et (ÖNERİLEN) ✅
- Mevcut yapı çalışıyor
- Native plugins ile güçlü özellikler
- Local + Remote app hybrid yapı
- Production'da aktif

### 3. Expo'ya Geri Dön (Alternatif)
Eğer Expo kullanmak isterseniz:
- `android/` ve `ios/` klasörlerini kaldırın
- `mobile/` klasörünü aktif edin
- Tüm Capacitor kodlarını Expo'ya port edin
- EAS Build kullanın

---

## ✅ Sonuç

**Soru:** "WebView uygulamayı Capacitor ile native app haline getirebildik mi?"

**Cevap:** 
- ✅ **Evet, Capacitor ile native app haline getirildi!**
- ✅ **Expo'dan Capacitor'e geçiş yapıldı**
- ✅ **Capacitor şu an aktif sistem**

**Aktif Sistem:**
- **Capacitor** ✅
- Capacitor WebView içinde Next.js web uygulaması
- Local entry point + Remote app
- Native plugins ile özellikler ekleniyor
- Production'da çalışıyor

**Eski Sistem:**
- **Expo + React Native WebView** ⚠️
- `mobile/` klasöründe eski yapı
- Artık kullanılmıyor
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

