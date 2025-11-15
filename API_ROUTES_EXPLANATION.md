# 🔍 Next.js API Routes - Açıklama ve Embedded App Migration

## 📚 Next.js API Routes Nedir?

### Tanım

**Next.js API Routes**, Next.js'in server-side endpoint'leri oluşturmanıza izin veren özelliğidir. Bunlar Node.js server'da çalışan backend endpoint'leridir.

### Örnek

**Dosya:** `app/api/push/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Server-side kod çalışır
  const body = await request.json();
  
  // Backend'e proxy yap
  const response = await fetch('https://backend.com/api/push/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return NextResponse.json(await response.json());
}
```

**Kullanım:**
```typescript
// Client-side (React component)
const response = await fetch('/api/push/register', {
  method: 'POST',
  body: JSON.stringify({ token, deviceId }),
});
```

### Nasıl Çalışır?

```
Client (Browser)
  ↓
fetch('/api/push/register')
  ↓
Next.js Server (Node.js)
  ↓
app/api/push/register/route.ts çalışır
  ↓
Backend API'ye proxy yapar
  ↓
Response döner
```

---

## ❌ Neden Static Export'ta Çalışmaz?

### Static Export Nedir?

**Static Export**, Next.js'in tüm sayfaları statik HTML/CSS/JS dosyalarına dönüştürmesidir. Server-side kod çalıştırmaz.

### Sorun

**API Routes Server-Side Kod Gerektirir:**

```typescript
// app/api/push/register/route.ts
export async function POST(request: NextRequest) {
  // ❌ Bu kod Node.js server'da çalışmalı
  // ❌ Static export'ta server yok!
  const body = await request.json();
  // ...
}
```

**Static Export'ta:**
- ❌ Node.js server yok
- ❌ Server-side kod çalışmaz
- ❌ API routes çalışmaz
- ✅ Sadece static HTML/CSS/JS dosyaları var

### Örnek

**Static Export:**
```
.next/
├── index.html          ✅ Static HTML
├── static/
│   ├── chunks/         ✅ Static JS
│   └── css/            ✅ Static CSS
└── api/                ❌ ÇALIŞMAZ! (Server-side kod)
```

---

## 📊 Mevcut API Routes Analizi

### Mevcut API Routes Listesi

#### 1. Auth Routes
- `app/api/auth/[...nextauth]/route.ts` - NextAuth.js handler
- `app/api/auth/set-capacitor-session/route.ts` - Session set (proxy)
- `app/api/auth/me/route.ts` - User info (proxy)
- `app/api/auth/refresh/route.ts` - Token refresh (proxy)
- `app/api/auth/logout/route.ts` - Logout (proxy)
- `app/api/auth/register/route.ts` - Register (proxy)
- `app/api/auth/restore-session/route.ts` - Session restore (proxy)
- `app/api/auth/google-native/route.ts` - Google auth (proxy)
- `app/api/auth/apple-native/route.ts` - Apple auth (proxy)

#### 2. Push Notification Routes
- `app/api/push/register/route.ts` - Push token register (proxy)

#### 3. Device Routes
- `app/api/devices/link/route.ts` - Device link (proxy)
- `app/api/devices/register-native/route.ts` - Device register (proxy)

#### 4. Subscription Routes
- `app/api/subscription/start-trial/route.ts` - Trial start (proxy)
- `app/api/subscription/trial-status/route.ts` - Trial status (proxy)
- `app/api/subscription/webhook/route.ts` - Webhook handler (server-side)

#### 5. User Routes
- `app/api/user/plan/route.ts` - User plan (proxy)

#### 6. Historical Data Routes
- `app/api/historical/[...params]/route.ts` - Historical data (proxy)

#### 7. Ticker Routes
- `app/api/ticker/[marketType]/route.ts` - Ticker data (proxy)

#### 8. Alarm Routes
- `app/api/alarms/notify/route.ts` - Alarm notification (server-side)

#### 9. Admin Routes
- `app/api/admin/login/route.ts` - Admin login (proxy)
- `app/api/admin/broadcast/route.ts` - Broadcast (server-side)

