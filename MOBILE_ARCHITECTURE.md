# 📱 Mobil Uygulama Mimarisi - Açıklama

## 🔍 Mevcut Durum

Projede **iki farklı mobil yapı** var:

### 1. **Expo + React Native (AKTİF) ✅**
**Konum:** `mobile/` klasörü

- **Framework:** Expo SDK 54
- **Kullanım:** Aktif olarak kullanılıyor
- **Yapı:** React Native WebView içinde Next.js web uygulaması
- **Notifications:** Expo Notifications (`expo-notifications`)
- **Build:** EAS Build ile yapılıyor

**Dosyalar:**
- `mobile/App.tsx` - Ana uygulama
- `mobile/src/components/AppWebView.tsx` - WebView wrapper
- `mobile/src/services/notifications.ts` - Expo Notifications
- `mobile/package.json` - Expo dependencies

**Build Komutları:**
```bash
cd mobile
npm start          # Expo dev server
npm run android    # Android build
npm run ios        # iOS build
eas build          # EAS build
```

---

### 2. **Capacitor (ESKİ/ALTERNATİF) ⚠️**
**Konum:** Root klasör (`/`)

- **Framework:** Capacitor 7.4.4
- **Kullanım:** Muhtemelen kullanılmıyor (eski yapı)
- **Yapı:** Next.js'i native app'e sarıyor
- **Notifications:** Capacitor Push Notifications
- **Build:** Capacitor CLI ile yapılıyor

**Dosyalar:**
- `capacitor.config.ts` - Capacitor config
- `ios/` - Capacitor iOS projesi
- `android/` - Capacitor Android projesi
- `services/pushNotificationService.ts` - Capacitor Push Notifications

**Build Komutları:**
```bash
npm run build      # Next.js build
npx cap sync       # Capacitor sync
npx cap open ios   # iOS aç
npx cap open android # Android aç
```

---

## ❓ Hangi Sistem Kullanılıyor?

**CEVAP: Expo (mobile/ klasörü) ✅**

Kanıtlar:
1. `mobile/README.md` → "Expo tabanlı mobil uygulama"
2. `mobile/package.json` → Expo dependencies
3. `mobile/App.tsx` → Expo kullanıyor
4. Build komutları → EAS Build kullanılıyor
5. Son yapılan değişiklikler → Expo Notifications kullanılıyor

---

## 🔄 Geçiş Durumu

**Soru:** "Expo'dan Capacitor'e geçirdin mi?"

**Cevap:** Hayır, geçiş yapılmadı. İki sistem yan yana duruyor:
- **Expo (mobile/):** Aktif, kullanılıyor
- **Capacitor (root):** Eski/alternatif, muhtemelen kullanılmıyor

---

## 🎯 Local Notification Fix - Hangi Sistem?

**Yapılan değişiklikler Expo için yapıldı:**
- ✅ `mobile/src/components/AppWebView.tsx` → Expo Notifications kullanıyor
- ✅ `services/alertService.ts` → React Native WebView mesajı gönderiyor

**Neden Expo?**
- Aktif mobil app Expo kullanıyor
- `mobile/` klasöründeki kod Expo tabanlı
- EAS Build ile build ediliyor

---

## 📝 Öneriler

### Seçenek 1: Expo'da Devam Et (ÖNERİLEN) ✅
- Mevcut yapı çalışıyor
- EAS Build ile kolay deployment
- Expo Notifications çalışıyor
- **Yapılacak:** Capacitor kodlarını temizle (isteğe bağlı)

### Seçenek 2: Capacitor'e Geç
- Root'taki Capacitor yapısını aktif et
- `mobile/` klasörünü kaldır
- Capacitor Push Notifications kullan
- **Yapılacak:** Tüm Expo kodlarını Capacitor'e port et

### Seçenek 3: İkisini de Tut
- Expo: Production build
- Capacitor: Alternatif/backup
- **Yapılacak:** İki sistemin senkronize kalması

---

## 🔧 Local Notification Fix - Doğru Sistem

**Yapılan değişiklikler DOĞRU sistem için yapıldı:**
- ✅ Expo Notifications kullanıldı (çünkü aktif sistem Expo)
- ✅ `mobile/src/components/AppWebView.tsx` güncellendi
- ✅ React Native WebView mesajlaşması kullanıldı

**Eğer Capacitor kullanıyorsanız:**
- `services/pushNotificationService.ts` güncellenmeli
- Capacitor Local Notifications plugin kullanılmalı
- WebView yerine Capacitor bridge kullanılmalı

---

## ✅ Sonuç

**Aktif Sistem:** Expo (mobile/ klasörü)  
**Local Notification Fix:** Expo için yapıldı ✅  
**Durum:** Doğru sistem için doğru fix yapıldı

Eğer Capacitor kullanmak istiyorsanız, farklı bir implementasyon gerekir.

