# 🧪 RECEIPT VALIDATION TEST REHBERİ

**Apple App Store Requirement: Guideline 2.1 - Receipt Validation**

Bu dokümanda Apple receipt validation sisteminin nasıl test edileceği anlatılmaktadır.

---

## 🎯 **TEST EDİLMESİ GEREKENLER**

1. ✅ **21007 Error Handling** (Sandbox receipt sent to production URL)
2. ✅ Receipt verification başarılı
3. ✅ Invalid receipt reddediliyor
4. ✅ Apple Shared Secret kontrolü
5. ✅ Expiry date doğru çekiliyor

---

## 📋 **ŞU ANKİ KODUN ÇALIŞMA MANTIĞI**

### **Receipt Validation Flow:**

```typescript
1. Production URL'e gönder
   └─> https://buy.itunes.apple.com/verifyReceipt
   
2. Status code kontrol et:
   
   ✅ Status = 0 → Receipt VALID
      └─> Subscription aktif
      └─> Expiry date çek
      └─> User'ı premium yap
   
   ⚠️ Status = 21007 → Sandbox receipt detected
      └─> Sandbox URL'e yönlendir
      └─> https://sandbox.itunes.apple.com/verifyReceipt
      └─> Tekrar kontrol et
      └─> Status = 0 ise → VALID
   
   ❌ Other statuses → Invalid receipt
      └─> Error message döndür
```

---

## 🧪 **TEST YÖNTEMLERİ**

### **Yöntem 1: iOS Simulator (Sandbox) - EN KOLAY ✅**

#### **Adım 1: Sandbox Test Kullanıcısı Oluştur**

1. **App Store Connect'e git:**
   ```
   https://appstoreconnect.apple.com/
   ```

2. **Sandbox Tester ekle:**
   ```
   Users and Access
   └─> Sandbox Testers
   └─> Add Tester (+)
   
   Email: test-alertachart@example.com
   Password: Test1234!
   Country/Region: Turkey
   ```

   **NOT:** Email fake olabilir (onay gerektirmez)

---

#### **Adım 2: iOS App'i Hazırla**

```bash
cd /Users/ata/Desktop/alertachart

# 1. Latest code'u pull
git pull

# 2. Capacitor sync
npx cap sync ios

# 3. Xcode'da aç
npx cap open ios
```

---

#### **Adım 3: iOS Device/Simulator'da Çalıştır**

**Xcode:**
1. Device seç: **iPhone 15 Pro (Simulator)** veya **Real Device**
2. **Run** (⌘R)
3. App açılacak

---

#### **Adım 4: Sandbox Hesabı ile Login**

**iOS Settings (Simulator/Device):**
```
Settings
└─> App Store
└─> Sandbox Account
└─> Sign In
   └─> Email: test-alertachart@example.com
   └─> Password: Test1234!
```

**NOT:** Production Apple ID ile logout olun!

---

#### **Adım 5: Premium Satın Al**

**App içinde:**
```
1. Login yap (Google/Apple)
2. Settings → Premium Upgrade
3. "3 Gün Ücretsiz Dene" butonuna bas
4. Apple popup çıkacak (Sandbox)
5. Confirm → [Environment: Sandbox] yazacak
6. Receipt oluşturulacak
```

---

#### **Adım 6: Backend Loglarını Kontrol Et**

**Vercel Dashboard:**
```
https://vercel.com/your-project/logs
```

**Aranacak Loglar:**

✅ **Başarılı Sandbox Receipt:**
```
[Verify Purchase] 🍎 Verifying Apple receipt...
[Verify Purchase] 🔄 Production receipt invalid, trying sandbox...
[Verify Purchase] ✅ Apple receipt validated (sandbox)
```

✅ **21007 Handling:**
```
Status: 21007
→ Fallback to sandbox URL
→ Status: 0 (Valid)
```

---

### **Yöntem 2: TestFlight (Production-like Test)**

#### **Adım 1: TestFlight Build Upload**

```bash
# 1. Xcode'da Archive oluştur
Product → Archive

# 2. Upload to TestFlight
Organizer → Distribute App → TestFlight
```

