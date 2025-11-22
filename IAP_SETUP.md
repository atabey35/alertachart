# In-App Purchase (IAP) Setup Guide

## 📋 Genel Bakış

Bu dokümantasyon, Android (Google Play Billing) ve iOS (Apple StoreKit) için In-App Purchase entegrasyonunu açıklar.

## 🏗️ Mimari

### Client-Side (Frontend)
- **File**: `services/iapService.ts`
- **Component**: `components/UpgradeModal.tsx`
- IAP işlemlerini başlatır ve sonuçları server'a gönderir

### Server-Side (Backend)
- **File**: `app/api/subscription/verify-purchase/route.ts`
- Satın alma işlemini doğrular ve kullanıcıyı premium yapar

## 📦 Gerekli Paketler

```bash
npm install @capacitor-community/in-app-purchase
```

**Not**: Bu plugin Capacitor 7 için henüz tam desteklenmeyebilir. Alternatif olarak doğrudan native API'leri kullanabilirsiniz.

## 🔧 Android Setup (Google Play Billing)

### 1. Google Play Console'da Product Oluşturma

1. [Google Play Console](https://play.google.com/console) → Uygulamanızı seçin
2. **Monetize** → **Products** → **In-app products** veya **Subscriptions**
3. Yeni product oluşturun:
   - **Product ID**: `premium_monthly` (veya istediğiniz ID)
   - **Name**: Premium Monthly
   - **Description**: Monthly premium subscription
   - **Price**: Belirlediğiniz fiyat
   - **Status**: Active

### 2. Android Native Code

#### MainActivity.java

```java
import com.getcapacitor.community.inapppurchase.InAppPurchase;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register IAP plugin
        registerPlugin(InAppPurchase.class);
        
        super.onCreate(savedInstanceState);
    }
}
```

#### build.gradle

```gradle
dependencies {
    // IAP Plugin
    implementation project(':capacitor-community-in-app-purchase')
}
```

### 3. Capacitor Sync

```bash
npx cap sync android
```

## 🍎 iOS Setup (Apple StoreKit)

### 1. App Store Connect'te Product Oluşturma

1. [App Store Connect](https://appstoreconnect.apple.com) → Uygulamanızı seçin
2. **Features** → **In-App Purchases** → **+** butonuna tıklayın
3. Yeni subscription/product oluşturun:
   - **Product ID**: `com.kriptokirmizi.alerta.premium.monthly`
   - **Type**: Auto-Renewable Subscription (veya Non-Consumable)
   - **Reference Name**: Premium Monthly
   - **Price**: Belirlediğiniz fiyat
   - **Status**: Ready to Submit

### 2. iOS Native Code

#### AppDelegate.swift

```swift
import Capacitor
import StoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // IAP plugin otomatik olarak yüklenir (Capacitor 7 auto-discovery)
        return true
    }
}
```

### 3. Capacitor Sync

```bash
npx cap sync ios
```

## 🔐 Server-Side Verification

### Apple Receipt Verification

Production için Apple'ın receipt verification API'sini kullanın:

```typescript
// app/api/subscription/verify-purchase/route.ts içinde
async function verifyAppleReceipt(receipt: string, productId: string) {
  const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receipt,
      'password': process.env.APPLE_SHARED_SECRET, // App Store Connect'ten alın
    }),
  });
  
  const result = await response.json();
  if (result.status !== 0) {
    // Sandbox için tekrar dene
    const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': process.env.APPLE_SHARED_SECRET,
      }),
    });
    const sandboxResult = await sandboxResponse.json();
    return sandboxResult.status === 0;
  }
  
  return true;
}
```

### Google Play Billing Verification

Production için Google Play Developer API kullanın:

```typescript
async function verifyGoogleReceipt(receipt: string, productId: string) {
  // Google Service Account Key gerekli
  const accessToken = await getGoogleAccessToken(); // OAuth2 token
  
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${receipt}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    return false;
  }
  
  const result = await response.json();
  return result.purchaseState === 0; // 0 = Purchased
}
```

## 🔑 Environment Variables

`.env.local` dosyasına ekleyin:

```bash
# Apple IAP
APPLE_SHARED_SECRET=your_apple_shared_secret

# Google Play Billing
ANDROID_PACKAGE_NAME=com.kriptokirmizi.alerta
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account-key.json
```

## 📱 Product ID'leri

### Android
- `premium_monthly` - Aylık premium abonelik
- `premium_yearly` - Yıllık premium abonelik (opsiyonel)

### iOS
- `com.kriptokirmizi.alerta.premium.monthly` - Aylık premium abonelik
- `com.kriptokirmizi.alerta.premium.yearly` - Yıllık premium abonelik (opsiyonel)

**Not**: Bu ID'leri `components/UpgradeModal.tsx` içinde güncelleyin:

```typescript
const productId = platform === 'ios' 
  ? 'com.kriptokirmizi.alerta.premium.monthly'
  : 'premium_monthly';
```

## 🧪 Test

### Android (Sandbox)
1. Google Play Console → **Testing** → **License testing**
2. Test hesabı ekleyin
3. Test cihazında satın alma yapın

### iOS (Sandbox)
1. App Store Connect → **Users and Access** → **Sandbox Testers**
2. Test kullanıcısı oluşturun
3. Test cihazında App Store'dan çıkış yapın
4. Sandbox test hesabı ile giriş yapın
5. Satın alma yapın

## 🔄 Purchase Flow

1. **Kullanıcı "Satın Al" butonuna basar**
   - `UpgradeModal.tsx` → `handlePurchase()`
   - `iapService.ts` → `purchaseProduct()`

2. **Native IAP Dialog Açılır**
   - Android: Google Play Billing dialog
   - iOS: Apple StoreKit dialog

3. **Kullanıcı Satın Alır**
   - Native API receipt/token döner

4. **Server Verification**
   - `app/api/subscription/verify-purchase/route.ts`
   - Apple/Google API ile doğrulama
   - Database'de kullanıcı premium yapılır

5. **Trial Başlatılır**
   - 3 günlük trial başlar
   - `users.plan = 'premium'`
   - `users.trial_started_at` set edilir

## ⚠️ Önemli Notlar

1. **Production'da mutlaka server-side verification yapın**
   - Client-side verification güvenli değildir
   - Apple/Google API'lerini kullanın

2. **Receipt Validation**
   - Apple: `verifyReceipt` API kullanın
   - Google: Google Play Developer API kullanın

3. **Subscription Renewal**
   - Apple/Google webhook'ları kullanın
   - `app/api/subscription/webhook/route.ts` endpoint'i hazır

4. **Error Handling**
   - Kullanıcı iptal ederse: `purchaseResult.error` kontrol edin
   - Network hatası: Retry mekanizması ekleyin

## 🐛 Troubleshooting

### Android: "Product not found"
- Google Play Console'da product'ın **Active** olduğundan emin olun
- Product ID'nin doğru olduğunu kontrol edin
- Test hesabı kullanıyorsanız, license testing'de ekli olduğundan emin olun

### iOS: "Product not found"
- App Store Connect'te product'ın **Ready to Submit** olduğundan emin olun
- Product ID'nin tam olarak eşleştiğini kontrol edin
- Sandbox test hesabı kullanıyorsanız, doğru hesap ile giriş yaptığınızdan emin olun

### "IAP plugin not found"
- `npx cap sync` çalıştırın
- Native build'i temizleyin ve yeniden build edin
- Plugin'in `MainActivity.java` (Android) veya `AppDelegate.swift` (iOS) içinde register edildiğinden emin olun

## 📚 Kaynaklar

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [Capacitor IAP Plugin](https://github.com/capacitor-community/in-app-purchase)







