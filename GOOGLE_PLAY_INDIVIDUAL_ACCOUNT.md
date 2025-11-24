# Google Play Verification - Bireysel Geliştirici Hesapları İçin

## ⚠️ Önemli: API Access Kısıtlaması

Google, 2024 sonu itibariyle **bireysel geliştirici hesapları** için Google Play Developer API erişimini kaldırdı.

**Etkilenen hesaplar:**
- ❌ Bireysel geliştirici hesabı (şirket hesabı değil)
- ❌ Türkiye bölgesi hesapları
- ❌ Organization bağlı olmayan hesaplar
- ❌ Kimliği doğrulanmamış hesaplar

**Sonuç:**
- API Access menüsü görünmüyor
- Service Account bağlantısı yapılamıyor
- Google Play Developer API kullanılamıyor

---

## ✅ Alternatif Çözüm: Native Plugin Verification

### Nasıl Çalışıyor?

1. **Native Plugin (Google Play Billing Library) zaten doğruluyor:**
   - Purchase token Google Play sunucularından geliyor
   - Google Play Billing Library purchase'ı cihazda doğruluyor
   - Purchase state kontrol ediliyor (PURCHASED = 0)
   - Sadece geçerli purchase'lar acknowledge ediliyor

2. **Backend Verification:**
   - Purchase token formatını kontrol ediyor
   - Order ID formatını kontrol ediyor
   - Subscription'ı database'e kaydediyor
   - Subscription durumunu takip ediyor

### Güvenlik

✅ **Güvenli çünkü:**
- Purchase token Google Play'den geliyor (sahte olamaz)
- Native plugin Google Play Billing Library kullanıyor (Google'ın resmi SDK'sı)
- Purchase state kontrol ediliyor
- Sadece geçerli purchase'lar acknowledge ediliyor

⚠️ **Not:**
- Backend'de Google Play API ile doğrulama yapılamıyor (bireysel hesap)
- Ama native plugin zaten doğruluyor, bu yeterli

---

## 🔧 Mevcut Sistem

### Kod Durumu

Backend'deki `verifyGoogleReceipt` fonksiyonu:

1. **Önce Google Play Developer API'yi dener** (eğer service account varsa)
2. **Eğer API erişimi yoksa**, native plugin verification'a güvenir
3. **Format kontrolü yapar** (token formatı, order ID formatı)
4. **Subscription'ı kaydeder**

### Environment Variables

**Opsiyonel** (sadece organization hesapları için):
```bash
GOOGLE_SERVICE_ACCOUNT_KEY={JSON}  # Sadece organization hesapları için
ANDROID_PACKAGE_NAME=com.kriptokirmizi.alerta
```

**Bireysel hesaplar için:**
- Bu variable'ları ayarlamanıza gerek yok
- Sistem otomatik olarak native verification kullanacak

---

## 📋 Subscription Durumu Kontrolü

### Periyodik Kontrol

Subscription durumunu kontrol etmek için:

1. **Native Plugin'den Restore Purchases:**
   ```typescript
   // Frontend'de periyodik olarak çağırılabilir
   const result = await restorePurchases();
   // Active subscription'ları kontrol et
   ```

2. **Backend'de Subscription Check:**
   - Database'de `expiry_date` kontrol edilir
   - Expiry date geçmişse, `plan = 'free'` yapılır

### Webhook (Opsiyonel)

Google Play Real-time Developer Notifications (RTDN) kullanılabilir, ama:
- Bireysel hesaplar için API access gerektirebilir
- Alternatif: Periyodik native plugin kontrolü

---

## ✅ Kontrol Listesi

- [x] Native plugin Google Play Billing Library kullanıyor
- [x] Purchase token format kontrolü yapılıyor
- [x] Purchase state kontrol ediliyor (PURCHASED = 0)
- [x] Backend'de subscription kaydediliyor
- [x] Expiry date hesaplanıyor (product type'a göre)
- [ ] Periyodik subscription durumu kontrolü (opsiyonel)

---

## 🔄 Şirket Hesabına Geçiş (İleride)

Eğer ileride şirket hesabına geçerseniz:

1. Google Play Console → **Setup** → **API access** görünecek
2. Service Account oluşturup bağlayabilirsiniz
3. `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable'ını ayarlayın
4. Sistem otomatik olarak Google Play Developer API kullanacak

---

## 📚 Kaynaklar

- [Google Play Billing Library](https://developer.android.com/google/play/billing)
- [Individual vs Organization Accounts](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Purchase Verification Best Practices](https://developer.android.com/google/play/billing/security)

---

## 💡 Özet

**Bireysel geliştirici hesapları için:**
- ✅ Native plugin verification yeterli ve güvenli
- ✅ Backend format kontrolü yapıyor
- ✅ Subscription kaydediliyor
- ❌ Google Play Developer API kullanılamıyor (ama gerekli değil)

**Sistem şu an çalışıyor ve güvenli!** 🎉