#### **Adım 2: Internal Tester Ekle**

```
App Store Connect
└─> TestFlight
└─> Internal Testing
└─> Add Tester: your@email.com
```

#### **Adım 3: TestFlight'tan İndir ve Test Et**

```
1. TestFlight app'ini aç (iOS)
2. Alerta Chart'ı indir
3. Sandbox hesabı ile login (Settings → App Store)
4. Premium satın al
5. Logları kontrol et
```

**Beklenen:**
- TestFlight sandbox receipt oluşturur
- Backend 21007 alır
- Sandbox URL'e fallback yapar
- Receipt validate edilir ✅

---

### **Yöntem 3: Backend Endpoint Manuel Test (DEBUG)**

Backend endpoint'i direkt test etmek için:

#### **A. Fake Receipt ile Test (Development)**

```bash
# Test receipt oluştur (fake)
curl -X POST https://www.alertachart.com/api/subscription/verify-purchase \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "platform": "ios",
    "productId": "premium_monthly",
    "transactionId": "test_transaction_123",
    "receipt": "FAKE_RECEIPT_DATA"
  }'
```

**Beklenen Sonuç:**
```json
{
  "error": "The receipt data property was malformed or missing"
}
```

---

#### **B. Real Receipt ile Test (Production)**

Real device'dan real receipt alınmalı:

```typescript
// iOS app'te receipt al
const receipt = await Capacitor.Plugins.InAppPurchase.getReceipt();
console.log('Receipt:', receipt);

// Bu receipt'i manuel olarak API'ye gönder
```

---

## 🔍 **TEST SENARYOLARI**

### **Senaryo 1: Sandbox Receipt (21007)**

**Test:**
```
1. Simulator'da sandbox hesabı ile satın al
2. Receipt oluşturulur (sandbox)
3. Backend production URL'e gönderir
4. Status = 21007 alır
5. Sandbox URL'e fallback yapar
6. Status = 0 alır (valid)
```

**Beklenen Log:**
```
[Verify Purchase] 🍎 Verifying Apple receipt...
[Verify Purchase] 📤 Trying production URL first...
[Verify Purchase] ⚠️ Status 21007: Sandbox receipt in production
[Verify Purchase] 🔄 Production receipt invalid, trying sandbox...
[Verify Purchase] 📤 Trying sandbox URL...
[Verify Purchase] ✅ Apple receipt validated (sandbox)
[Verify Purchase] ✅ User upgraded to premium
```

**Sonuç:** ✅ **PASS**

---

### **Senaryo 2: Production Receipt (Status 0)**

**Test:**
```
1. Real device'da production satın alma
2. Receipt oluşturulur (production)
3. Backend production URL'e gönderir
4. Status = 0 alır (valid)
```

**Beklenen Log:**
```
[Verify Purchase] 🍎 Verifying Apple receipt...
[Verify Purchase] 📤 Trying production URL first...
[Verify Purchase] ✅ Apple receipt validated (production)
[Verify Purchase] ✅ User upgraded to premium
```

**Sonuç:** ✅ **PASS**

---

### **Senaryo 3: Invalid Receipt**

**Test:**
```
1. Fake/tampered receipt gönder
2. Backend production URL'e gönderir
3. Status = 21002/21003 alır
```

**Beklenen Log:**
```
[Verify Purchase] 🍎 Verifying Apple receipt...
[Verify Purchase] 📤 Trying production URL first...
[Verify Purchase] ❌ Apple verification failed: The receipt data property was malformed
[Verify Purchase] ❌ Receipt verification failed
```

**Sonuç:** ✅ **PASS** (reddedildi)

---

### **Senaryo 4: Missing Shared Secret**

**Test:**
```
1. APPLE_SHARED_SECRET env var'ı sil
2. Receipt gönder
```

**Beklenen Log:**
```
[Verify Purchase] ❌ APPLE_SHARED_SECRET not set
[Verify Purchase] ❌ Receipt verification failed: Server configuration error
```

**Sonuç:** ✅ **PASS** (hata döndü)

---

## 🛠️ **ENVIRONMENT VARİABLES**

### **Vercel'de Kontrol:**

