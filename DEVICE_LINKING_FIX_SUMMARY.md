# Device Linking ve FCM Token Sorunları - Çözüm Özeti

**Tarih:** 19 Kasım 2025  
**Durum:** ✅ Tüm sorunlar çözüldü

---

## 📋 Sorun Özeti

### Ana Sorunlar

1. **Device Linking Başarısız**
   - Login sonrası cihazlar kullanıcıya bağlanmıyordu
   - PostgreSQL hatası: `could not determine data type of parameter $8/$13`
   - Birden fazla premium kullanıcı olmasına rağmen bildirimler sadece 1 cihaza gidiyordu

2. **FCM Token localStorage'a Kaydedilmiyordu**
   - AppDelegate FCM token'ı JavaScript'e gönderiyordu ama localStorage'a kaydedilmiyordu
   - Settings sayfası token'ı bulamıyordu

3. **Reload Döngüsü**
   - Session restore sonrası sürekli reload oluyordu
   - Sayfa sürekli yenileniyordu

4. **Next.js API Route Eksik Parametreler**
   - Device link endpoint'i sadece `deviceId` gönderiyordu
   - `pushToken` ve `platform` parametreleri backend'e ulaşmıyordu

---

## 🔧 Yapılan Düzeltmeler

### 1. PostgreSQL Tip Hatası Düzeltmesi

**Sorun:** `could not determine data type of parameter $8/$13`

**Neden:**
- PostgreSQL, CASE WHEN ifadelerindeki parametrelerin tipini çıkaramıyordu
- `appVersion`, `platform`, `model`, `osVersion`, `userId` parametreleri için explicit cast yoktu

**Çözüm:**
- Tüm string parametrelere `::text` cast'i eklendi
- `userId` için `::integer` cast'i eklendi
- CASE WHEN ifadelerinde hem WHEN hem THEN kısımlarında cast eklendi

**Dosya:** `/Users/ata/Desktop/alertachart-backend/src/lib/push/db.js`

**Değişiklikler:**
```javascript
// INSERT kısmı
INSERT INTO devices (device_id, expo_push_token, platform, app_version, user_id, model, os_version, updated_at)
VALUES (
  ${deviceId}, 
  ${expoPushToken}, 
  ${platform}::text,           // ✅ Cast eklendi
  ${appVersion || '1.0.0'}::text, // ✅ Cast eklendi
  ${userId}, 
  ${model || null}::text,       // ✅ Cast eklendi
  ${osVersion || null}::text,   // ✅ Cast eklendi
  CURRENT_TIMESTAMP
)

// UPDATE kısmı
ON CONFLICT (device_id)
DO UPDATE SET
  expo_push_token = CASE 
    WHEN ${expoPushToken}::text IS NOT NULL THEN ${expoPushToken}::text  // ✅ Cast eklendi
    ELSE devices.expo_push_token
  END,
  platform = ${platform}::text,  // ✅ Cast eklendi
  app_version = CASE 
    WHEN ${appVersion}::text IS NOT NULL THEN ${appVersion}::text  // ✅ Cast eklendi
    ELSE devices.app_version
  END,
  user_id = CASE 
    WHEN ${userId}::integer IS NOT NULL THEN ${userId}::integer  // ✅ Cast eklendi
    ELSE devices.user_id
  END,
  model = CASE 
    WHEN ${model}::text IS NOT NULL THEN ${model}::text  // ✅ Cast eklendi
    ELSE devices.model
  END,
  os_version = CASE 
    WHEN ${osVersion}::text IS NOT NULL THEN ${osVersion}::text  // ✅ Cast eklendi
    ELSE devices.os_version
  END
```

**Commit:** `8653c69` - "fix: Add integer cast for userId parameter in CASE WHEN clause"

---

### 2. FCM Token localStorage Key Mismatch

**Sorun:** FCM token localStorage'a kaydedilmiyordu

**Neden:**
- AppDelegate `fcm_token_from_appdelegate` olarak kaydediyordu
- Settings sayfası `fcm_token` arıyordu
- Key uyumsuzluğu vardı

**Çözüm:**
- AppDelegate artık her iki key'i de kaydediyor:
  - `fcm_token` (ana key - Settings sayfası bunu kullanıyor)
  - `fcm_token_from_appdelegate` (fallback - uyumluluk için)

**Dosya:** `/Users/ata/Desktop/alertachart/ios/App/App/AppDelegate.swift`

