# Google Play Purchase Verification Setup

Google Play Developer API entegrasyonu için Service Account Key oluşturma rehberi.

## 📋 Adım 1: Google Cloud Console'da Service Account Oluşturma

### 1. Google Cloud Console'a Giriş

1. [Google Cloud Console](https://console.cloud.google.com/) → Giriş yapın
2. Google Play Console ile aynı Google hesabını kullanın

### 2. Proje Seçin veya Oluşturun

1. Üst menüden **proje seçin** (veya yeni proje oluşturun)
2. Proje adı: "Alerta" (veya istediğiniz isim)

### 3. Service Account Oluşturma

1. Sol menüden **IAM & Admin** → **Service Accounts** seçin
2. **+ CREATE SERVICE ACCOUNT** butonuna tıklayın
3. **Service account details**:
   - **Service account name**: `alerta-play-verification`
   - **Service account ID**: Otomatik oluşturulur
   - **Description**: `Google Play purchase verification service account`
4. **CREATE AND CONTINUE** butonuna tıklayın

### 4. Role Atama (Opsiyonel)

Bu adımı atlayabilirsiniz, Google Play Console'da yetki vereceğiz.

**SKIP** butonuna tıklayın.

### 5. Service Account Key Oluşturma

1. Oluşturduğunuz service account'a tıklayın
2. **KEYS** sekmesine gidin
3. **ADD KEY** → **Create new key** seçin
4. **Key type**: **JSON** seçin
5. **CREATE** butonuna tıklayın
6. JSON dosyası otomatik olarak indirilir

⚠️ **ÖNEMLİ**: Bu JSON dosyasını GÜVENLİ bir yerde saklayın!

---

## 📋 Adım 2: Google Play Console'da Yetki Verme

### 1. Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) → Giriş yapın
2. Uygulamanızı seçin

### 2. Service Account'a Yetki Verme

1. Sol menüden **Setup** → **API access** seçin
2. **Service accounts** bölümünde **LINK SERVICE ACCOUNT** butonuna tıklayın
3. **Google Cloud project** seçin (Adım 1'de oluşturduğunuz proje)
4. Service account'u seçin (`alerta-play-verification`)
5. **GRANT ACCESS** butonuna tıklayın

### 3. İzinleri Ayarlama

Service account'a şu izinleri verin:

- ✅ **View financial data, orders, and cancellation survey data**
- ✅ **Manage orders and subscriptions** (Subscription verification için gerekli)

**SAVE** butonuna tıklayın.

---

## 📋 Adım 3: Environment Variable Ayarlama

### Vercel'de (Production)

1. [Vercel Dashboard](https://vercel.com/dashboard) → Projenizi seçin
2. **Settings** → **Environment Variables** seçin
3. Yeni environment variable ekleyin:

#### `ANDROID_PACKAGE_NAME`
- **Name**: `ANDROID_PACKAGE_NAME`
- **Value**: `com.kriptokirmizi.alerta`
- **Environment**: Production, Preview, Development

#### `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Name**: `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Value**: İndirdiğiniz JSON dosyasının **tam içeriği** (tek satır olarak)
- **Environment**: Production, Preview, Development

**Örnek JSON içeriği:**
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"alerta-play-verification@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

⚠️ **ÖNEMLİ**: 
- JSON'u tek satır olarak yapıştırın (satır sonları `\n` olarak kalabilir)
- Veya base64 encode edip yapıştırabilirsiniz (kod otomatik decode eder)

### Local Development (.env.local)

`.env.local` dosyasına ekleyin:

```bash
ANDROID_PACKAGE_NAME=com.kriptokirmizi.alerta
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Not**: JSON'u tek tırnak içine alın veya escape edin.

---

## 🧪 Test

### 1. Test Satın Alma

1. Google Play Console → **Testing** → **License testing**
2. Test hesabı ekleyin
3. Test cihazında satın alma yapın
4. Backend loglarını kontrol edin:

```bash
# Vercel logs
vercel logs

# Veya Vercel dashboard → Deployments → Logs
```

### 2. Log Kontrolü

Başarılı verification için şu log görünmeli:

```
[Verify Purchase] ✅ Google purchase validated via API {
  orderId: 'GPA.1234-5678-9012',
  purchaseState: 0,
  expiryDate: '2024-12-20T10:00:00.000Z'
}
```

Hata durumunda:

```
[Verify Purchase] ❌ Google Play API error: 401 ...
```

---

## 🔍 Troubleshooting

### Hata: "GOOGLE_SERVICE_ACCOUNT_KEY not set"

**Çözüm**: Environment variable'ı kontrol edin, JSON formatında olmalı.

### Hata: "Authentication failed - check service account key"

**Çözüm**: 
1. Service account key'in doğru olduğundan emin olun
2. Google Play Console'da service account'a yetki verildiğinden emin olun

### Hata: "Permission denied - check service account permissions"

**Çözüm**: 
1. Google Play Console → **Setup** → **API access**
2. Service account'u seçin
3. **View permissions** → Gerekli izinleri verin:
   - ✅ View financial data
   - ✅ Manage orders and subscriptions

### Hata: "Purchase not found or invalid token"

**Çözüm**: 
1. Purchase token'ın doğru olduğundan emin olun
2. Product ID'nin Google Play Console'daki ile eşleştiğinden emin olun
3. Package name'in doğru olduğundan emin olun

---

## ✅ Kontrol Listesi

- [ ] Google Cloud Console'da service account oluşturuldu
- [ ] Service account key (JSON) indirildi
- [ ] Google Play Console'da service account'a yetki verildi
- [ ] Gerekli izinler verildi (View financial data, Manage orders)
- [ ] `ANDROID_PACKAGE_NAME` environment variable ayarlandı
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable ayarlandı
- [ ] Test satın alma yapıldı
- [ ] Backend loglarında başarılı verification görüldü

---

## 📚 Kaynaklar

- [Google Play Developer API Documentation](https://developers.google.com/android-publisher)
- [Service Account Authentication](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Purchase Verification API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products)

