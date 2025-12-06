# 🧪 Entitlement Sync Test Rehberi

Bu dokümanda iOS ve Android için entitlement sync mekanizmasının nasıl test edileceği anlatılmaktadır.

---

## 📱 iOS Test Rehberi

### **Test Ortamı Hazırlığı**

#### **1. Xcode ve Simulator/Device Hazırlığı**

```bash
# 1. Projeyi sync et
cd /Users/ata/Desktop/alertachart
npx cap sync ios

# 2. Xcode'da aç
npx cap open ios
```

#### **2. Sandbox Test Kullanıcısı Oluştur (App Store Connect)**

1. [App Store Connect](https://appstoreconnect.apple.com) → Uygulamanızı seçin
2. **Users and Access** → **Sandbox Testers** → **+** butonuna tıklayın
3. Test kullanıcısı bilgileri:
   - **Email**: `test-alertachart@example.com` (fake email, onay gerektirmez)
   - **Password**: `Test1234!`
   - **Country/Region**: Turkey
   - **First Name**: Test
   - **Last Name**: User

#### **3. Xcode'da Test**

**Xcode'da:**
1. **Device seç**: iPhone 15 Pro (Simulator) veya **Real Device**
2. **Run** (⌘R) - Uygulamayı başlat
3. **Console'u aç**: View → Debug Area → Activate Console (⌘⇧Y)

---

### **Test Senaryoları**

#### **Test 1: Uygulama Açılışında Sync**

**Adımlar:**
1. Uygulamayı tamamen kapat (swipe away)
2. Uygulamayı yeniden aç
3. Console'da şu log'ları ara:

```
[Entitlement Sync] 🔧 Setting up automatic entitlement sync...
[Entitlement Sync] 🔄 Starting entitlement sync...
[Entitlement Sync] 📱 Checking entitlements from native plugin...
[InAppPurchase] checkEntitlements: Checking current receipt...
```

**Beklenen Sonuç:**
- ✅ 2 saniye sonra sync başlamalı
- ✅ Receipt bulunmalı (eğer aktif subscription varsa)
- ✅ Backend'e validation request gönderilmeli

**Console'da göreceğiniz log'lar:**
```
[Entitlement Sync] 🔄 Starting entitlement sync...
[Entitlement Sync] 📱 Checking entitlements from native plugin...
[InAppPurchase] checkEntitlements: ✅ Receipt found (length: XXXX)
[Entitlement Sync] 🔄 Validating receipt with backend...
[Entitlement Sync] ✅ Receipt validation result: { isPremium: true, plan: 'premium' }
[Entitlement Sync] ✅ Premium activated via sync!
```

---

#### **Test 2: Foreground Sync (App Açıldığında)**

**Adımlar:**
1. Uygulamayı aç
2. Home button'a bas (app background'a gider)
3. 5-10 saniye bekle
4. Uygulamayı tekrar aç (foreground'a getir)
5. Console'da şu log'u ara:

```
[Entitlement Sync] 📱 App came to foreground, syncing entitlements...
```

**Beklenen Sonuç:**
- ✅ App foreground'a geldiğinde otomatik sync başlamalı
- ✅ Receipt kontrol edilmeli
- ✅ Premium status güncellenmeli

---

#### **Test 3: Periyodik Sync (5 Dakika)**

**Adımlar:**
1. Uygulamayı aç
2. Console'u açık tut
3. 5 dakika bekle (veya test için interval'i kısalt - kod değişikliği gerekir)
4. Console'da şu log'u ara:

```
[Entitlement Sync] 🔄 Periodic sync (every 5 minutes)...
```

**Beklenen Sonuç:**
- ✅ Her 5 dakikada bir otomatik sync çalışmalı
- ✅ Yeni auto-renewal transaction'ları algılanmalı

**Test için interval'i kısaltmak (sadece test için):**

`services/entitlementSyncService.ts` dosyasında:
```typescript
// Test için 30 saniye (normalde 5 dakika)
periodicSyncInterval = setInterval(() => {
  console.log('[Entitlement Sync] 🔄 Periodic sync (every 30 seconds)...');
  syncEntitlements().catch(err => {
    console.error('[Entitlement Sync] ❌ Periodic sync failed:', err);
  });
}, 30 * 1000); // 30 saniye
```

---

#### **Test 4: Auto-Renewal Simulation**

**Bu test için gerçek bir subscription gerekir (TestFlight veya App Store'dan yüklenmiş app)**

**Adımlar:**
1. Uygulamayı aç
2. Premium subscription satın al (Sandbox test kullanıcısı ile)
3. Subscription'ın aktif olduğunu doğrula
4. App Store Connect'te subscription'ı iptal etme (sadece test için)
5. 5 dakika bekle (veya periyodik sync interval'ini kısalt)
6. Console'da sync log'larını kontrol et

**Beklenen Sonuç:**
- ✅ Auto-renewal tamamlandığında periyodik sync algılamalı
- ✅ Premium status güncellenmeli
- ✅ UI'da premium badge görünmeli

---

### **Debug Yöntemleri**

#### **1. Console Log'larını Filtreleme**

**Xcode Console'da:**
- `[Entitlement Sync]` - Entitlement sync log'ları
- `[InAppPurchase]` - iOS plugin log'ları
- `[Verify Purchase]` - Backend validation log'ları (server-side)

**Filtreleme:**
1. Console'da sağ üstteki search box'a `Entitlement Sync` yaz
2. Sadece entitlement sync log'ları görünecek

#### **2. Network Request'leri İzleme**

**Safari Web Inspector (iOS Simulator için):**
1. Safari → Develop → Simulator → [Your App]
2. Network tab'ı aç
3. `/api/subscription/verify-purchase` request'lerini izle

**Beklenen Request:**
```
POST /api/subscription/verify-purchase
Body: {
  platform: "ios",
  productId: "com.kriptokirmizi.alerta.premium.monthly",
  transactionId: "sync_1234567890",
  receipt: "base64_encoded_receipt...",
  deviceId: "..."
}
```

#### **3. Receipt Kontrolü**

**iOS Plugin'den receipt almak:**
1. Xcode Console'da JavaScript console'u aç (Web Inspector)
2. Şu kodu çalıştır:

```javascript
const plugin = window.Capacitor.Plugins.InAppPurchase;
plugin.checkEntitlements().then(result => {
  console.log('Receipt check result:', result);
});
```

**Beklenen Response:**
```json
{
  "hasReceipt": true,
  "receipt": "base64_encoded_receipt...",
  "pendingTransactions": []
}
```

---

### **Hata Ayıklama (Troubleshooting)**

#### **Problem 1: Sync Başlamıyor**

**Kontrol Listesi:**
- ✅ `setupAutomaticEntitlementSync()` çağrılıyor mu? (`app/page.tsx`)
- ✅ Platform iOS mu? (Console'da `[App] Capacitor detected: true`)
- ✅ IAP plugin yüklü mü? (`[IAP Service] Plugin available: true`)

**Çözüm:**
```javascript
// app/page.tsx'de kontrol et
console.log('[App] Platform:', Capacitor.getPlatform());
console.log('[App] IAP Plugin:', Capacitor.Plugins.InAppPurchase);
```

#### **Problem 2: Receipt Bulunamıyor**

**Kontrol Listesi:**
- ✅ App Store'dan mı yüklendi? (Xcode debug build'de receipt olmayabilir)
- ✅ TestFlight'tan mı yüklendi? (Sandbox receipt gerekir)
- ✅ Sandbox test kullanıcısı ile giriş yapıldı mı?

**Çözüm:**
- TestFlight veya App Store'dan yükle
- Sandbox test kullanıcısı ile giriş yap
- Console'da `[InAppPurchase] checkEntitlements: ⚠️ Receipt not found` görüyorsan, app Store'dan yüklenmemiş olabilir

#### **Problem 3: Backend Validation Başarısız**

**Kontrol Listesi:**
- ✅ `APPLE_SHARED_SECRET` environment variable set edilmiş mi?
- ✅ Backend log'larını kontrol et (Vercel/Railway)
- ✅ Network request başarılı mı? (200 OK)

**Çözüm:**
```bash
# Backend log'larını kontrol et
# Vercel Dashboard → Functions → /api/subscription/verify-purchase → Logs
```

#### **Problem 4: Premium Status Güncellenmiyor**

**Kontrol Listesi:**
- ✅ Backend validation başarılı mı? (`isPremium: true`)
- ✅ Cache temizlendi mi? (`localStorage.removeItem('user_plan_cache')`)
- ✅ Event listener çalışıyor mu? (`premiumStatusUpdated` event)

**Çözüm:**
```javascript
// Console'da manuel test
window.dispatchEvent(new CustomEvent('premiumStatusUpdated', {
  detail: { plan: 'premium', isPremium: true }
}));
```

---

## 🤖 Android Test Rehberi

### **Test Ortamı Hazırlığı**

#### **1. Android Studio ve Device/Emulator Hazırlığı**

```bash
# 1. Projeyi sync et
cd /Users/ata/Desktop/alertachart
npx cap sync android

# 2. Android Studio'da aç
npx cap open android
```

#### **2. Google Play Console Test Kullanıcısı**

1. [Google Play Console](https://play.google.com/console) → Uygulamanızı seçin
2. **Setup** → **License testing** → Test kullanıcıları ekleyin
3. **Monetize** → **Products** → Subscription'ların aktif olduğundan emin olun

#### **3. Android Studio'da Test**

**Android Studio'da:**
1. **Device seç**: Emulator veya **Real Device** (Play Store'dan yüklenmiş)
2. **Run** (▶️) - Uygulamayı başlat
3. **Logcat'i aç**: View → Tool Windows → Logcat

---

### **Test Senaryoları (Android)**

#### **Test 1: Uygulama Açılışında Sync**

**Adımlar:**
1. Uygulamayı tamamen kapat
2. Uygulamayı yeniden aç
3. Logcat'te şu log'ları ara:

```
[Entitlement Sync] 🔧 Setting up automatic entitlement sync...
[Entitlement Sync] 🔄 Starting entitlement sync...
[CHECK_ENTITLEMENTS] checkEntitlements called
```

**Beklenen Sonuç:**
- ✅ 2 saniye sonra sync başlamalı
- ✅ `purchaseToken` bulunmalı (eğer aktif subscription varsa)
- ✅ Backend'e validation request gönderilmeli

**Logcat'te göreceğiniz log'lar:**
```
[Entitlement Sync] 🔄 Starting entitlement sync...
[CHECK_ENTITLEMENTS] ✅ Query successful
[CHECK_ENTITLEMENTS] Found 1 active subscription(s)
[Entitlement Sync] ✅ Receipt found (length: XXX)
[Entitlement Sync] 🔄 Validating receipt with backend...
[Entitlement Sync] ✅ Premium activated via sync!
```

---

#### **Test 2: Foreground Sync**

**Adımlar:**
1. Uygulamayı aç
2. Home button'a bas (app background'a gider)
3. 5-10 saniye bekle
4. Uygulamayı tekrar aç
5. Logcat'te şu log'u ara:

```
[Entitlement Sync] 📱 App came to foreground, syncing entitlements...
```

---

#### **Test 3: Periyodik Sync**

**Adımlar:**
1. Uygulamayı aç
2. Logcat'i açık tut
3. 5 dakika bekle
4. Logcat'te şu log'u ara:

```
[Entitlement Sync] 🔄 Periodic sync (every 5 minutes)...
```

---

### **Android Debug Yöntemleri**

#### **1. Logcat Filtreleme**

**Logcat'te:**
- Tag: `InAppPurchase` - Android plugin log'ları
- Tag: `Entitlement Sync` - Entitlement sync log'ları (JavaScript console'dan)

**Filtreleme:**
1. Logcat'te sağ üstteki search box'a `InAppPurchase` yaz
2. Sadece IAP log'ları görünecek

#### **2. Chrome DevTools (Android WebView)**

**Android'de WebView debug:**
1. Chrome'da `chrome://inspect` aç
2. "Inspect" butonuna tıkla
3. Console'da JavaScript log'larını gör

**Beklenen Log'lar:**
```javascript
[Entitlement Sync] 🔄 Starting entitlement sync...
[Entitlement Sync] 📱 Checking entitlements from native plugin...
```

#### **3. Purchase Token Kontrolü**

**Android Plugin'den purchase token almak:**
1. Chrome DevTools Console'da:

```javascript
const plugin = window.Capacitor.Plugins.InAppPurchase;
plugin.checkEntitlements().then(result => {
  console.log('Entitlements result:', result);
});
```

**Beklenen Response:**
```json
{
  "hasReceipt": true,
  "receipt": "purchase_token_here...",
  "purchaseToken": "purchase_token_here...",
  "pendingTransactions": [...]
}
```

---

### **Hata Ayıklama (Android)**

#### **Problem 1: Billing Service Bağlanamıyor**

**Kontrol Listesi:**
- ✅ App Play Store'dan mı yüklendi? (Debug APK'da billing çalışmaz)
- ✅ Google Play Services yüklü mü?
- ✅ Internet bağlantısı var mı?

**Logcat'te göreceğiniz:**
```
[BILLING_SETUP] ❌ Billing setup failed: ...
```

**Çözüm:**
- Play Store'dan yükle (Internal Testing track)
- Google Play Services güncel olduğundan emin ol

#### **Problem 2: Purchase Token Bulunamıyor**

**Kontrol Listesi:**
- ✅ Aktif subscription var mı?
- ✅ `queryPurchasesAsync` başarılı mı?

**Logcat'te göreceğiniz:**
```
[CHECK_ENTITLEMENTS] ℹ️ No active subscriptions found
```

**Çözüm:**
- Önce bir subscription satın al
- `restorePurchases()` ile kontrol et

---

## 🎯 Hızlı Test Checklist

### **iOS:**
- [ ] Uygulama açılışında sync başlıyor mu? (2 saniye sonra)
- [ ] Foreground'da sync çalışıyor mu?
- [ ] Receipt bulunuyor mu? (`hasReceipt: true`)
- [ ] Backend validation başarılı mı?
- [ ] Premium status güncelleniyor mu?

### **Android:**
- [ ] Uygulama açılışında sync başlıyor mu?
- [ ] Foreground'da sync çalışıyor mu?
- [ ] Purchase token bulunuyor mu? (`hasReceipt: true`)
- [ ] Backend validation başarılı mı?
- [ ] Premium status güncelleniyor mu?

---

## 📊 Test Sonuçları

### **Başarılı Test:**
```
✅ Sync başladı
✅ Receipt/purchaseToken bulundu
✅ Backend validation başarılı
✅ Premium status güncellendi
✅ UI'da premium badge görünüyor
```

### **Başarısız Test:**
```
❌ Sync başlamadı → setupAutomaticEntitlementSync() kontrol et
❌ Receipt bulunamadı → App Store/Play Store'dan yükle
❌ Backend validation başarısız → APPLE_SHARED_SECRET kontrol et
❌ Premium status güncellenmedi → Cache temizle, event listener kontrol et
```

---

## 🔧 Test İçin Kod Değişiklikleri (Sadece Test)

### **Periyodik Sync Interval'ini Kısaltmak:**

`services/entitlementSyncService.ts`:
```typescript
// Test için 30 saniye (normalde 5 dakika)
periodicSyncInterval = setInterval(() => {
  console.log('[Entitlement Sync] 🔄 Periodic sync (TEST: every 30 seconds)...');
  syncEntitlements().catch(err => {
    console.error('[Entitlement Sync] ❌ Periodic sync failed:', err);
  });
}, 30 * 1000); // 30 saniye - TEST ONLY
```

### **Manuel Sync Tetikleme:**

Console'da:
```javascript
// iOS/Android
import { syncEntitlements } from '@/services/entitlementSyncService';
syncEntitlements().then(result => {
  console.log('Sync result:', result);
});
```

---

**Son Güncelleme:** 2024
**Versiyon:** 6.2.0