**Değişiklikler:**
```swift
// Main key that Settings page uses
localStorage.setItem('fcm_token', token);
console.log('[AppDelegate] ✅ Token stored in localStorage as fcm_token');

// Fallback key for compatibility
localStorage.setItem('fcm_token_from_appdelegate', token);
console.log('[AppDelegate] ✅ Token stored in localStorage as fcm_token_from_appdelegate (fallback)');
```

**Commit:** `71eb996` - "fix: FCM token localStorage key mismatch and reload loop"

---

### 3. Reload Döngüsü Düzeltmesi

**Sorun:** Session restore sonrası sürekli reload oluyordu

**Neden:**
- Session restore başarılı olduğunda reload yapılıyordu
- Reload sonrası tekrar restore yapılıyordu ve döngü oluşuyordu

**Çözüm:**
- `sessionStorage` flag'i eklendi
- Session restore başarılı olduğunda `sessionRestoreCompleted = true` set ediliyor
- Reload sonrası restore tekrar yapılmıyor

**Dosya:** `/Users/ata/Desktop/alertachart/app/settings/page.tsx`

**Değişiklikler:**
```typescript
const tryRestoreSession = async () => {
  // 🔥 FIX: Prevent reload loop - check if session restore was already completed
  const sessionRestoreCompleted = sessionStorage.getItem('sessionRestoreCompleted');
  if (sessionRestoreCompleted === 'true') {
    console.log('[Settings] ℹ️ Session restore already completed, skipping to prevent reload loop');
    return;
  }
  
  // ... restore logic ...
  
  if (httpResponse.status === 200) {
    // 🔥 FIX: Mark session restore as completed before reload to prevent loop
    sessionStorage.setItem('sessionRestoreCompleted', 'true');
    
    // Refresh the page to update session state
    window.location.reload();
  }
};
```

**Commit:** `71eb996` - "fix: FCM token localStorage key mismatch and reload loop"

---

### 4. Next.js API Route Parametre Eksikliği

**Sorun:** Device link endpoint'i sadece `deviceId` gönderiyordu

**Neden:**
- Next.js API route (`/api/devices/link`) sadece `deviceId`'yi backend'e forward ediyordu
- `pushToken` ve `platform` parametreleri gönderilmiyordu
- Backend'de bu parametreler `null` oluyordu ve PostgreSQL tip hatası oluşuyordu

**Çözüm:**
- Next.js API route artık tüm parametreleri (`deviceId`, `pushToken`, `platform`) backend'e forward ediyor

**Dosya:** `/Users/ata/Desktop/alertachart/app/api/devices/link/route.ts`

**Değişiklikler:**
```typescript
const { deviceId, pushToken, platform } = body;

// 🔥 FIX: Forward all device linking parameters to backend
const response = await fetch(`${backendUrl}/api/devices/link`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ 
    deviceId,
    pushToken: pushToken || undefined, // Only send if exists
    platform: platform || undefined, // Only send if exists
  }),
});
```

**Commit:** `6989484` - "fix: Forward pushToken and platform to backend in device link API"

---

### 5. Otomatik Token Refresh Mekanizması Kaldırıldı

**Sorun:** Kullanıcı otomatik refresh mekanizmasını kaldırmak istedi

**Çözüm:**
- `/api/auth/me` endpoint'inden otomatik refresh kaldırıldı
- `authenticateToken` middleware'den otomatik refresh kaldırıldı
- Artık token expired olduğunda kullanıcı tekrar login olmalı

**Dosyalar:**
- `/Users/ata/Desktop/alertachart-backend/src/routes/auth.js`
- `/Users/ata/Desktop/alertachart-backend/src/lib/auth/middleware.js`

**Değişiklikler:**
- Otomatik refresh logic'i kaldırıldı (~200 satır kod)
- Token expired/invalid ise direkt 401/403 döner
- Refresh token kullanarak otomatik refresh yapılmaz

**Commit:** `00b0e41` - "remove: Automatic token refresh mechanism"

---

## ✅ Test Sonuçları

### Başarılı Testler

1. **FCM Token localStorage'a Kaydediliyor:**
   ```
   [AppDelegate] ✅ Token stored in localStorage as fcm_token
   [Settings] 🔍 localStorage check: {"hasToken":true,"tokenLength":142,...}
   ```

2. **Device Registration Başarılı:**
   ```
   [Settings] ✅ Token registered with backend: {"success":true,"device":{"deviceId":"40FE822B-C7AA-436D-8D37-2645652E599B","platform":"ios",...}}
   ```

