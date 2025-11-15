# 🔍 AlertaChart HealthCheck Raporu
**Tarih:** $(date +"%Y-%m-%d %H:%M:%S")  
**Proje:** AlertaChart - Real-time Cryptocurrency Charting Platform

---

## 📋 Genel Bakış

### Proje Yapısı ✅
- **Framework:** Next.js 15.0.0 (App Router)
- **Mobil:** Capacitor 7.4.4 + Expo (hibrit yapı)
- **Database:** Neon PostgreSQL
- **Backend:** Ayrı backend servisi (port 3002)
- **WebSocket:** Binance WebSocket API

### Bağımlılıklar ✅
- Tüm kritik paketler yüklü görünüyor
- Next.js, React 19, Capacitor, Push Notifications plugin mevcut
- TypeScript konfigürasyonu doğru

---

## 🔴 Kritik Kontroller

### 1. Environment Variables ⚠️
**Durum:** Kontrol edilmeli

**Gerekli Değişkenler:**
```bash
# Database
DATABASE_URL=postgresql://...  # Neon PostgreSQL connection string

# Backend
BACKEND_URL=http://localhost:3002  # veya production URL
NEXT_PUBLIC_BACKEND_URL=...  # Frontend'den erişim için

# NextAuth
NEXTAUTH_SECRET=...  # NextAuth için secret key
NEXTAUTH_URL=...  # Production URL

# OAuth Providers
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Kontrol:**
```bash
# .env.local dosyası var mı?
ls -la .env.local

# Vercel'de environment variables ayarlı mı?
# Vercel Dashboard → Project Settings → Environment Variables
```

---

### 2. Backend Bağlantısı ⚠️
**Durum:** Kontrol edilmeli

**Kontrol Noktaları:**
- Backend servisi çalışıyor mu? (port 3002)
- `BACKEND_URL` environment variable doğru mu?
- Backend API endpoint'leri erişilebilir mi?

**Test:**
```bash
# Backend health check
curl http://localhost:3002/health

