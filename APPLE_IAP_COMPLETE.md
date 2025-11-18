# Apple IAP Entegrasyonu - Tamamlanma Rehberi

## ✅ Tamamlanan İşlemler

1. ✅ iOS native plugin oluşturuldu (`InAppPurchasePlugin.swift`)
2. ✅ Client-side IAP service hazır (`services/iapService.ts`)
3. ✅ Server-side verification endpoint hazır (`app/api/subscription/verify-purchase/route.ts`)
4. ✅ Apple receipt verification production-ready hale getirildi
5. ✅ UpgradeModal'da butonlar aktif

## 📋 Yapılması Gerekenler

### 1. App Store Connect'te Product Oluşturma

#### a) App Store Connect'e Giriş

1. [App Store Connect](https://appstoreconnect.apple.com) → Giriş yapın
2. **My Apps** → Uygulamanızı seçin (yoksa yeni uygulama oluşturun)

#### b) In-App Purchase Oluşturma

1. Uygulama sayfasında **Features** sekmesine gidin
2. **In-App Purchases** bölümüne tıklayın
3. **+** butonuna tıklayın

#### c) Product Type Seçin

- **Auto-Renewable Subscription** seçin (Aylık abonelik için)
- **Continue** butonuna tıklayın

#### d) Product Detaylarını Doldurun

**Reference Name:**
- Premium Monthly Subscription

**Product ID:**
- `com.kriptokirmizi.alerta.premium.monthly`
- ⚠️ **ÖNEMLİ**: Bu ID'yi kodda kullanacaksınız
- Değiştirilemez (oluşturduktan sonra)

**Subscription Group:**
- Yeni bir **Subscription Group** oluşturun veya mevcut birine ekleyin
- Group adı: "Premium Subscriptions"

**Subscription Duration:**
- **Duration**: 1 Month (1 Ay)

**Pricing:**
- **Price**: İstediğiniz fiyatı seçin (örn: $9.99)
- **Availability**: Tüm ülkeler veya belirli ülkeler

**Localization:**
- **Display Name**: Premium Monthly
- **Description**: 
  ```
  Aylık premium abonelik. Tüm premium özelliklere erişim sağlar:
  - AGGR Menüsü
  - Otomatik Fiyat Takibi
  - 4-9 Lu Grafik
  - 10s & 30s Timeframe
  ```

#### e) Review Information

- **Review Notes**: 
  ```
  Premium subscription için test hesabı bilgileri:
  Email: test@example.com
  Password: TestPassword123
  ```

#### f) Save & Submit

1. **Save** butonuna tıklayın
2. Product durumu **Ready to Submit** olmalı
3. ⚠️ **ÖNEMLİ**: Product ID'yi not edin: `com.kriptokirmizi.alerta.premium.monthly`

### 2. Apple Shared Secret Oluşturma

Apple receipt verification için Shared Secret gerekiyor:

1. App Store Connect → **My Apps** → Uygulamanızı seçin
2. **App Information** → **App-Specific Shared Secret** bölümüne gidin
3. **Generate** butonuna tıklayın
4. Shared Secret'i kopyalayın (sadece bir kez gösterilir!)
5. `.env.local` dosyasına ekleyin:

```bash
APPLE_SHARED_SECRET=your_shared_secret_here
```

### 3. Sandbox Test Hesabı Oluşturma

1. **Users and Access** → **Sandbox Testers** seçin
2. **+** butonuna tıklayın
3. Test kullanıcısı bilgilerini girin:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: test@example.com (gerçek email olmalı)
   - **Password**: Güçlü bir şifre
   - **Country/Region**: Test yapacağınız ülke
4. **Save** butonuna tıklayın

### 4. iOS Build ve Test

#### a) Xcode'da Build

```bash
cd ios/App
open App.xcworkspace
```

Xcode'da:
1. **Product** → **Scheme** → **App** seçin
2. **Product** → **Destination** → Test cihazınızı seçin
3. **Product** → **Build** (⌘B)
4. **Product** → **Run** (⌘R)

#### b) Test Etme

1. Test cihazında **App Store'dan çıkış yapın** (Settings → App Store → Sign Out)
2. Uygulamayı açın
3. Premium butonuna basın
4. App Store login dialog açılmalı
5. **Sandbox test hesabı** ile giriş yapın
6. Test satın alma yapın (gerçek para çekilmez)

## 🔧 Kodda Product ID

Product ID şu anda `components/UpgradeModal.tsx` içinde:

```typescript
const productId = platform === 'ios' 
  ? 'com.kriptokirmizi.alerta.premium.monthly'  // iOS product ID
  : 'premium_monthly';  // Android product ID
```

App Store Connect'te oluşturduğunuz Product ID ile eşleşmeli.

## 🔐 Environment Variables

`.env.local` dosyasına ekleyin:

```bash
# Apple IAP
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect
```

Vercel'de de ekleyin:
1. Vercel Dashboard → Project Settings → Environment Variables
2. **APPLE_SHARED_SECRET** ekleyin
3. Production, Preview, Development için aktif edin

## 🧪 Test Senaryosu

### 1. Sandbox Test

1. Test cihazında App Store'dan çıkış yapın
2. Uygulamayı açın
3. Premium butonuna basın
4. Sandbox test hesabı ile giriş yapın
5. Satın alma yapın
6. Server verification çalışmalı
7. Kullanıcı premium olmalı

### 2. Production Test

1. App Store'da uygulama yayında olmalı
2. Gerçek kullanıcı hesabı ile giriş yapın
3. Premium butonuna basın
4. Gerçek satın alma yapın
5. Server verification çalışmalı
6. Kullanıcı premium olmalı

## ✅ Kontrol Listesi

### App Store Connect
- [ ] In-App Purchase product oluşturuldu
- [ ] Product ID: `com.kriptokirmizi.alerta.premium.monthly`
- [ ] Product **Ready to Submit** durumda
- [ ] Apple Shared Secret oluşturuldu
- [ ] Sandbox test hesabı oluşturuldu

### Kod
- [ ] Product ID doğru (`UpgradeModal.tsx`)
- [ ] `APPLE_SHARED_SECRET` environment variable eklendi
- [ ] Server-side verification çalışıyor
- [ ] iOS plugin doğru çalışıyor

### Test
- [ ] Sandbox test yapıldı
- [ ] Server verification çalışıyor
- [ ] Kullanıcı premium oluyor
- [ ] Database güncelleniyor

## 🐛 Sorun Giderme

### "Product not found"

**Sorun**: Product ID eşleşmiyor

**Çözüm**:
1. App Store Connect'te Product ID'yi kontrol edin
2. `UpgradeModal.tsx` içindeki Product ID ile eşleştiğinden emin olun
3. Case-sensitive (büyük/küçük harf duyarlı) olduğunu unutmayın

### "Receipt verification failed"

**Sorun**: Apple Shared Secret yanlış veya eksik

**Çözüm**:
1. `APPLE_SHARED_SECRET` environment variable'ın doğru olduğundan emin olun
2. App Store Connect'ten yeni Shared Secret oluşturun
3. `.env.local` ve Vercel'de güncelleyin

### "Sandbox receipt sent to production"

**Sorun**: Sandbox receipt production'a gönderilmiş

**Çözüm**: Normal, kod otomatik olarak sandbox'a yönlendiriyor

### "IAP plugin not found"

**Sorun**: iOS plugin yüklenmemiş

**Çözüm**:
1. `npx cap sync ios` çalıştırın
2. Xcode'da clean build yapın
3. Pod install yapın: `cd ios/App && pod install`

## 📚 Kaynaklar

- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Receipt Validation](https://developer.apple.com/documentation/appstorereceipts)

## 🎉 Hazır!

Apple IAP entegrasyonu tamamlandı. App Store Connect'te product oluşturup test edebilirsiniz!