```
Vercel Dashboard
└─> Project Settings
└─> Environment Variables
```

**Gerekli:**
```bash
APPLE_SHARED_SECRET=1234567890abcdef  # App Store Connect'ten al
```

**Alma Yolu:**
```
App Store Connect
└─> My Apps
└─> Alerta Chart
└─> App Information
└─> App-Specific Shared Secret
└─> Generate (if not exists)
```

---

## 📊 **TEST SONUÇLARI RAPORU**

### **Test Checklist:**

| Test | Senaryo | Beklenen | Durum |
|------|---------|----------|-------|
| ✅ | Sandbox receipt (21007) | Fallback to sandbox URL | - |
| ✅ | Production receipt (0) | Validate successfully | - |
| ✅ | Invalid receipt | Reject with error | - |
| ✅ | Missing shared secret | Return error | - |
| ✅ | Expiry date parsing | Extract correct date | - |

---

## 🚀 **APPLE SUBMISSION İÇİN**

Apple'a submit etmeden önce:

### **1. TestFlight Test (ÖNEMLİ):**

```
✅ Internal tester ekle
✅ TestFlight'tan indir
✅ Sandbox satın alma yap
✅ Logları kontrol et (21007 handling)
✅ Premium özelliklere erişebildiğini onayla
```

---

### **2. App Store Connect Screenshots:**

Review team'e göndermek için logları screenshot al:

```
✅ Vercel logs: 21007 detection
✅ Vercel logs: Sandbox fallback
✅ Vercel logs: Successful validation
✅ App screenshot: Premium aktif
```

---

### **3. Review Notes:**

App Store Connect → App Review Information → Notes:

```
Receipt Validation Implementation:

We have implemented proper receipt validation as per Apple guidelines:

1. We send receipts to production URL first (buy.itunes.apple.com/verifyReceipt)
2. If status 21007 is returned (sandbox receipt), we automatically retry with sandbox URL
3. This ensures receipts work in both TestFlight and Production environments
4. All receipts are validated server-side before granting premium access

Test Account:
Email: test-alertachart@example.com
Password: Test1234!

Please test the in-app purchase flow in TestFlight to see the 21007 handling in action.
```

---

## 🔐 **GÜVENLİK KONTROL**

### **Kod İncelemesi:**

```typescript
// ✅ Production URL öncelikli
const productionResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', ...);

// ✅ 21007 handling
if (productionResult.status === 21007) {
  const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', ...);
  // ... sandbox validation
}

// ✅ Shared secret kullanımı
body: JSON.stringify({
  'receipt-data': receipt,
  'password': appleSharedSecret,  // Required
  'exclude-old-transactions': true,
}),

// ✅ Error handling
if (!appleSharedSecret) {
  return { valid: false, error: 'Server configuration error' };
}
```

**Sonuç:** ✅ **GÜÇLÜ VE GÜVENLİ**

---

## 📝 **ÖZET**

### **Mevcut Durum:**

| Gereksinim | Durum | Notlar |
|------------|-------|--------|
| **21007 Handling** | ✅ | Production → Sandbox fallback |
| **Shared Secret** | ✅ | Vercel env var'da |
| **Error Handling** | ✅ | Tüm status kodları handle ediliyor |
| **Expiry Date** | ✅ | Receipt'ten çekiliyor |
| **Server-side Validation** | ✅ | Client'ta değil |

---

### **Test Önerisi:**

**En Kolay Yöntem:**
```
1. Sandbox tester oluştur (App Store Connect)
2. iOS Simulator'da app'i aç
3. Sandbox hesabı ile login (iOS Settings)
4. Premium satın al
5. Vercel loglarını kontrol et
6. 21007 → Sandbox fallback logunu gör ✅
```

**Süre:** ~10 dakika

---

## 🎯 **SONRAKİ ADIM**

1. ✅ Sandbox test et (yukarıdaki adımlar)
2. ✅ TestFlight'a upload et
3. ✅ Internal tester ile test et
4. ✅ Screenshot'ları al
5. ✅ App Store'a submit et

**Receipt validation sistemi HAZIR ve TEST EDİLEBİLİR! 🚀**

