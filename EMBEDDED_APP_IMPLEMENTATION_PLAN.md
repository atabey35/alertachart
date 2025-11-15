# 📱 Embedded App Implementation Plan - Android & iOS

## 🎯 Kapsam

**Hedef:** Hem Android hem iOS için embedded app'e geçiş

**Neden Aynı Anda:**
- ✅ Capacitor config tek dosya (`capacitor.config.ts`)
- ✅ Build output aynı (`public/` klasörü)
- ✅ Her iki platform da aynı `webDir` kullanıyor
- ✅ Sync işlemi her iki platform için de yapılır

---

## 📊 Mevcut Durum

### Android
- ✅ Local login screen (`public/index.html`)
- ✅ Login sonrası remote URL (`https://alertachart.com`)
- ✅ WebViewController plugin (remote URL için)
- ✅ Cookie persistence ayarları

### iOS
- ✅ Local login screen (`public/index.html`)
- ✅ Login sonrası remote URL (`https://alertachart.com`)
- ✅ WebViewController plugin (remote URL için)
- ✅ CustomBridgeViewController

---

## 🏗️ Embedded App Yapısı

### Build Output

```
public/
├── index.html          # Next.js build output (ana app)
├── _next/
│   └── static/         # Next.js static assets
├── logos/              # Mevcut static files
├── workers/            # Web Workers
└── capacitor.js        # Capacitor runtime
```

### Her İki Platform İçin

**Android:**
- `webDir: 'public'` → Android assets'e kopyalanır
- `npx cap sync android` → Build output Android'e sync edilir

**iOS:**
- `webDir: 'public'` → iOS bundle'a kopyalanır
- `npx cap sync ios` → Build output iOS'a sync edilir

---

## 🔧 Implementation Plan

### Faz 1: Next.js Build Configuration

**Hedef:** Next.js'i static export yapabilir hale getirmek

**Dosya:** `next.config.js`

**Değişiklikler:**
```javascript
const nextConfig = {
  output: 'export', // Static export
  trailingSlash: true,
  images: {
    unoptimized: true, // Static export için gerekli
  },
};
```

**Etki:** ✅ Hem Android hem iOS için aynı

---

### Faz 2: Build Script

**Hedef:** Build output'u `public/` klasörüne kopyalama

**Dosya:** `package.json`

**Değişiklikler:**
```json
{
  "scripts": {
    "build:capacitor": "next build && npm run copy-capacitor",
    "copy-capacitor": "cp -r .next/static public/_next/static && cp .next/index.html public/index.html",
    "sync:ios": "npm run build:capacitor && npx cap sync ios",
    "sync:android": "npm run build:capacitor && npx cap sync android"
  }
}
```

**Etki:** ✅ Hem Android hem iOS için aynı build process

---

### Faz 3: Capacitor Config

**Hedef:** Capacitor config'i güncelle (değişiklik yok)

**Dosya:** `capacitor.config.ts`

**Değişiklikler:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.kriptokirmizi.alerta',
  appName: 'Alerta Chart',
  webDir: 'public', // ✅ Aynı kalacak (build output buraya kopyalanacak)
  // No server.url // ✅ Aynı kalacak
};
```

**Etki:** ✅ Hem Android hem iOS için aynı

---

### Faz 4: Login Flow Değişikliği

**Hedef:** Remote URL yönlendirmesini kaldır

**Dosya:** `public/index.html`

**Değişiklikler:**
```javascript
// Önce: WebViewController.loadUrl() → https://alertachart.com
// Sonra: localStorage'a kaydet + window.location.href = '/'

localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
window.location.href = '/'; // Local app'e yönlendir
```

**Etki:** ✅ Hem Android hem iOS için aynı

---

### Faz 5: API Routes Migration

**Hedef:** Tüm `/api/*` çağrılarını direkt backend çağrılarına çevir

**Dosyalar:**
- `components/Watchlist.tsx`
- `services/historicalService.ts`
- `services/alertService.ts`
- `app/page.tsx`
- `app/admin/page.tsx`
- ... (tüm API route kullanan dosyalar)

**Değişiklikler:**
```typescript
// Önce: fetch('/api/ticker/spot?symbols=...')
// Sonra: fetch('https://alertachart-backend-production.up.railway.app/api/ticker/spot?symbols=...')
```

**Etki:** ✅ Hem Android hem iOS için aynı

---

### Faz 6: Platform-Specific Cleanup

#### Android

**Dosya:** `android/app/src/main/java/com/kriptokirmizi/alerta/MainActivity.java`

**Değişiklikler:**
```java
// onResume() reset kodu kaldırılabilir (opsiyonel)
// WebViewController plugin kaldırılabilir (opsiyonel)
```

**Etki:** ✅ Android için

---

#### iOS

**Dosya:** `ios/App/App/CustomBridgeViewController.swift`

**Değişiklikler:**
```swift
// WebViewController plugin kaldırılabilir (opsiyonel)
// Remote URL yönlendirme kaldırılabilir (opsiyonel)
```

**Etki:** ✅ iOS için

---

## 📋 Implementation Checklist

### ✅ Faz 1: Next.js Build Configuration
- [ ] `next.config.js`'de `output: 'export'` ekle
- [ ] `images.unoptimized: true` ekle
- [ ] `trailingSlash: true` ekle
- [ ] Test: `npm run build` çalışıyor mu?

### ✅ Faz 2: Build Script
- [ ] `package.json`'a build script ekle
- [ ] Build output'u `public/` klasörüne kopyalama script'i
- [ ] Test: Build output doğru mu?

### ✅ Faz 3: Capacitor Config
- [ ] `capacitor.config.ts` kontrol et (değişiklik yok)
- [ ] Test: Config doğru mu?

### ✅ Faz 4: Login Flow
- [ ] `public/index.html`'de remote URL yönlendirmesini kaldır
- [ ] Local auth state management ekle
- [ ] Test: Login sonrası local app açılıyor mu?

### ✅ Faz 5: API Routes Migration
- [ ] Tüm `/api/*` çağrılarını backend API'lerine yönlendir
- [ ] API client utility oluştur
- [ ] Test: API çağrıları çalışıyor mu?

### ✅ Faz 6: Platform-Specific Cleanup
- [ ] Android: `onResume()` reset kodu kaldır (opsiyonel)
- [ ] Android: `WebViewController` plugin kaldır (opsiyonel)
- [ ] iOS: `WebViewController` plugin kaldır (opsiyonel)
- [ ] Test: Her iki platform çalışıyor mu?

### ✅ Faz 7: Testing
- [ ] Android: App açılıyor mu?
- [ ] Android: Login çalışıyor mu?
- [ ] Android: Features çalışıyor mu?
- [ ] iOS: App açılıyor mu?
- [ ] iOS: Login çalışıyor mu?
- [ ] iOS: Features çalışıyor mu?

---

## 🔄 Build Process

### Development

```bash
# 1. Next.js build
npm run build

# 2. Build output'u public/ klasörüne kopyala
npm run copy-capacitor

# 3. Android sync
npx cap sync android

# 4. iOS sync
npx cap sync ios
```

### Production

```bash
# Tek komutla her şeyi yap
npm run sync:android  # Android için
npm run sync:ios      # iOS için
```

---

## 📊 Platform-Specific Differences

### Android

**Özellikler:**
- ✅ Cookie persistence ayarları
- ✅ WebView settings
- ✅ Notification channels
- ⚠️ onResume reset kodu (kaldırılabilir)
- ⚠️ WebViewController plugin (kaldırılabilir)

**Değişiklikler:**
- Minimal (sadece cleanup)

---

### iOS

**Özellikler:**
- ✅ CustomBridgeViewController
- ✅ WKNavigationDelegate
- ✅ WKUIDelegate
- ✅ Text selection disabled
- ⚠️ WebViewController plugin (kaldırılabilir)

**Değişiklikler:**
- Minimal (sadece cleanup)

---

## 🎯 Avantajlar

### Her İki Platform İçin

1. **Aynı Build Process:**
   - Tek build script
   - Aynı build output
   - Aynı sync process

2. **Aynı Codebase:**
   - Tek source code
   - Platform-specific kod minimal
   - Daha kolay maintenance

3. **Aynı Features:**
   - Tüm özellikler her iki platformda çalışır
   - Aynı localStorage
   - Aynı WebSocket
   - Aynı API calls

---

## ⚠️ Dikkat Edilmesi Gerekenler

### 1. Build Order

**Önemli:** Önce build, sonra sync

```bash
# ✅ Doğru
npm run build:capacitor  # Build + Copy
npx cap sync android     # Android sync
npx cap sync ios         # iOS sync

# ❌ Yanlış
npx cap sync android     # Eski build ile sync
npm run build:capacitor  # Yeni build (sync edilmemiş)
```

---

### 2. Platform-Specific Testing

**Her İki Platform İçin Test:**
- ✅ App açılıyor mu?
- ✅ Login çalışıyor mu?
- ✅ Cookies çalışıyor mu?
- ✅ localStorage çalışıyor mu?
- ✅ WebSocket çalışıyor mu?
- ✅ Push notifications çalışıyor mu?

---

### 3. Build Size

**Her İki Platform İçin:**
- Android: ~20-50 MB (build output + native)
- iOS: ~20-50 MB (build output + native)

**Not:** Build size artacak ama kabul edilebilir seviyede.

---

## 🚀 Hızlı Başlangıç

### Adım 1: Next.js Config

```javascript
// next.config.js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};
```

### Adım 2: Build Script

```json
// package.json
{
  "scripts": {
    "build:capacitor": "next build && npm run copy-capacitor",
    "copy-capacitor": "cp -r .next/static public/_next/static && cp .next/index.html public/index.html",
    "sync:ios": "npm run build:capacitor && npx cap sync ios",
    "sync:android": "npm run build:capacitor && npx cap sync android"
  }
}
```

### Adım 3: Test

```bash
# Build ve sync
npm run sync:android
npm run sync:ios

# Android test
npx cap open android
# Android Studio'da build et ve test et

# iOS test
npx cap open ios
# Xcode'da build et ve test et
```

---

## 📝 Özet

### Kapsam

**Hem Android hem iOS için aynı anda embedded app'e geçiş yapacağız.**

**Neden:**
- ✅ Capacitor config tek dosya
- ✅ Build output aynı
- ✅ Her iki platform da aynı `webDir` kullanıyor
- ✅ Sync işlemi her iki platform için de yapılır

**Yapılacaklar:**
1. ✅ Next.js static export
2. ✅ Build script
3. ✅ Login flow değişikliği
4. ✅ API routes migration
5. ✅ Platform-specific cleanup (opsiyonel)

**Sonuç:**
- ✅ Her iki platform için aynı build process
- ✅ Her iki platform için aynı codebase
- ✅ Her iki platform için aynı features

---

**Son Güncelleme:** 2025-11-15  
**Durum:** Plan Hazır - Implementation Bekliyor  
**Kapsam:** Android & iOS