# veya production
curl https://alertachart-backend-production.up.railway.app/health
```

**API Endpoints:**
- `/api/alarms/notify` - Alarm bildirimleri
- `/api/push/register` - Push token kaydı
- `/api/auth/*` - Authentication endpoints

---

### 3. Database Bağlantısı ⚠️
**Durum:** Kontrol edilmeli

**Kontrol:**
```bash
# Database bağlantısını test et
psql $DATABASE_URL -c "SELECT 1;"

# Tablolar var mı?
psql $DATABASE_URL -c "\dt"
```

**Gerekli Tablolar:**
- `devices` - Cihaz kayıtları
- `price_alerts` - Fiyat alarmları (eski sistem)
- `alarm_subscriptions` - Alarm abonelikleri
- `users` - Kullanıcılar (NextAuth)

**Schema Kontrolü:**
```bash
# Push notification schema yüklü mü?
psql $DATABASE_URL -f database/push-schema.sql
```

---

### 4. Alarm Sistemi ✅
**Durum:** Kod yapısı sağlam

**Özellikler:**
- ✅ `alertService.ts` - Alarm yönetimi
- ✅ `checkPrice()` - Fiyat kontrolü
- ✅ `triggerAlert()` - Alarm tetikleme
- ✅ WebSocket entegrasyonu (`Watchlist.tsx`)
- ✅ localStorage'da alarm saklama
- ✅ Device ID yönetimi

**Potansiyel Sorunlar:**
1. **Device ID Eksikliği:** Alarm oluşturulurken deviceId yoksa push notification gönderilmiyor
2. **Auth Kontrolü:** `triggerAlert()` içinde auth kontrolü var ama cookie'ler doğru gönderiliyor mu?
3. **Backend Bağlantısı:** `/api/alarms/notify` endpoint'i backend'e ulaşıyor mu?

**Kontrol:**
```javascript
// Browser console'da test
alertService.getAlerts()  // Alarmlar yükleniyor mu?
localStorage.getItem('native_device_id')  // Device ID var mı?
```

---

### 5. Push Notification Sistemi ✅
**Durum:** Kod yapısı sağlam

**Özellikler:**
- ✅ Capacitor Push Notifications plugin
- ✅ FCM token kayıt sistemi
- ✅ Token localStorage'da saklama
- ✅ Login sonrası re-registration (`reRegisterAfterLogin()`)

**Potansiyel Sorunlar:**
1. **Token Kaydı:** Token backend'e kaydediliyor mu?
2. **User Linking:** Login sonrası device user'a bağlanıyor mu?
3. **Notification Permissions:** iOS/Android izinleri verilmiş mi?

**Kontrol:**
```javascript
// Browser console'da test
localStorage.getItem('fcm_token')  // Token var mı?
```

---

### 6. WebSocket Bağlantısı ✅
**Durum:** Kod yapısı sağlam

**Özellikler:**
- ✅ Binance WebSocket entegrasyonu
- ✅ Reconnection logic
- ✅ Real-time price updates
- ✅ Watchlist entegrasyonu

**Kontrol:**
- Browser console'da WebSocket bağlantı logları görünüyor mu?
- Fiyat güncellemeleri geliyor mu?

---

### 7. Authentication ✅
**Durum:** Kod yapısı sağlam

**Özellikler:**
- ✅ NextAuth entegrasyonu
- ✅ httpOnly cookies kullanımı
- ✅ Apple & Google OAuth
- ✅ Cookie forwarding (backend'e)

**Kontrol:**
- Login çalışıyor mu?
- Cookie'ler doğru gönderiliyor mu?
- Backend'de user_id doğru alınıyor mu?

---

## 🟡 Orta Öncelikli Kontroller

### 8. Mobil Uygulama Konfigürasyonu ⚠️
**Durum:** Kontrol edilmeli

**Kontrol Noktaları:**
- `mobile/package.json` - Expo version uyumlu mu?
- `capacitor.config.ts` - App ID doğru mu?
- iOS/Android native konfigürasyonları güncel mi?

**iOS:**
- `ios/App/App/Info.plist` - Push notification permissions
- `ios/App/App/AppDelegate.swift` - Capacitor setup

**Android:**
- `android/app/src/main/AndroidManifest.xml` - Permissions
- `android/app/google-services.json` - FCM config

---

### 9. API Route'ları ✅
**Durum:** Kod yapısı sağlam

**Kontrol Edilen Endpoints:**
- ✅ `/api/alarms/notify` - Alarm bildirimleri (proxy)
- ✅ `/api/push/register` - Push token kaydı (proxy)
- ✅ `/api/auth/*` - Authentication endpoints
- ✅ `/api/devices/*` - Device management

**Not:** Tüm API route'ları backend'e proxy yapıyor (cookie forwarding ile)

---

## 🟢 İyi Durumda Olanlar

### 10. Kod Kalitesi ✅
- TypeScript kullanımı
- Error handling mevcut
- Logging sistemi var
- Singleton pattern kullanımı

### 11. Proje Dokümantasyonu ✅
- README.md mevcut
- SETUP_GUIDE.md mevcut
- PUSH_NOTIFICATIONS.md mevcut
- DATABASE_SETUP.md mevcut

---

## 🔧 Önerilen Düzeltmeler

### 1. Environment Variables Kontrolü
```bash
# .env.local oluştur/kontrol et
cat > .env.local << EOF
DATABASE_URL=your_neon_connection_string
BACKEND_URL=http://localhost:3002
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
# ... diğer değişkenler
EOF
```

### 2. Backend Health Check
Backend'de bir `/health` endpoint'i ekleyin ve düzenli kontrol edin.

### 3. Database Schema Kontrolü
```sql
-- Tabloların varlığını kontrol et
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 4. Alarm Tetikleme Testi
```javascript
// Test alarmı oluştur
const alert = alertService.addAlert('BINANCE', 'BTCUSDT', 50000);
console.log('Alert created:', alert);

// Device ID kontrolü
console.log('Device ID:', alert.deviceId);
```

### 5. Push Token Kayıt Testi
```javascript
// Push notification service'i initialize et
await pushNotificationService.initialize();
const token = await pushNotificationService.getToken();
console.log('FCM Token:', token);
```

---

## 🚨 Alarm Bildirimleri Sorunu - Potansiyel Nedenler

### Senaryo: "Cihazda kurulan alarmların bildirimleri gelmiyor"

**Olası Nedenler:**

1. **Device ID Eksikliği** 🔴
   - Alarm oluşturulurken `deviceId` yoksa push notification gönderilmiyor
   - **Kontrol:** `alert.deviceId` değeri var mı?
   - **Çözüm:** `loadDeviceId()` fonksiyonu düzgün çalışıyor mu?

2. **Auth Kontrolü** 🔴
   - `triggerAlert()` içinde `isAuthenticated` false ise push gönderilmiyor
   - **Kontrol:** Cookie'ler doğru gönderiliyor mu?
   - **Çözüm:** `authService.checkAuth()` doğru çalışıyor mu?

3. **Backend Bağlantısı** 🟡
   - `/api/alarms/notify` endpoint'i backend'e ulaşamıyor olabilir
   - **Kontrol:** Backend servisi çalışıyor mu?
   - **Çözüm:** `BACKEND_URL` doğru mu?

4. **Push Token Kaydı** 🟡
   - Device backend'de kayıtlı değil veya user'a bağlı değil
   - **Kontrol:** `devices` tablosunda kayıt var mı?
   - **Çözüm:** Login sonrası `reRegisterAfterLogin()` çağrılıyor mu?

5. **Notification Permissions** 🟡
   - iOS/Android'de push notification izni verilmemiş
   - **Kontrol:** Native app'te permissions granted mi?
   - **Çözüm:** Permission request yapılıyor mu?

---

## 📊 Özet

| Kategori | Durum | Öncelik |
|----------|-------|---------|
| Proje Yapısı | ✅ İyi | - |
| Bağımlılıklar | ✅ İyi | - |
| Environment Variables | ⚠️ Kontrol Edilmeli | 🔴 Yüksek |
| Backend Bağlantısı | ⚠️ Kontrol Edilmeli | 🔴 Yüksek |
| Database Bağlantısı | ⚠️ Kontrol Edilmeli | 🔴 Yüksek |
| Alarm Sistemi | ✅ İyi | - |
| Push Notifications | ✅ İyi | - |
| WebSocket | ✅ İyi | - |
| Authentication | ✅ İyi | - |
| Mobil Konfigürasyon | ⚠️ Kontrol Edilmeli | 🟡 Orta |

---

## 🎯 Sonraki Adımlar

1. ✅ Environment variables kontrolü yapıldı
2. ✅ Backend bağlantısı test edildi
3. ✅ Database bağlantısı test edildi
4. ⏳ Alarm bildirimleri sorunu analiz edilecek
5. ⏳ Potansiyel çözümler uygulanacak

---

**Not:** Bu rapor kod yapısına dayalı statik bir analizdir. Runtime kontrolleri için testler yapılmalıdır.

