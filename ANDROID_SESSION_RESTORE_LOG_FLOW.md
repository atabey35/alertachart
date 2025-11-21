# Android Session Restore - Beklenen Log Akışı

## Test Senaryosu
1. ✅ Uygulamayı aç
2. ✅ Login ol
3. ✅ Arka planda kaydırarak kapat (swipe away)
4. ✅ Tekrar aç
5. ✅ Settings'e git

---

## 1. UYGULAMAYI AÇ (İlk Açılış - Login Öncesi)

### Beklenen Log'lar:

```
[App] Capacitor detected: true
[App] 🔄 Checking for session restore (status: loading/unauthenticated)...
[App] ℹ️ No saved email in localStorage, but attempting session restore anyway (cookies may exist)...
[App] ⚠️ Could not get refreshToken from Preferences
```

**Kontrol Noktası:**
- ✅ Capacitor tespit edildi mi?
- ✅ Session restore çalıştı mı?
- ⚠️ refreshToken Preferences'da var mı? (İlk açılışta olmamalı)

---

## 2. LOGIN OL (AndroidLogin.tsx)

### Beklenen Log'lar:

```
[AndroidLogin] ✅ Native platform detected: android
[AndroidLogin] ✅ GoogleAuth plugin initialized successfully
[AndroidLogin] ✅ Google Sign-In success
[AndroidLogin] ✅ Backend auth successful, has tokens: true
[AndroidLogin] ✅ Session set successfully
[AndroidLogin] ✅ User email saved to localStorage for session restore: <email>
[AndroidLogin] ✅ AccessToken saved to Preferences
[AndroidLogin] ✅ RefreshToken saved to Preferences
```

**Kontrol Noktası:**
- ✅ Token'lar Preferences'a kaydedildi mi?
- ✅ user_email localStorage'a kaydedildi mi?
- ⚠️ Session cookie'leri set edildi mi?

**SONRA:**
```
router.push('/');
window.location.reload();
```

**⚠️ POTANSİYEL SORUN:**
- `window.location.reload()` çok hızlı tetikleniyor olabilir
- Token'lar Preferences'a kaydedilmeden reload olabilir

---

## 3. ARKA PLANA KAYDIRARAK KAPAT (Swipe Away)

**Ne Olur:**
- ❌ Cookie'ler kaybolur (Android WebView davranışı)
- ✅ Preferences token'ları kalır (persistent storage)
- ✅ localStorage `user_email` kalır

---

## 4. TEKRAR AÇ (App Restore)

### Beklenen Log'lar:

```
[App] Capacitor detected: true
[App] 🔄 Checking for session restore (status: loading/unauthenticated)...
[App] 📧 Saved email found: <email> - attempting session restore...
[App] ✅ RefreshToken found in Preferences (Android)
[App] 📱 Android: Saved email found, restoring session immediately...
```

**300ms sonra:**
```
[App] ✅ Session restored successfully: { user: {...}, tokens: {...} }
[App] ✅ AccessToken saved to Preferences (Android)
[App] ✅ RefreshToken saved to Preferences (Android)
[App] ✅ User email saved to localStorage for future checks
[App] ✅ NextAuth session updated - no reload needed
```

**Kontrol Noktası:**
- ✅ refreshToken Preferences'dan okundu mu?
- ✅ restore-session API başarılı mı?
- ✅ Yeni token'lar Preferences'a kaydedildi mi?
- ⚠️ NextAuth session update başarılı mı?

**⚠️ POTANSİYEL SORUN:**
- `status` hâlâ `'loading'` veya `'unauthenticated'` olabilir
- NextAuth session update başarısız olabilir
- `authService.checkAuth()` token'ı bulamayabilir

---

## 5. SETTINGS'E GİT

### Beklenen Log'lar:

```
[Settings] Final platform detection: { isCapacitor: true, ... }
[Settings] 📱 Android: Attempting session restore... { status: 'authenticated'/'loading', hasUser: true/false, savedEmail: '<email>' }
```

**Eğer session yoksa:**
```
[Settings] ✅ RefreshToken found in Preferences
[Settings] ✅ Session restored successfully: { user: {...}, tokens: {...} }
[Settings] ✅ AccessToken saved to Preferences (Android)
[Settings] ✅ RefreshToken saved to Preferences (Android)
[Settings] ✅ NextAuth session updated
[Settings] ✅ User state manually set from restore result
[Settings] ✅ authService.checkAuth() called
```

**Eğer session varsa:**
```
[Settings] ℹ️ Session exists, no restore needed
```

**Kontrol Noktası:**
- ✅ Settings sayfası mount olduğunda session restore çalıştı mı?
- ✅ Token'lar Preferences'dan okundu mu?
- ✅ User state set edildi mi?
- ⚠️ "Continue with Google" butonu hâlâ görünüyor mu? (Sorun işareti!)

---

## 🔴 KRİTİK SORUN NOKTALARI

