# 🏗️ Alerta Chart - Sistem Mimarisi ve Bağımlılıklar

## 📋 İçindekiler

1. [Genel Sistem Mimarisi](#1-genel-sistem-mimarisi)
2. [Frontend Çalışma Bağımlılığı](#2-frontend-çalışma-bağımlılığı)
3. [Backend Çalışma Bağımlılığı ve Sistem Mantığı](#3-backend-çalışma-bağımlılığı-ve-sistem-mantığı)
4. [Aggr ve Liquidation Sistemlerinin Bağlantısı](#4-aggr-ve-liquidation-sistemlerinin-bağlantısı)
5. [Database Mimarisi ve Bağımlılığı](#5-database-mimarisi-ve-bağımlılığı)
6. [Sistem Akış Diyagramları](#6-sistem-akış-diyagramları)

---

## 1. GENEL SİSTEM MİMARİSİ

### 1.1. Platform Dağılımı

```
┌─────────────────────────────────────────────────────────────┐
│                    ALERTA CHART SİSTEMİ                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐    ┌──────────────────────┐
│   FRONTEND (Vercel)  │    │  BACKEND (Railway)   │
│  www.alertachart.com │◄───┤ alertachart-backend  │
│   Next.js 15         │    │  Express.js          │
│   Vercel Pro         │    │  Railway             │
└──────────────────────┘    └──────────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│  DATA PLATFORM       │    │  AGGREGATOR PLATFORM  │
│  data.alertachart.com│    │  aggr.alertachart.com│
│  Next.js (Railway)   │    │  Vue.js + Vite       │
│  kkterminal-main     │    │  kkaggr-main         │
└──────────────────────┘    └──────────────────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌──────────────────────┐
         │   DATABASE (Railway) │
         │   PostgreSQL         │
         │   Railway PostgreSQL │
         └──────────────────────┘
```

### 1.2. Domain Yapısı

| Domain | Platform | Proje | Açıklama |
|--------|----------|-------|----------|
| `www.alertachart.com` | Next.js 15 (Vercel) | alertachart | Ana frontend - Charting platform |
| `alertachart-backend-production.up.railway.app` | Express.js (Railway) | alertachart-backend | Backend API - Auth, Push, Alerts |
| `data.alertachart.com` | Next.js (Railway) | kkterminal-main | Liquidation tracker, whale alerts |
| `aggr.alertachart.com` | Vue.js + Vite (Railway) | kkaggr-main | Aggregated exchange trades |

---

## 2. FRONTEND ÇALIŞMA BAĞIMLILIĞI

### 2.1. Frontend Bağımlılıkları

**Platform:** Next.js 15 (Vercel Pro - $20/ay)
**Domain:** `www.alertachart.com`

#### 2.1.1. Backend Bağımlılığı

Frontend, tüm API çağrılarını **Railway Backend**'e proxy yapıyor:

**Backend URL:**
```typescript
const backendUrl = process.env.BACKEND_URL || 
                  process.env.NEXT_PUBLIC_BACKEND_URL || 
                  'https://alertachart-backend-production.up.railway.app';
```

**Proxy Yapılan Endpoint'ler:**

1. **Auth Endpoints:**
   - `/api/auth/login` → Backend'e proxy
   - `/api/auth/me` → Backend'e proxy
   - `/api/auth/restore-session` → Backend'e proxy

2. **Push Notification Endpoints:**
   - `/api/push/register` → Backend'e proxy
   - `/api/push/unregister` → Backend'e proxy
   - `/api/alarms/notify` → Backend'e proxy

3. **Ticker Data:**
   - `/api/ticker/[marketType]` → Backend'e proxy
   - Backend 15 saniye cache yapıyor

4. **Historical Data:**
   - `/api/historical/[...params]` → Backend'e proxy (Railway backend)
   - Fallback: Next.js API route (Binance API'ye direkt)

**Örnek Proxy Kodu:**
```typescript
// app/api/ticker/[marketType]/route.ts
const backendUrl = process.env.BACKEND_URL || 
                  'https://alertachart-backend-production.up.railway.app';
const url = `${backendUrl}/api/ticker/${marketType}?symbols=${symbols}`;

const response = await fetch(url, {
  next: { revalidate: 5 } // Cache for 5 seconds
});
```

#### 2.1.2. Database Bağımlılığı

Frontend, **doğrudan database'e bağlanıyor** (Railway PostgreSQL):

**Connection:**
```typescript
// lib/db.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 20, // Connection pool size
  idle_timeout: 30,
  connect_timeout: 10,
});
```

**Database Kullanan Endpoint'ler:**

1. **User Management:**
   - `/api/user/plan` → Database'den user plan bilgisi çekiyor
   - `/api/auth/me` → Database'den user bilgisi çekiyor

2. **Subscription:**
   - `/api/subscription/start-trial` → Database'e trial kaydı yapıyor
   - `/api/subscription/verify-purchase` → Database'e subscription kaydı yapıyor
   - `/api/subscription/webhook` → Database'e subscription güncellemesi yapıyor

3. **Notifications:**
   - `/api/notifications` → Database'den bildirimleri çekiyor
   - `/api/admin/broadcast` → Database'e bildirim kaydediyor

4. **Blog & News:**
   - `/api/blog` → Database'den blog yazılarını çekiyor
   - `/api/news` → Database'den haberleri çekiyor

**Database Bağlantı Akışı:**
```
Frontend (Vercel) 
  → DATABASE_URL environment variable
  → Railway PostgreSQL (Public URL)
  → Connection Pool (20 connections)
  → SQL Queries
```

#### 2.1.3. Subdomain Bağımlılığı

Frontend, subdomain'ler için **redirect** yapıyor:

**Middleware (`middleware.ts`):**
```typescript
// data.alertachart.com → /data/liquidation-tracker
if (hostname.includes('data.alertachart.com')) {
  url.pathname = '/data/liquidation-tracker';
  return NextResponse.rewrite(url);
}

// aggr.alertachart.com → /aggr
if (hostname.includes('aggr.alertachart.com')) {
  url.pathname = '/aggr';
  return NextResponse.rewrite(url);
}
```

**Auth Service (`services/authService.ts`):**
```typescript
// Subdomain'ler için absolute URL kullanıyor
if (isSubdomain) {
  apiUrl = `https://alertachart.com/api/auth/me`;
}
```

#### 2.1.4. Historical Data Bağımlılığı

Frontend, historical data için **Railway Backend** kullanıyor:

**Historical Service (`services/historicalService.ts`):**
```typescript
// Railway backend URL
private railwayApi = process.env.NEXT_PUBLIC_RAILWAY_API || 
                     'http://localhost:4000';

// Railway backend kullan
const url = `${this.railwayApi}/api/historical/${exchange}/${pair}/${timeframe}?from=${from}&to=${to}&limit=5000`;

// Fallback: Next.js API (Binance API'ye direkt)
const fallbackUrl = `/api/historical/${from}/${to}/${timeframe}/${markets}`;
```

**Akış:**
```
Chart Component
  → Historical Service
  → Railway Backend (primary)
  → Fallback: Next.js API (Binance API)
```

---

## 3. BACKEND ÇALIŞMA BAĞIMLILIĞI VE SİSTEM MANTIĞI

### 3.1. Backend Bağımlılıkları

**Platform:** Express.js (Railway - $5-20/ay)
**Domain:** `alertachart-backend-production.up.railway.app`
**Proje:** `alertachart-backend`

#### 3.1.1. Database Bağımlılığı

Backend, **Railway PostgreSQL**'e bağlanıyor:

**Connection (`src/lib/push/db.js`):**
```javascript
import postgres from 'postgres';

let sql = null;

function getSql() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }
  return sql;
}
```

**Database Kullanan Servisler:**

1. **Auth Service (`src/lib/auth/db.js`):**
   - User authentication
   - Session management
   - Token validation

2. **Push Service (`src/lib/push/db.js`):**
   - Device registration
   - Push token management
   - Price alerts
   - Alarm subscriptions

3. **Admin Service:**
   - Broadcast notifications
   - User management

#### 3.1.2. Frontend Bağımlılığı

Backend, frontend'den gelen **proxy request'leri** handle ediyor:

**Request Flow:**
```
Frontend (Vercel)
  → /api/auth/login (Next.js API route)
  → Proxy to Backend
  → Backend: /api/auth/login (Express.js route)
  → Database query
  → Response
  → Frontend
```

**Cookie Forwarding:**
```typescript
// Frontend'den backend'e cookie forwarding
const cookies = request.headers.get('cookie') || '';
const headers = { 'Cookie': cookies };

const response = await fetch(`${backendUrl}/api/auth/login`, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});
```

#### 3.1.3. External API Bağımlılıkları

Backend, external API'lere bağlanıyor:

1. **Binance WebSocket:**
   - Real-time price updates
   - Trade streams
   - Ticker data

2. **Expo Push Notification Service:**
   - Push notification gönderimi
   - Token validation

3. **Apple/Google IAP Verification:**
   - Apple Receipt API
   - Google Play Developer API

### 3.2. Backend Sistem Mantığı

#### 3.2.1. Auth Sistemi

**Flow:**
```
1. User Login
   → Frontend: /api/auth/login
   → Backend: /api/auth/login
   → Database: User validation
   → JWT token generation
   → Cookie set (httpOnly)
   → Response

2. Session Check
   → Frontend: /api/auth/me
   → Backend: /api/auth/me
   → Cookie validation
   → Database: User lookup
   → Response

3. Session Restore (Subdomain)
   → Subdomain: /api/auth/restore-session
   → Frontend: /api/auth/restore-session
   → Backend: /api/auth/restore-session
   → Cookie validation
   → Database: User lookup
   → Response
```

#### 3.2.2. Push Notification Sistemi

**Flow:**
```
1. Device Registration
   → Mobile App: Register device
   → Backend: /api/push/register
   → Database: devices table'a kaydet
   → Response

2. Price Alert Creation
   → Frontend: Create alert
   → Backend: /api/alerts/price
   → Database: price_alerts table'a kaydet
   → WebSocket: Symbol'e subscribe et
   → Response

3. Price Alert Trigger
   → WebSocket: Price update
   → Backend: checkCustomAlerts()
   → Database: price_alerts table'dan çek
   → Condition check (target_price ± proximity_delta)
   → Expo Push: Notification gönder
   → Database: last_notified_at update
```

#### 3.2.3. Subscription Sistemi

**Flow:**
```
1. Trial Start
   → Frontend: /api/subscription/start-trial
   → Database: trial_attempts table'a kaydet
   → Database: users table'da plan='premium' yap
   → Response

2. IAP Verification
   → Mobile App: Purchase
   → Frontend: /api/subscription/verify-purchase
   → Apple/Google: Receipt verification
   → Database: users table'da subscription update
   → Response

3. Webhook Handler
   → Apple/Google: Webhook event
   → Backend: /api/subscription/webhook
   → Database: users table'da subscription update
   → Response
```

---

## 4. AGGR VE LIQUIDATION SİSTEMLERİNİN BAĞLANTISI

### 4.1. Data Platform (data.alertachart.com)

**Platform:** Next.js (Railway)
**Proje:** kkterminal-main
**Domain:** `data.alertachart.com`

#### 4.1.1. Ana Sistemle Bağlantısı

**Auth Bağlantısı:**
```typescript
// services/authService.ts
// Subdomain'ler için absolute URL kullanıyor
if (hostname === 'data.alertachart.com') {
  apiUrl = `https://alertachart.com/api/auth/me`;
}
```

**Cookie Sharing:**
- NextAuth cookies: `domain=.alertachart.com`
- Subdomain'ler arası cookie paylaşımı
- Session restore mekanizması

**Akış:**
```
1. User www.alertachart.com'da login oluyor
   → Cookie: domain=.alertachart.com (tüm subdomain'lerde geçerli)

2. User data.alertachart.com'a gidiyor
   → Auth Service: /api/auth/me çağrısı
   → Cookie otomatik gönderiliyor
   → Session restore
   → User authenticated
```

#### 4.1.2. Historical Data Bağlantısı

**Backend API:**
```typescript
// Historical data için Railway backend kullanıyor
const backendUrl = 'https://alertachart-backend-production.up.railway.app';
const url = `${backendUrl}/api/historical/${exchange}/${pair}/${timeframe}?from=${from}&to=${to}`;
```

**Akış:**
```
Data Platform
  → Historical Data Request
  → Railway Backend
  → Binance API
  → Response
  → Data Platform
```

#### 4.1.3. Database Bağlantısı

**Not:** Data platform **kendi database'ini kullanıyor** (ayrı Railway PostgreSQL instance)

**Bağımsız Tablolar:**
- Liquidation data
- Whale alerts
- Market statistics

**Paylaşılan:**
- Auth (ana sistemle aynı database - Railway PostgreSQL)
- User sessions

### 4.2. Aggr Platform (aggr.alertachart.com)

**Platform:** Vue.js + Vite (Railway)
**Proje:** kkaggr-main
**Domain:** `aggr.alertachart.com`

#### 4.2.1. Ana Sistemle Bağlantısı

**Auth Bağlantısı:**
```typescript
// services/authService.ts
// Subdomain'ler için absolute URL kullanıyor
if (hostname === 'aggr.alertachart.com') {
  apiUrl = `https://alertachart.com/api/auth/me`;
}
```

**Cookie Sharing:**
- NextAuth cookies: `domain=.alertachart.com`
- Subdomain'ler arası cookie paylaşımı
- Session restore mekanizması

**Akış:**
```
1. User www.alertachart.com'da login oluyor
   → Cookie: domain=.alertachart.com

2. User aggr.alertachart.com'a gidiyor
   → Auth Service: /api/auth/me çağrısı
   → Cookie otomatik gönderiliyor
   → Session restore
   → User authenticated
```

#### 4.2.2. Historical Data Bağlantısı

**Backend API:**
```typescript
// Historical data için Railway backend kullanıyor
const backendUrl = 'https://alertachart-backend-production.up.railway.app';
const url = `${backendUrl}/api/historical/${exchange}/${pair}/${timeframe}?from=${from}&to=${to}`;
```

**Akış:**
```
Aggr Platform
  → Historical Data Request
  → Railway Backend
  → Binance API
  → Response
  → Aggr Platform
```

#### 4.2.3. Real-time Data Bağlantısı

**WebSocket:**
```typescript
// Aggr platform kendi WebSocket bağlantılarını yönetiyor
// Client-side WebSocket connections
const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@trade');
```

**Bağımsız:**
- Aggr platform **kendi WebSocket bağlantılarını** yönetiyor
- Backend'e bağımlı değil (client-side)

#### 4.2.4. Database Bağlantısı

**Not:** Aggr platform **database kullanmıyor** (client-side only)

**Sadece Auth:**
- Auth için ana sistemle aynı database'i kullanıyor
- User sessions

---

## 5. DATABASE MİMARİSİ VE BAĞIMLILIĞI

### 5.1. Database Yapısı

**Platform:** Railway PostgreSQL
**Connection:** `DATABASE_URL` environment variable

### 5.2. Tablo Yapısı ve Bağımlılıklar

#### 5.2.1. Core Tables (Ana Tablolar)

**1. users (Ana Kullanıcı Tablosu)**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  provider VARCHAR(20), -- 'apple' | 'google' | 'email'
  provider_user_id VARCHAR(255),
  plan VARCHAR(20) DEFAULT 'free', -- 'free' | 'premium'
  expiry_date TIMESTAMP,
  subscription_platform VARCHAR(20), -- 'ios' | 'android' | 'web'
  subscription_id VARCHAR(255),
  trial_started_at TIMESTAMP,
  trial_ended_at TIMESTAMP,
  subscription_started_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);
```

**Bağımlılıklar:**
- ❌ Bağımlılık yok (root table)
- ✅ Diğer tablolar bu tabloya bağlı

**Kullanan Tablolar:**
- `user_sessions` → `user_id` (FOREIGN KEY)
- `devices` → `user_id` (FOREIGN KEY)
- `price_alerts` → `user_id` (FOREIGN KEY)
- `alarm_subscriptions` → `user_id` (FOREIGN KEY)
- `alarms` → `user_id` (FOREIGN KEY)
- `trial_attempts` → `user_id` (FOREIGN KEY)
- `notifications` → `user_id` (FOREIGN KEY)
- `support_requests` → `user_id` (FOREIGN KEY)

---

**2. devices (Cihaz Tablosu)**
```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  expo_push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `users` tablosuna bağlı (`user_id`)

**Kullanan Tablolar:**
- `price_alerts` → `device_id` (FOREIGN KEY)
- `alarm_subscriptions` → `device_id` (FOREIGN KEY)

---

**3. user_sessions (Session Tablosu)**
```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `users` tablosuna bağlı (`user_id`)

---

#### 5.2.2. Premium & Trial Tables

**4. trial_attempts (Trial Denemeleri)**
```sql
CREATE TABLE trial_attempts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  platform VARCHAR(20),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  converted_to_premium BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `users` tablosuna bağlı (`user_id`)
- ⚠️ `device_id` UNIQUE constraint (fraud prevention)

**Kullanım:**
- Trial başlatma kontrolü
- Fraud prevention (device_id, email, IP check)

---

#### 5.2.3. Push Notification Tables

**5. price_alerts (Fiyat Alarmları)**
```sql
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  user_id INTEGER,
  symbol VARCHAR(50) NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  proximity_delta DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `devices` tablosuna bağlı (`device_id`)
- ✅ `users` tablosuna bağlı (`user_id`)

**Kullanım:**
- Backend: Price proximity service
- WebSocket: Real-time price monitoring
- Push: Notification gönderimi

---

**6. alarm_subscriptions (Alarm Abonelikleri)**
```sql
CREATE TABLE alarm_subscriptions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  user_id INTEGER,
  alarm_key VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(device_id, alarm_key),
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `devices` tablosuna bağlı (`device_id`)
- ✅ `users` tablosuna bağlı (`user_id`)

---

**7. alarms (Frontend Alarmları)**
```sql
CREATE TABLE alarms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  alarm_key VARCHAR(255) NOT NULL,
  exchange VARCHAR(50) NOT NULL,
  pair VARCHAR(50) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  is_triggered BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, alarm_key)
);
```

**Bağımlılıklar:**
- ✅ `users` tablosuna bağlı (`user_id`)

---

#### 5.2.4. Content Tables

**8. blog_posts (Blog Yazıları)**
```sql
CREATE TABLE blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image VARCHAR(500),
  category VARCHAR(100),
  author VARCHAR(255),
  author_image VARCHAR(500),
  read_time INTEGER,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Bağımlılıklar:**
- ❌ Bağımlılık yok (standalone)

---

**9. news (Haberler)**
```sql
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category VARCHAR(50),
  source VARCHAR(255),
  author VARCHAR(255),
  url VARCHAR(500),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Bağımlılıklar:**
- ❌ Bağımlılık yok (standalone)

---

**10. notifications (Bildirimler)**
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Bağımlılıklar:**
- ✅ `users` tablosuna bağlı (`user_id`)

---

**11. support_requests (Destek Talepleri)**
```sql
CREATE TABLE support_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(255),
  topic VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Bağımlılıklar:**
- ⚠️ `user_id` optional (guest requests için)

---

### 5.3. Foreign Key Bağımlılıkları

**Bağımlılık Ağacı:**
```
users (root)
  ├── user_sessions
  ├── devices
  │   ├── price_alerts
  │   └── alarm_subscriptions
  ├── alarms
  ├── trial_attempts
  ├── notifications
  └── support_requests (optional)

blog_posts (standalone)
news (standalone)
```

**Önemli Notlar:**
1. **users** tablosu root table (diğer tüm tablolar buna bağlı)
2. **devices** tablosu `users`'a bağlı, ama `price_alerts` ve `alarm_subscriptions` hem `devices` hem `users`'a bağlı
3. **trial_attempts** sadece `users`'a bağlı (device_id UNIQUE constraint var ama FK yok)
4. **blog_posts** ve **news** bağımsız (content tables)

### 5.4. Database Connection Pooling

**Connection Pool Ayarları:**
```typescript
// lib/db.ts
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 20,              // Maximum 20 connection
  idle_timeout: 30,     // 30 saniye sonra idle connection kapat
  connect_timeout: 10,   // 10 saniye connection timeout
});
```

**Kullanan Servisler:**
- Frontend (Vercel): 20 connection pool
- Backend (Railway): 20 connection pool
- Data Platform: Kendi connection pool'u
- Aggr Platform: Database kullanmıyor

**Toplam Connection:**
- Frontend: 20 connections
- Backend: 20 connections
- **Toplam:** 40 connections (Railway PostgreSQL max_connections: 100)

---

## 6. SİSTEM AKIŞ DİYAGRAMLARI

### 6.1. User Login Akışı

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Frontend (Vercel)   │
│ /api/auth/login     │
└──────┬──────────────┘
       │
       │ Proxy Request
       ▼
┌─────────────────────┐
│ Backend (Railway)   │
│ /api/auth/login     │
└──────┬──────────────┘
       │
       │ Database Query
       ▼
┌─────────────────────┐
│ Database (Railway)  │
│ users table         │
└──────┬──────────────┘
       │
       │ Response
       ▼
┌─────────────────────┐
│ Backend             │
│ JWT Token + Cookie  │
└──────┬──────────────┘
       │
       │ Response
       ▼
┌─────────────────────┐
│ Frontend            │
│ Cookie Set          │
│ User Authenticated  │
└─────────────────────┘
```

### 6.2. Historical Data Akışı

```
┌─────────────┐
│   Chart     │
└──────┬──────┘
       │
       │ Historical Service
       ▼
┌─────────────────────┐
│ Frontend (Vercel)   │
│ Historical Service  │
└──────┬──────────────┘
       │
       │ Request (Railway Backend)
       ▼
┌─────────────────────┐
│ Backend (Railway)   │
│ /api/historical     │
└──────┬──────────────┘
       │
       │ Binance API
       ▼
┌─────────────────────┐
│ Binance API         │
│ Historical Data     │
└──────┬──────────────┘
       │
       │ Response
       ▼
┌─────────────────────┐
│ Backend             │
│ Data Processing     │
└──────┬──────────────┘
       │
       │ Response
       ▼
┌─────────────────────┐
│ Frontend            │
│ Chart Update        │
└─────────────────────┘
```

### 6.3. Push Notification Akışı

```
┌─────────────┐
│   Backend   │
│ WebSocket   │
└──────┬──────┘
       │
       │ Price Update
       ▼
┌─────────────────────┐
│ Backend             │
│ checkCustomAlerts() │
└──────┬──────────────┘
       │
       │ Database Query
       ▼
┌─────────────────────┐
│ Database (Railway)  │
│ price_alerts table  │
└──────┬──────────────┘
       │
       │ Alert Data
       ▼
┌─────────────────────┐
│ Backend             │
│ Condition Check     │
│ (target_price ± delta)
└──────┬──────────────┘
       │
       │ Trigger
       ▼
┌─────────────────────┐
│ Backend             │
│ Expo Push Service   │
└──────┬──────────────┘
       │
       │ Push Notification
       ▼
┌─────────────────────┐
│ Mobile Device       │
│ Notification        │
└─────────────────────┘
```

### 6.4. Subdomain Auth Akışı

```
┌─────────────────────┐
│ www.alertachart.com │
│ User Login          │
└──────┬──────────────┘
       │
       │ Cookie: domain=.alertachart.com
       ▼
┌─────────────────────┐
│ Cookie Set          │
│ (Tüm subdomain'lerde geçerli)
└──────┬──────────────┘
       │
       │ User visits subdomain
       ▼
┌─────────────────────┐
│ data.alertachart.com│
│ Auth Check          │
└──────┬──────────────┘
       │
       │ /api/auth/me (absolute URL)
       ▼
┌─────────────────────┐
│ www.alertachart.com │
│ /api/auth/me        │
└──────┬──────────────┘
       │
       │ Cookie Validation
       ▼
┌─────────────────────┐
│ Database (Railway)  │
│ users table         │
└──────┬──────────────┘
       │
       │ User Data
       ▼
┌─────────────────────┐
│ data.alertachart.com│
│ User Authenticated  │
└─────────────────────┘
```

---

## 7. ÖZET VE BAĞIMLILIK HARİTASI

### 7.1. Frontend Bağımlılıkları

```
Frontend (Vercel)
  ├── Backend (Railway) [Proxy]
  │   ├── Auth endpoints
  │   ├── Push endpoints
  │   ├── Ticker data
  │   └── Historical data
  │
  ├── Database (Railway PostgreSQL) [Direct]
  │   ├── User management
  │   ├── Subscription
  │   ├── Notifications
  │   ├── Blog & News
  │   └── Support requests
  │
  └── Subdomains
      ├── data.alertachart.com (Auth sharing)
      └── aggr.alertachart.com (Auth sharing)
```

### 7.2. Backend Bağımlılıkları

```
Backend (Railway)
  ├── Database (Railway PostgreSQL) [Direct]
  │   ├── Auth data
  │   ├── Push data
  │   ├── Price alerts
  │   └── Alarm subscriptions
  │
  ├── External APIs
  │   ├── Binance WebSocket
  │   ├── Expo Push Service
  │   ├── Apple Receipt API
  │   └── Google Play API
  │
  └── Frontend (Vercel) [Proxy requests]
      └── API proxy endpoints
```

### 7.3. Data Platform Bağımlılıkları

```
Data Platform (Railway)
  ├── Auth (Ana Sistem)
  │   ├── Cookie sharing (.alertachart.com)
  │   └── Database (Railway PostgreSQL)
  │
  ├── Historical Data
  │   └── Backend (Railway)
  │
  └── Own Database (Optional)
      └── Liquidation data
```

### 7.4. Aggr Platform Bağımlılıkları

```
Aggr Platform (Railway)
  ├── Auth (Ana Sistem)
  │   ├── Cookie sharing (.alertachart.com)
  │   └── Database (Railway PostgreSQL)
  │
  ├── Historical Data
  │   └── Backend (Railway)
  │
  └── Real-time Data
      └── Client-side WebSocket (Bağımsız)
```

### 7.5. Database Bağımlılıkları

```
Database (Railway PostgreSQL)
  ├── Frontend (Vercel)
  │   ├── Direct connection (20 connections)
  │   └── User, Subscription, Notifications
  │
  ├── Backend (Railway)
  │   ├── Direct connection (20 connections)
  │   └── Auth, Push, Alerts
  │
  └── Data Platform (Optional)
      └── Auth only (shared)
```

---

## 8. KRİTİK BAĞIMLILIKLAR

### 8.1. Frontend → Backend

**Bağımlılık:** Yüksek
**Neden:** Auth, push, ticker, historical data için backend gerekli
**Fallback:** Historical data için Next.js API fallback var

### 8.2. Frontend → Database

**Bağımlılık:** Yüksek
**Neden:** User management, subscription, notifications için database gerekli
**Fallback:** Yok

### 8.3. Backend → Database

**Bağımlılık:** Yüksek
**Neden:** Tüm backend servisleri database'e bağlı
**Fallback:** Yok

### 8.4. Subdomains → Auth

**Bağımlılık:** Orta
**Neden:** Auth için ana sistemle cookie sharing
**Fallback:** Session restore mekanizması var

### 8.5. Backend → External APIs

**Bağımlılık:** Orta
**Neden:** Binance WebSocket, Expo Push, Apple/Google IAP
**Fallback:** Bazı servisler için fallback var

---

## 9. SİSTEM ÇALIŞMA MANTIĞI

### 9.1. Request Flow (Genel)

```
User Request
  → Frontend (Vercel)
  → Next.js API Route
  → Backend Proxy (Railway) veya Direct Database
  → Response
  → Frontend
  → User
```

### 9.2. Auth Flow

```
Login Request
  → Frontend: /api/auth/login
  → Backend: /api/auth/login
  → Database: User validation
  → JWT + Cookie
  → Frontend: Cookie set
  → User: Authenticated
```

### 9.3. Data Flow

```
Chart Data Request
  → Frontend: Historical Service
  → Backend: /api/historical
  → Binance API
  → Backend: Data processing
  → Frontend: Chart update
```

### 9.4. Notification Flow

```
Price Alert Trigger
  → Backend: WebSocket price update
  → Backend: checkCustomAlerts()
  → Database: price_alerts query
  → Backend: Condition check
  → Expo Push: Notification
  → Mobile Device: Notification received
```

---

## 10. SONUÇ

### 10.1. Sistem Bağımlılıkları Özeti

| Servis | Backend | Database | External APIs | Subdomains |
|--------|---------|----------|---------------|------------|
| Frontend | ✅ Proxy | ✅ Direct | ❌ | ✅ Auth sharing |
| Backend | ❌ | ✅ Direct | ✅ | ❌ |
| Data Platform | ✅ Historical | ✅ Auth only | ❌ | ✅ Auth sharing |
| Aggr Platform | ✅ Historical | ✅ Auth only | ✅ WebSocket | ✅ Auth sharing |

### 10.2. Kritik Bağımlılıklar

1. **Frontend → Backend:** Yüksek (Auth, Push, Ticker)
2. **Frontend → Database:** Yüksek (User, Subscription, Notifications)
3. **Backend → Database:** Yüksek (Tüm servisler)
4. **Subdomains → Auth:** Orta (Cookie sharing)

### 10.3. Bağımsız Servisler

1. **Aggr Platform Real-time:** Client-side WebSocket (bağımsız)
2. **Data Platform Content:** Kendi database'i (opsiyonel)
3. **Blog & News:** Standalone tables (bağımsız)

---

**Not:** Bu dokümantasyon sistem mimarisini ve bağımlılıklarını anlatır. Güncellemeler için bu dosyayı referans al.