3. **Device Linking Başarılı:**
   ```
   [Settings] ✅ Device linked to user: {"success":true,"device":{"deviceId":"40FE822B-C7AA-436D-8D37-2645652E599B","platform":"ios","userId":121,"linkedAt":"2025-11-19T00:00:23.535Z","hasValidToken":true}}
   ```

4. **PostgreSQL Tip Hatası Çözüldü:**
   - `could not determine data type of parameter $8/$13` hatası artık yok
   - Tüm parametreler doğru cast ediliyor

---

## 📁 Değiştirilen Dosyalar

### Backend
1. `/Users/ata/Desktop/alertachart-backend/src/lib/push/db.js`
   - `upsertDevice` fonksiyonunda tüm parametrelere explicit cast eklendi
   - PostgreSQL tip inference sorunları çözüldü

2. `/Users/ata/Desktop/alertachart-backend/src/routes/auth.js`
   - Otomatik token refresh mekanizması kaldırıldı
   - Token validation iyileştirildi

3. `/Users/ata/Desktop/alertachart-backend/src/lib/auth/middleware.js`
   - Otomatik token refresh mekanizması kaldırıldı
   - Basitleştirildi

### Frontend
1. `/Users/ata/Desktop/alertachart/app/api/devices/link/route.ts`
   - `pushToken` ve `platform` parametreleri backend'e forward ediliyor

2. `/Users/ata/Desktop/alertachart/app/settings/page.tsx`
   - Reload döngüsü önlendi (sessionStorage flag)
   - FCM token localStorage'dan doğru key ile okunuyor

### iOS
1. `/Users/ata/Desktop/alertachart/ios/App/App/AppDelegate.swift`
   - FCM token artık hem `fcm_token` hem de `fcm_token_from_appdelegate` olarak kaydediliyor
   - Verification kodu güncellendi

---

## 🔄 Git Commit'leri

1. `6989484` - "fix: Forward pushToken and platform to backend in device link API"
2. `71eb996` - "fix: FCM token localStorage key mismatch and reload loop"
3. `fc11558` - "fix: Add explicit text casts for all string parameters in upsertDevice"
4. `349e5cb` - "fix: Add explicit text casts in CASE WHEN clauses for PostgreSQL type inference"
5. `8653c69` - "fix: Add integer cast for userId parameter in CASE WHEN clause"
6. `00b0e41` - "remove: Automatic token refresh mechanism"

---

## 📊 Sonuç

### Önceki Durum
- ❌ Device linking başarısız (PostgreSQL tip hatası)
- ❌ FCM token localStorage'a kaydedilmiyordu
- ❌ Reload döngüsü vardı
- ❌ Otomatik refresh mekanizması vardı

### Şimdiki Durum
- ✅ Device linking başarılı
- ✅ FCM token localStorage'a kaydediliyor
- ✅ Reload döngüsü yok
- ✅ Otomatik refresh mekanizması kaldırıldı
- ✅ Tüm premium kullanıcıların cihazlarına bildirim gönderilebilir

---

## 🎯 Önemli Notlar

1. **PostgreSQL Tip Inference:**
   - Neon DB (PostgreSQL) kullanıyoruz
   - CASE WHEN ifadelerinde parametreler için explicit cast gerekli
   - Tüm string parametreler için `::text`, integer için `::integer` cast'i kullanılmalı

2. **FCM Token Storage:**
   - AppDelegate hem `fcm_token` hem de `fcm_token_from_appdelegate` olarak kaydediyor
   - Settings sayfası `fcm_token` key'ini kullanıyor
   - Fallback mekanizması uyumluluk için korunuyor

3. **Device Linking Flow:**
   - Login sonrası otomatik olarak device linking yapılıyor
   - `pushToken` ve `platform` parametreleri backend'e gönderiliyor
   - Backend'de `upsertDevice` fonksiyonu device'ı kullanıcıya bağlıyor

4. **Token Management:**
   - Otomatik refresh mekanizması kaldırıldı
   - Token expired olduğunda kullanıcı tekrar login olmalı
   - Daha basit ve öngörülebilir bir authentication flow

---

## 🚀 Deployment

Tüm değişiklikler Railway'de deploy edildi:
- Backend: `alertachart-backend-production.up.railway.app`
- Frontend: `alertachart.com` (Vercel)

---

**Son Güncelleme:** 19 Kasım 2025  
**Durum:** ✅ Tüm sorunlar çözüldü ve test edildi