### 1. Login Sonrası Reload Timing
**Dosya:** `components/login/AndroidLogin.tsx:229-230`
```typescript
router.push('/');
window.location.reload(); // ⚠️ Çok hızlı!
```

**Sorun:**
- Token'lar Preferences'a kaydedilmeden reload olabilir
- Session cookie'leri set edilmeden reload olabilir

**Beklenen Log:**
```
[AndroidLogin] ✅ AccessToken saved to Preferences
[AndroidLogin] ✅ RefreshToken saved to Preferences
// ⚠️ Bu log'lardan SONRA reload olmalı!
```

---

### 2. Session Restore Timing
**Dosya:** `app/page.tsx:482-485`
```typescript
if (platform === 'android' && savedEmail) {
  setTimeout(restoreSession, 300); // ⚠️ 300ms yeterli mi?
}
```

**Sorun:**
- 300ms içinde Preferences'dan token okunamayabilir
- WebView tam hazır olmayabilir

**Beklenen Log:**
```
[App] ✅ RefreshToken found in Preferences (Android)
// ⚠️ Bu log görünmüyorsa, Preferences okuma başarısız!
```

---

### 3. Settings Session Restore
**Dosya:** `app/settings/page.tsx:169`
```typescript
const shouldRestore = (status === 'unauthenticated' || status === 'loading') || !user;
```

**Sorun:**
- `status === 'authenticated'` ama `user === null` olabilir
- Bu durumda restore çalışmayabilir

**Beklenen Log:**
```
[Settings] 📱 Android: Attempting session restore... { status: 'authenticated', hasUser: false }
// ⚠️ Eğer bu log görünmüyorsa, shouldRestore false dönüyor!
```

---

### 4. authService.checkAuth() Android Token Okuma
**Dosya:** `services/authService.ts:72-79`
```typescript
if (isAndroid) {
  const accessToken = await this.getAccessTokenFromPreferences();
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  }
}
```

**Sorun:**
- Preferences'dan token okunamayabilir
- Token henüz kaydedilmemiş olabilir

**Beklenen Log:**
```
[AuthService] ✅ Using Preferences accessToken for Android
// ⚠️ Eğer bu log görünmüyorsa, token Preferences'da yok!
```

---

## 📋 TEST SIRASINDA KONTROL EDİLECEKLER

1. **Login Sonrası:**
   - ✅ Token'lar Preferences'a kaydedildi mi?
   - ✅ `user_email` localStorage'a kaydedildi mi?
   - ⚠️ Reload timing doğru mu?

2. **App Restore:**
   - ✅ refreshToken Preferences'dan okundu mu?
   - ✅ restore-session API başarılı mı?
   - ✅ NextAuth session update başarılı mı?
   - ⚠️ `status` `'authenticated'` oldu mu?

3. **Settings:**
   - ✅ Session restore çalıştı mı?
   - ✅ User state set edildi mi?
   - ⚠️ "Continue with Google" butonu görünüyor mu?

---

## 🎯 SORUN TESPİTİ İÇİN LOG PATTERN'LERİ

### Pattern 1: Token Preferences'a Kaydedilmiyor
```
[AndroidLogin] ✅ AccessToken saved to Preferences
[AndroidLogin] ✅ RefreshToken saved to Preferences
// ⚠️ Bu log'lar görünmüyorsa → Preferences kayıt başarısız!
```

### Pattern 2: Token Preferences'dan Okunamıyor
```
[App] ⚠️ Could not get refreshToken from Preferences
// ⚠️ Bu log görünüyorsa → Preferences okuma başarısız!
```

### Pattern 3: Session Restore Başarısız
```
[App] ⚠️ Session restore failed: { error: ... }
// ⚠️ Bu log görünüyorsa → restore-session API başarısız!
```

### Pattern 4: NextAuth Session Update Başarısız
```
[App] ⚠️ Failed to update NextAuth session: ...
// ⚠️ Bu log görünüyorsa → NextAuth session update başarısız!
```

### Pattern 5: Settings'te Session Restore Çalışmıyor
```
[Settings] ℹ️ Session exists, no restore needed
// ⚠️ Ama "Continue with Google" görünüyorsa → shouldRestore logic yanlış!
```

---

## 🔍 DEBUG İÇİN EK LOG'LAR GEREKLİ Mİ?

Eğer sorun tespit edilemezse, şu log'lar eklenebilir:

1. **Preferences Read/Write Timing:**
   ```typescript
   console.log('[DEBUG] Preferences write start:', Date.now());
   await Preferences.set(...);
   console.log('[DEBUG] Preferences write end:', Date.now());
   ```

2. **Session Status Tracking:**
   ```typescript
   console.log('[DEBUG] Session status before restore:', status);
   console.log('[DEBUG] Session status after restore:', status);
   ```

3. **Token Validation:**
   ```typescript
   console.log('[DEBUG] Token length:', accessToken?.length);
   console.log('[DEBUG] Token preview:', accessToken?.substring(0, 20));
   ```