---

## 🔄 Migration Stratejisi

### Kategori 1: Proxy Routes (Kolay Migration)

**Durum:** Çoğu API route sadece backend'e proxy yapıyor.

**Örnek:**
```typescript
// app/api/push/register/route.ts (Mevcut)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookies = request.headers.get('cookie') || '';
  
  // Backend'e proxy
  const response = await fetch(`${backendUrl}/api/push/register`, {
    method: 'POST',
    headers: { 'Cookie': cookies },
    body: JSON.stringify(body),
  });
  
  return NextResponse.json(await response.json());
}
```

**Migration:**
```typescript
// Client-side (React component)
const response = await fetch('https://alertachart-backend-production.up.railway.app/api/push/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': document.cookie, // Cookies'i manuel gönder
  },
  credentials: 'include', // Cookies için
  body: JSON.stringify({ token, deviceId }),
});
```

**Avantaj:**
- ✅ Basit migration
- ✅ Backend API'leri direkt çağır
- ✅ CORS ayarları gerekli

**Dezavantaj:**
- ⚠️ Cookies manuel gönderilmeli
- ⚠️ CORS ayarları gerekli

---

### Kategori 2: Server-Side Logic (Zor Migration)

**Durum:** Bazı API routes server-side logic içeriyor.

**Örnek 1: NextAuth.js**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Sorun:** NextAuth.js server-side çalışır, static export'ta çalışmaz.

**Çözüm:**
- ❌ NextAuth.js kullanılamaz
- ✅ Custom auth flow (localStorage + backend API)
- ✅ Zaten Capacitor için custom auth kullanıyoruz

**Örnek 2: Webhook Handler**
```typescript
// app/api/subscription/webhook/route.ts
export async function POST(request: NextRequest) {
  // Server-side webhook handling
  // Stripe/Apple webhook'ları buraya gelir
}
```

**Sorun:** Webhook'lar server-side endpoint gerektirir.

**Çözüm:**
- ✅ Webhook handler'ı backend'e taşı
- ✅ Backend'de webhook handling yap

---

## 🔧 Migration Planı

### Adım 1: Proxy Routes Migration

**Hedef:** Tüm proxy routes'ları client-side backend çağrılarına çevir.

**Yapılacaklar:**

1. **API Client Utility Oluştur:**
   ```typescript
   // utils/apiClient.ts
   const BACKEND_URL = 'https://alertachart-backend-production.up.railway.app';
   
   export async function apiCall(endpoint: string, options: RequestInit = {}) {
     const url = `${BACKEND_URL}${endpoint}`;
     const response = await fetch(url, {
       ...options,
       credentials: 'include', // Cookies için
       headers: {
         'Content-Type': 'application/json',
         ...options.headers,
       },
     });
     return response.json();
   }
   ```

2. **Tüm `/api/*` Çağrılarını Değiştir:**
   ```typescript
   // Önce: fetch('/api/push/register', ...)
   // Sonra: apiCall('/api/push/register', ...)
   ```

3. **CORS Ayarları:**
   - Backend'de CORS ayarları yap
   - `Access-Control-Allow-Origin: *` veya specific domain
   - `Access-Control-Allow-Credentials: true` (cookies için)

---

### Adım 2: Server-Side Logic Migration

**Hedef:** Server-side logic'i backend'e taşı veya client-side'a çevir.

**Yapılacaklar:**

1. **NextAuth.js Kaldır:**
   - Zaten Capacitor için custom auth kullanıyoruz
   - NextAuth.js sadece web için kullanılıyor
   - Web için de custom auth kullanabiliriz

2. **Webhook Handler Backend'e Taşı:**
   - `app/api/subscription/webhook/route.ts` → Backend'e taşı
   - Backend'de webhook handling yap

3. **Admin Routes:**
   - Admin routes'ları backend'e taşı
   - Veya admin panel'i ayrı bir Next.js app olarak tut

---

## 📋 Detaylı Migration Listesi

