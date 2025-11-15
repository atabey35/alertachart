# 🔍 Premium Mobil App Sorunu - Detaylı Analiz

## 📋 Sorun
Mobil app'te Google ile login yapınca database'de premium olan kullanıcı hala free görünüyor.

## 🔄 Mevcut Login Flow

### 1. Mobil App Login (`public/index.html`)
```
Google Sign-In → Backend'e token gönder → accessToken/refreshToken al
→ /capacitor-auth?access_token=...&refresh_token=...
```

### 2. Capacitor Auth Page (`app/capacitor-auth/page.tsx`)
```
URL params'dan token'ları al → /api/auth/set-capacitor-session çağır
→ Cookie'ler set edilir (accessToken, refreshToken)
→ authService.checkAuth() çağrılır
→ / sayfasına redirect
```

### 3. Ana Sayfa (`app/page.tsx`)
```
useSession() hook → status = 'unauthenticated' (NextAuth session yok!)
→ user state = null veya legacy auth user
→ userPlan fetch edilmiyor veya yanlış fetch ediliyor
```

## ❌ SORUN: NextAuth Session Oluşturulmuyor

`/api/auth/set-capacitor-session` sadece backend cookie'lerini set ediyor:
- `accessToken` cookie
- `refreshToken` cookie

Ama **NextAuth session cookie'si (`next-auth.session-token`) oluşturulmuyor!**

Bu yüzden:
- `useSession()` → `status = 'unauthenticated'`
- `session?.user` → `undefined`
- Login sonrası user plan fetch edilmiyor

## ✅ ÇÖZÜM

### Seçenek 1: NextAuth Session Oluştur (ÖNERİLEN)
`/api/auth/set-capacitor-session` endpoint'inde:
1. Backend'den user email'i al
2. NextAuth ile session oluştur
3. `next-auth.session-token` cookie'sini set et

### Seçenek 2: Legacy Auth Kullan
Cookie'ler set edildikten sonra:
1. `authService.checkAuth()` zaten çağrılıyor
2. Ama user plan fetch edilmiyor
3. `user` state güncellendiğinde user plan fetch edilmeli

### Seçenek 3: Hybrid Approach
1. Cookie'ler set edildikten sonra
2. Backend'den user email'i al
3. NextAuth `signIn()` fonksiyonunu kullan (email/password olmadan)
4. Veya direkt NextAuth session oluştur

## 🎯 EN İYİ ÇÖZÜM

`/api/auth/set-capacitor-session` endpoint'ini güncelle:
1. Backend'den user email'i al (zaten alınıyor)
2. NextAuth session oluştur
3. `next-auth.session-token` cookie'sini set et
4. Böylece `useSession()` hook'u `authenticated` döner
5. User plan otomatik fetch edilir

