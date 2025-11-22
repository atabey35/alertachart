# Native IAP Plugin Setup

## ✅ Tamamlanan İşlemler

Custom native IAP plugin'leri oluşturuldu:

### Android
- **File**: `android/app/src/main/java/com/kriptokirmizi/alerta/InAppPurchasePlugin.java`
- Google Play Billing Library 6.1.0 kullanıyor
- `MainActivity.java` içinde register edildi

### iOS
- **File**: `ios/App/App/Plugins/InAppPurchasePlugin/InAppPurchasePlugin.swift`
- StoreKit framework kullanıyor
- Capacitor 7 auto-discovery ile yüklenir

## 📦 Gerekli Adımlar

### 1. Android Build

```bash
cd android
./gradlew clean
./gradlew build
```

### 2. iOS Build

```bash
cd ios/App
pod install
```

### 3. Capacitor Sync

```bash
npx cap sync
```

## 🔧 Google Play Console Setup

1. [Google Play Console](https://play.google.com/console) → Uygulamanızı seçin
2. **Monetize** → **Products** → **Subscriptions**
3. Yeni subscription oluşturun:
   - **Product ID**: `premium_monthly`
   - **Name**: Premium Monthly
   - **Price**: Belirlediğiniz fiyat
   - **Status**: Active

## 🍎 App Store Connect Setup

1. [App Store Connect](https://appstoreconnect.apple.com) → Uygulamanızı seçin
2. **Features** → **In-App Purchases** → **+** butonuna tıklayın
3. Yeni subscription oluşturun:
   - **Product ID**: `com.kriptokirmizi.alerta.premium.monthly`
   - **Type**: Auto-Renewable Subscription
   - **Price**: Belirlediğiniz fiyat
   - **Status**: Ready to Submit

## 🧪 Test

### Android
1. Google Play Console → **Testing** → **License testing**
2. Test hesabı ekleyin
3. Test cihazında satın alma yapın

### iOS
1. App Store Connect → **Users and Access** → **Sandbox Testers**
2. Test kullanıcısı oluşturun
3. Test cihazında App Store'dan çıkış yapın
4. Sandbox test hesabı ile giriş yapın
5. Satın alma yapın

## ⚠️ Önemli Notlar

1. **Product ID'leri** `components/UpgradeModal.tsx` içinde güncelleyin:
   ```typescript
   const productId = platform === 'ios' 
     ? 'com.kriptokirmizi.alerta.premium.monthly'
     : 'premium_monthly';
   ```

2. **Subscription Type**: Şu anda `SUBS` (subscription) kullanılıyor. One-time purchase için `INAPP` kullanın.

3. **Server Verification**: Production'da mutlaka server-side verification yapın (Apple/Google API'leri ile).

## 🐛 Troubleshooting

### Android: "Billing service not connected"
- Google Play Services'in yüklü olduğundan emin olun
- Test cihazında Google hesabı ile giriş yapın
- Internet bağlantısını kontrol edin

### iOS: "Product not found"
- Product ID'nin tam olarak eşleştiğini kontrol edin
- App Store Connect'te product'ın **Ready to Submit** olduğundan emin olun
- Sandbox test hesabı kullanıyorsanız, doğru hesap ile giriş yaptığınızdan emin olun

### "Plugin not found"
- `npx cap sync` çalıştırın
- Native build'i temizleyin ve yeniden build edin
- Android: `MainActivity.java` içinde plugin register edildiğinden emin olun