### Proxy Routes (Kolay)

| API Route | Backend Endpoint | Migration |
|-----------|------------------|-----------|
| `/api/push/register` | `/api/push/register` | ✅ Direkt backend çağır |
| `/api/devices/link` | `/api/devices/link` | ✅ Direkt backend çağır |
| `/api/devices/register-native` | `/api/devices/register-native` | ✅ Direkt backend çağır |
| `/api/auth/set-capacitor-session` | `/api/auth/set-capacitor-session` | ✅ Direkt backend çağır |
| `/api/auth/me` | `/api/auth/me` | ✅ Direkt backend çağır |
| `/api/auth/refresh` | `/api/auth/refresh` | ✅ Direkt backend çağır |
| `/api/auth/logout` | `/api/auth/logout` | ✅ Direkt backend çağır |
| `/api/auth/register` | `/api/auth/register` | ✅ Direkt backend çağır |
| `/api/user/plan` | `/api/user/plan` | ✅ Direkt backend çağır |
| `/api/subscription/start-trial` | `/api/subscription/start-trial` | ✅ Direkt backend çağır |
| `/api/subscription/trial-status` | `/api/subscription/trial-status` | ✅ Direkt backend çağır |
| `/api/historical/[...params]` | `/api/historical/[...params]` | ✅ Direkt backend çağır |
| `/api/ticker/[marketType]` | `/api/ticker/[marketType]` | ✅ Direkt backend çağır |

### Server-Side Logic (Zor)

| API Route | Durum | Migration |
|-----------|-------|-----------|
| `/api/auth/[...nextauth]` | NextAuth.js | ❌ Kaldır, custom auth kullan |
| `/api/subscription/webhook` | Webhook handler | ✅ Backend'e taşı |
| `/api/alarms/notify` | Server-side logic | ⚠️ İncele, backend'e taşı |
| `/api/admin/login` | Admin auth | ⚠️ Backend'e taşı veya ayrı app |
| `/api/admin/broadcast` | Server-side | ⚠️ Backend'e taşı |

---

## 🔍 Örnek Migration

### Örnek 1: Push Register

**Mevcut (API Route):**
```typescript
// app/api/push/register/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookies = request.headers.get('cookie') || '';
  
  const response = await fetch(`${backendUrl}/api/push/register`, {
    method: 'POST',
    headers: { 'Cookie': cookies },
    body: JSON.stringify(body),
  });
  
  return NextResponse.json(await response.json());
}

// Client-side kullanım
const response = await fetch('/api/push/register', {
  method: 'POST',
  body: JSON.stringify({ token, deviceId }),
});
```

**Yeni (Direct Backend Call):**
```typescript
// Client-side (React component)
const BACKEND_URL = 'https://alertachart-backend-production.up.railway.app';

const response = await fetch(`${BACKEND_URL}/api/push/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Cookies için
  body: JSON.stringify({ token, deviceId }),
});

const result = await response.json();
```

**Değişiklik:**
- ✅ `/api/push/register` → `${BACKEND_URL}/api/push/register`
- ✅ `credentials: 'include'` eklendi (cookies için)
- ✅ API route kaldırıldı

---

### Örnek 2: Set Capacitor Session

**Mevcut (API Route):**
```typescript
// app/api/auth/set-capacitor-session/route.ts
export async function POST(request: NextRequest) {
  const { accessToken, refreshToken } = await request.json();
  
  // Set cookies
  const response = NextResponse.json({ success: true });
  response.cookies.set('accessToken', accessToken, { httpOnly: true });
  response.cookies.set('refreshToken', refreshToken, { httpOnly: true });
  
  return response;
}

// Client-side kullanım
await fetch('/api/auth/set-capacitor-session', {
  method: 'POST',
  body: JSON.stringify({ accessToken, refreshToken }),
});
```

**Yeni (Direct Backend Call):**
```typescript
// Client-side
const BACKEND_URL = 'https://alertachart-backend-production.up.railway.app';

