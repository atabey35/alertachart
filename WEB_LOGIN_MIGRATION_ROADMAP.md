# Web Login Migration Roadmap - Native App Login Mimarisi

## 📋 Mevcut Durum Analizi

### Native App Login Mimarisi (public/index.html)
1. **Google Login:**
   - Capacitor GoogleAuth plugin kullanıyor
   - Backend'e direkt istek: `POST /api/auth/google-native`
   - Backend'den `accessToken` ve `refreshToken` alıyor
   - Token'ları `/api/auth/set-capacitor-session` ile cookie'lere set ediyor
   - NextAuth session oluşturuluyor

2. **Apple Login:**
   - Capacitor SignInWithApple plugin kullanıyor
   - Backend'e direkt istek: `POST /api/auth/apple-native`
   - Backend'den `accessToken` ve `refreshToken` alıyor
   - Token'ları `/api/auth/set-capacitor-session` ile cookie'lere set ediyor
   - NextAuth session oluşturuluyor

### Web'deki Mevcut Sistem
1. **NextAuth kullanıyor:**
   - `signIn('google')` → NextAuth Google provider
   - `signIn('apple')` → NextAuth Apple provider
   - OAuth flow NextAuth tarafından yönetiliyor

2. **AuthModal:**
   - Email/password için kullanılıyor
   - OAuth butonları NextAuth'a yönlendiriyor

## 🎯 Hedef: Native App Login Mimarisi Web'e Entegrasyonu

### Adım 1: Web için Google OAuth Entegrasyonu
- [ ] Google OAuth JavaScript SDK (gapi) entegrasyonu
- [ ] Google Sign-In butonu için handler oluştur
- [ ] Backend'e direkt istek: `POST /api/auth/google-native`
- [ ] Token'ları `/api/auth/set-capacitor-session` ile cookie'lere set et

### Adım 2: Web için Apple OAuth Entegrasyonu
- [ ] Apple OAuth JavaScript SDK entegrasyonu
- [ ] Apple Sign-In butonu için handler oluştur
- [ ] Backend'e direkt istek: `POST /api/auth/apple-native`
- [ ] Token'ları `/api/auth/set-capacitor-session` ile cookie'lere set et

### Adım 3: Login Screen Component Güncellemesi
- [ ] `app/page.tsx` içindeki login ekranını güncelle
- [ ] NextAuth `signIn()` çağrılarını kaldır
- [ ] Yeni Google/Apple handler'larını ekle
- [ ] Loading state'leri ekle
- [ ] Error handling ekle

### Adım 4: Token Yönetimi
- [ ] Backend'den gelen token'ları cookie'lere set et
- [ ] NextAuth session oluştur (mevcut `/api/auth/set-capacitor-session` kullan)
- [ ] User state'i güncelle
- [ ] Login ekranını kapat

### Adım 5: Eski Sistem Temizliği
- [ ] NextAuth `signIn()` çağrılarını kaldır
- [ ] AuthModal'dan OAuth butonlarını kaldır (sadece email/password kalsın)
- [ ] Gereksiz NextAuth provider konfigürasyonlarını temizle (opsiyonel)

### Adım 6: Test ve Doğrulama
- [ ] Google login test et
- [ ] Apple login test et
- [ ] Email/password login test et (AuthModal)
- [ ] Session persistence test et
- [ ] Logout test et

## 🔧 Teknik Detaylar

### Google OAuth (Web)
```javascript
// Google OAuth SDK yükle
// https://accounts.google.com/gsi/client

// Sign-In handler
async function handleGoogleLogin() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: 'GOOGLE_CLIENT_ID',
    scope: 'openid email profile',
    callback: async (response) => {
      // Backend'e token gönder
      const backendResponse = await fetch('/api/auth/google-native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: response.credential,
          // ...
        }),
      });
      
      // Token'ları cookie'lere set et
      const { accessToken, refreshToken } = await backendResponse.json();
      await fetch('/api/auth/set-capacitor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
      });
    },
  });
  
  tokenClient.requestAccessToken();
}
```

### Apple OAuth (Web)
```javascript
// Apple OAuth SDK yükle
// https://appleid.apple.com/auth/authorize

async function handleAppleLogin() {
  // Apple OAuth flow
  // Backend'e token gönder
  // Token'ları cookie'lere set et
}
```

## 📝 Notlar
- Backend API'leri zaten mevcut (`/api/auth/google-native`, `/api/auth/apple-native`)
- `/api/auth/set-capacitor-session` endpoint'i zaten mevcut ve NextAuth session oluşturuyor
- Email/password için AuthModal kalacak (eski sistem)
- NextAuth tamamen kaldırılmayacak, sadece OAuth için kullanılmayacak

