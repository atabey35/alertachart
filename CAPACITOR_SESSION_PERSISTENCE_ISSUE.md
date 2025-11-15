# Capacitor Native App - Session Persistence Sorunu

## 🔍 Sorun Analizi

**Problem:** Native app'te uygulama kapandığında her seferinde login ekranı geliyor. Session kayboluyor.

## 📋 Mevcut Durum

### 1. Session Oluşturma
- Login sonrası `/api/auth/set-capacitor-session` çağrılıyor
- httpOnly cookie'ler set ediliyor:
  - `accessToken` (15 dakika)
  - `refreshToken` (7 gün)
  - `next-auth.session-token` (30 gün)

### 2. Session Kontrolü
- `app/page.tsx` içinde `useSession()` hook kullanılıyor
- `authService.checkAuth()` çağrılıyor
- Eğer session yoksa login ekranı gösteriliyor

### 3. Sorunun Kök Nedeni

**Android WebView Cookie Persistence:**
- Capacitor WebView'da httpOnly cookie'ler saklanıyor
- Ancak uygulama kapandığında WebView'ın cookie storage'ı temizleniyor olabilir
- Android WebView'da cookie persistence için özel bir ayar gerekebilir

**Olası Nedenler:**
1. **CookieManager ayarları eksik:** Android WebView'da cookie'lerin persist edilmesi için `CookieManager` ayarları gerekli
2. **WebView cache temizleniyor:** Uygulama kapandığında WebView cache'i temizleniyor olabilir
3. **Secure cookie sorunu:** `secure: true` ayarı localhost'ta çalışmıyor olabilir (development)
4. **SameSite ayarı:** `sameSite: 'lax'` bazı durumlarda cookie'lerin kaybolmasına neden olabilir

## ✅ Çözüm Önerileri

### Çözüm 1: Android WebView Cookie Persistence (ÖNERİLEN)

**Dosya:** `android/app/src/main/java/com/kriptokirmizi/alerta/MainActivity.java`

```java
import android.webkit.CookieManager;
import android.webkit.WebView;

@Override
public void onCreate(Bundle savedInstanceState) {
    // ... mevcut kod ...
    
    super.onCreate(savedInstanceState);
    
    // 🔥 CRITICAL: Enable cookie persistence for WebView
    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);
    cookieManager.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
    cookieManager.flush(); // Persist cookies immediately
    
    // ... geri kalan kod ...
}
```

### Çözüm 2: Capacitor Cookie Plugin Kullan

Capacitor'un kendi cookie persistence mekanizması var. `@capacitor/cookies` plugin'ini kullanabilirsiniz.

### Çözüm 3: Session Restore Mekanizması

Uygulama açıldığında, eğer cookie'ler yoksa ama localStorage'da user bilgisi varsa, session'ı yeniden oluştur.

**Dosya:** `app/page.tsx`

```typescript
useEffect(() => {
  // Check if we have a stored user but no session
  const storedUser = localStorage.getItem('user_email');
  if (storedUser && status === 'unauthenticated') {
    // Try to restore session using stored email
    // This would require a new API endpoint
  }
}, [status]);
```

### Çözüm 4: Secure Cookie Ayarını Düzelt

Development'ta `secure: false` kullan, production'da `secure: true`.

**Dosya:** `app/api/auth/set-capacitor-session/route.ts`

```typescript
response.cookies.set('next-auth.session-token', nextAuthToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Zaten var
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
});
```

## 🎯 En İyi Çözüm: Android CookieManager + iOS WKWebView Cookie Persistence

1. **Android WebView'da cookie persistence ayarlarını ekle** ✅ (YAPILDI)
2. **iOS WKWebView'da cookie persistence ayarlarını ekle** (Gerekirse)
3. **Uygulama açılışında session restore mekanizması ekle**
4. **Cookie'ler kaybolursa, refresh token ile session'ı yeniden oluştur**

## ✅ Yapılan Düzeltmeler

### 1. Android: CookieManager + WebSettings Ayarı Eklendi

**Dosya:** `android/app/src/main/java/com/kriptokirmizi/alerta/MainActivity.java`

- `CookieManager` ve `WebSettings` import edildi
- `onCreate()` içinde cookie persistence ayarları eklendi:
  - `setAcceptCookie(true)` - Cookie'leri kabul et
  - `setAcceptThirdPartyCookies(true)` - Üçüncü taraf cookie'leri kabul et (OAuth için)
  - `setDomStorageEnabled(true)` - DOM storage (localStorage) etkinleştir
  - `setDatabaseEnabled(true)` - Database storage etkinleştir
  - `setCacheMode(LOAD_DEFAULT)` - Cache kullan
  - `flush()` - Cookie'leri hemen persist et

### 2. Session Restore Mekanizması Eklendi

**Yeni Dosya:** `app/api/auth/restore-session/route.ts`

- Refresh token cookie'sinden session restore eden endpoint
- Eğer access token geçersizse, refresh token ile yeni access token alır
- NextAuth session cookie'sini yeniden oluşturur

**Dosya:** `app/page.tsx`

- Uygulama açıldığında, eğer session yoksa ama refresh token varsa, otomatik olarak session restore eder
- Sadece Capacitor app'te çalışır (`isCapacitor` kontrolü)

**Dosya:** `app/capacitor-auth/page.tsx`

- Login sonrası user email'i localStorage'a kaydedilir (session restore için)

## 📝 Test Senaryoları

1. **Login yap**
2. **Uygulamayı kapat (tamamen kapat, background'dan değil)**
3. **Uygulamayı tekrar aç**
4. **Session restore edilmeli, login ekranı gelmemeli**

## 🔧 Hızlı Test

Backend loglarında cookie'lerin set edildiğini kontrol et:
```
[set-capacitor-session] All cookies set successfully
```

Uygulama açıldığında cookie'lerin hala var olup olmadığını kontrol et:
- Browser DevTools → Application → Cookies
- Veya backend'de `/api/auth/me` endpoint'ini çağır