// Backend'de set-capacitor-session endpoint'i olmalı
await fetch(`${BACKEND_URL}/api/auth/set-capacitor-session`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ accessToken, refreshToken }),
});

// Veya localStorage kullan (daha basit)
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

**Değişiklik:**
- ✅ Backend'de endpoint oluştur VEYA
- ✅ localStorage kullan (daha basit)

---

## ⚠️ Önemli Notlar

### 1. Cookies Sorunu

**Sorun:** API routes cookies'i otomatik forward ediyordu.

**Çözüm:**
```typescript
// API route (server-side)
const cookies = request.headers.get('cookie') || '';
fetch(backendUrl, {
  headers: { 'Cookie': cookies }, // ✅ Otomatik forward
});

// Direct backend call (client-side)
fetch(backendUrl, {
  credentials: 'include', // ✅ Cookies otomatik gönderilir
});
```

**Not:** `credentials: 'include'` ile cookies otomatik gönderilir, ama backend'de CORS ayarları gerekli.

---

### 2. CORS Ayarları

**Backend'de CORS ayarları yapılmalı:**

```typescript
// Backend (Express.js örneği)
app.use(cors({
  origin: ['https://alertachart.com', 'capacitor://localhost'],
  credentials: true, // Cookies için
}));
```

---

### 3. Environment Variables

**Sorun:** API routes `process.env` kullanıyordu.

**Çözüm:**
```typescript
// Client-side (build-time)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 
                    'https://alertachart-backend-production.up.railway.app';
```

**Not:** `NEXT_PUBLIC_*` prefix'i gerekli (client-side erişim için).

---

## 📊 Migration Checklist

### ✅ Faz 1: API Client Utility
- [ ] `utils/apiClient.ts` oluştur
- [ ] Backend URL constant
- [ ] CORS ayarları

### ✅ Faz 2: Proxy Routes Migration
- [ ] `/api/push/register` → Direct backend call
- [ ] `/api/devices/link` → Direct backend call
- [ ] `/api/devices/register-native` → Direct backend call
- [ ] `/api/auth/set-capacitor-session` → Direct backend call
- [ ] `/api/auth/me` → Direct backend call
- [ ] `/api/auth/refresh` → Direct backend call
- [ ] `/api/auth/logout` → Direct backend call
- [ ] `/api/auth/register` → Direct backend call
- [ ] `/api/user/plan` → Direct backend call
- [ ] `/api/subscription/start-trial` → Direct backend call
- [ ] `/api/subscription/trial-status` → Direct backend call
- [ ] `/api/historical/[...params]` → Direct backend call
- [ ] `/api/ticker/[marketType]` → Direct backend call

### ✅ Faz 3: Server-Side Logic Migration
- [ ] NextAuth.js kaldır veya ayrı tut
- [ ] Webhook handler backend'e taşı
- [ ] Admin routes backend'e taşı
- [ ] Alarm notify backend'e taşı

### ✅ Faz 4: Testing
- [ ] Tüm API çağrıları test et
- [ ] Cookies çalışıyor mu?
- [ ] CORS ayarları doğru mu?
- [ ] Backend API'leri çalışıyor mu?

---

## 🎯 Özet

### API Routes Nedir?

**Next.js API Routes**, server-side endpoint'lerdir. Node.js server'da çalışırlar.

### Neden Static Export'ta Çalışmaz?

**Static Export**, sadece static HTML/CSS/JS dosyaları üretir. Server-side kod çalıştırmaz.

### Nasıl Çözeriz?

1. **Proxy Routes:** Direkt backend API'lerini çağır
2. **Server-Side Logic:** Backend'e taşı veya client-side'a çevir
3. **CORS:** Backend'de CORS ayarları yap

### Sonuç

- ✅ API routes kaldırılabilir
- ✅ Backend API'leri direkt çağrılabilir
- ✅ CORS ayarları gerekli
- ✅ Cookies `credentials: 'include'` ile çalışır

---

**Son Güncelleme:** 2025-11-15  
**Durum:** Açıklama Tamamlandı

