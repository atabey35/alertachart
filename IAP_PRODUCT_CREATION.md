# IAP Product ID Oluşturma Rehberi

## 📱 Android - Google Play Console

### 1. Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) → Giriş yapın
2. Uygulamanızı seçin (yoksa yeni uygulama oluşturun)

### 2. Subscription Product Oluşturma

1. Sol menüden **Monetize** → **Products** → **Subscriptions** seçin
2. **+ Create subscription** butonuna tıklayın

### 3. Product Detaylarını Doldurun

#### Basic Information
- **Product ID**: `premium_monthly` (⚠️ ÖNEMLİ: Bu ID'yi kodda kullanacaksınız)
- **Name**: Premium Monthly Subscription
- **Description**: 
  ```
  Aylık premium abonelik. Tüm premium özelliklere erişim sağlar:
  - AGGR Menüsü
  - Otomatik Fiyat Takibi
  - 4-9 Lu Grafik
  - 10s & 30s Timeframe
  ```

#### Pricing
- **Price**: İstediğiniz fiyatı seçin (örn: $9.99/ay)
- **Billing period**: Monthly (Aylık)
- **Free trial**: İsterseniz ücretsiz deneme ekleyebilirsiniz (örn: 3 gün)
- **Grace period**: İptal sonrası erişim süresi (opsiyonel)

#### Subscription Benefits
- **Benefits**: Premium özelliklerin listesini ekleyin

### 4. Save & Activate

1. **Save** butonuna tıklayın
2. Product'ı **Active** duruma getirin
3. ⚠️ **ÖNEMLİ**: Product ID'yi not edin: `premium_monthly`

### 5. Test Hesabı Ayarlama

1. Sol menüden **Setup** → **License testing** seçin
2. **License testers** bölümüne test Google hesabı email'lerini ekleyin
3. Bu hesaplarla test satın almaları yapabilirsiniz

---

## 🍎 iOS - App Store Connect

### 1. App Store Connect'e Giriş

1. [App Store Connect](https://appstoreconnect.apple.com) → Giriş yapın
2. **My Apps** → Uygulamanızı seçin (yoksa yeni uygulama oluşturun)

### 2. In-App Purchase Oluşturma

1. Uygulama sayfasında **Features** sekmesine gidin
2. **In-App Purchases** bölümüne tıklayın
3. **+** butonuna tıklayın

### 3. Product Type Seçin

- **Auto-Renewable Subscription** seçin (Aylık abonelik için)
- **Continue** butonuna tıklayın

### 4. Product Detaylarını Doldurun

#### Reference Name
- **Reference Name**: Premium Monthly Subscription
- (Bu sadece App Store Connect içinde görünür, kullanıcı görmez)

#### Product ID
- **Product ID**: `com.kriptokirmizi.alerta.premium.monthly`
- ⚠️ **ÖNEMLİ**: 
  - Format: `com.yourcompany.appname.productname`
  - Bu ID'yi kodda kullanacaksınız
  - Değiştirilemez (oluşturduktan sonra)

#### Subscription Group
- Yeni bir **Subscription Group** oluşturun veya mevcut birine ekleyin
- Group adı: "Premium Subscriptions"

#### Subscription Duration
- **Duration**: 1 Month (1 Ay)

#### Pricing
- **Price**: İstediğiniz fiyatı seçin (örn: $9.99)
- **Availability**: Tüm ülkeler veya belirli ülkeler

#### Localization
- **Display Name**: Premium Monthly
- **Description**: 
  ```
  Aylık premium abonelik. Tüm premium özelliklere erişim sağlar.
  ```

### 5. Review Information

- **Review Notes**: 
  ```
  Premium subscription için test hesabı bilgileri:
  Email: test@example.com
  Password: TestPassword123
  ```

### 6. Save & Submit

1. **Save** butonuna tıklayın
2. Product durumu **Ready to Submit** olmalı
3. ⚠️ **ÖNEMLİ**: Product ID'yi not edin: `com.kriptokirmizi.alerta.premium.monthly`

### 7. Sandbox Test Hesabı Oluşturma

1. **Users and Access** → **Sandbox Testers** seçin
2. **+** butonuna tıklayın
3. Test kullanıcısı bilgilerini girin:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: test@example.com (gerçek email olmalı)
   - **Password**: Güçlü bir şifre
   - **Country/Region**: Test yapacağınız ülke
4. **Save** butonuna tıklayın

---

## 🔧 Kodda Product ID Kullanımı

### UpgradeModal.tsx içinde

```typescript
const productId = platform === 'ios' 
  ? 'com.kriptokirmizi.alerta.premium.monthly'  // iOS Product ID
  : 'premium_monthly';  // Android Product ID
```

### Değiştirmek İsterseniz

1. `components/UpgradeModal.tsx` dosyasını açın
2. `handlePurchase` fonksiyonunda product ID'leri güncelleyin:

```typescript
const productId = platform === 'ios' 
  ? 'YENİ_IOS_PRODUCT_ID'  // App Store Connect'teki Product ID
  : 'YENİ_ANDROID_PRODUCT_ID';  // Google Play Console'daki Product ID
```

---

## ✅ Kontrol Listesi

### Android
- [ ] Google Play Console'da subscription oluşturuldu
- [ ] Product ID: `premium_monthly` (veya istediğiniz ID)
- [ ] Product **Active** durumda
- [ ] Test hesabı eklendi (License testing)
- [ ] Kodda Product ID doğru kullanılıyor

### iOS
- [ ] App Store Connect'te subscription oluşturuldu
- [ ] Product ID: `com.kriptokirmizi.alerta.premium.monthly` (veya istediğiniz ID)
- [ ] Product **Ready to Submit** durumda
- [ ] Sandbox test hesabı oluşturuldu
- [ ] Kodda Product ID doğru kullanılıyor

---

## 🧪 Test

### Android Test
1. Test cihazında Google hesabı ile giriş yapın (License testing'deki hesap)
2. Uygulamayı açın
3. Premium butonuna basın
4. Google Play Billing dialog açılmalı
5. Test satın alma yapın (gerçek para çekilmez)

### iOS Test
1. Test cihazında **App Store'dan çıkış yapın** (Settings → App Store → Sign Out)
2. Uygulamayı açın
3. Premium butonuna basın
4. App Store login dialog açılmalı
5. **Sandbox test hesabı** ile giriş yapın
6. Test satın alma yapın (gerçek para çekilmez)

---

## ⚠️ Önemli Notlar

1. **Product ID Formatı**:
   - Android: Herhangi bir format (örn: `premium_monthly`)
   - iOS: Reverse domain format (örn: `com.company.app.product`)

2. **Product ID Değiştirilemez**:
   - Oluşturduktan sonra Product ID değiştirilemez
   - Yanlış ID oluşturduysanız, yeni bir product oluşturmanız gerekir

3. **Test vs Production**:
   - Test: Sandbox/License testing hesapları ile
   - Production: Gerçek kullanıcılar ile

4. **Fiyatlandırma**:
   - Android: Google Play Console'da belirlenir
   - iOS: App Store Connect'te belirlenir
   - Her ülke için farklı fiyatlandırma yapabilirsiniz

5. **Subscription Renewal**:
   - Otomatik yenilenir (Auto-Renewable)
   - Kullanıcı iptal edene kadar devam eder

---

## 🐛 Sorun Giderme

### Android: "Product not found"
- Product ID'nin tam olarak eşleştiğinden emin olun
- Product'ın **Active** olduğundan emin olun
- Test hesabının License testing'de olduğundan emin olun

### iOS: "Product not found"
- Product ID'nin tam olarak eşleştiğinden emin olun
- Product'ın **Ready to Submit** olduğundan emin olun
- Sandbox test hesabı ile giriş yaptığınızdan emin olun
- App Store'dan çıkış yaptığınızdan emin olun

### "Invalid product ID"
- Product ID formatını kontrol edin
- Kodda kullanılan ID ile store'daki ID'nin aynı olduğundan emin olun
- Case-sensitive (büyük/küçük harf duyarlı) olduğunu unutmayın

---

## 📚 Kaynaklar

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)



